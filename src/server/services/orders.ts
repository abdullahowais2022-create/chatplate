import "server-only";
import type { ActorType, OrderStatus, Prisma } from "@prisma/client";
import { db } from "../db";
import { audit } from "../audit";
import { bumpLive } from "../live";
import { notify } from "./notifications";
import { sendToCustomer } from "./messaging";
import type { DraftOrder } from "../ai/types";
import { emptyDraft } from "../ai/types";
import { computeTotals } from "../ai/summary";
import { EDITABLE_STATUSES, num, valueToPayment } from "./serialize";
import { t } from "../ai/i18n";
import { formatMoney } from "../ai/money";
import { badRequest, conflict, notFound } from "../http";

export type Actor = { type: ActorType; userId?: string | null };

/** Allowed one-click transitions (cancellation handled separately). */
export const NEXT_STATUSES: Record<OrderStatus, OrderStatus[]> = {
  NEW: ["CONFIRMED", "PREPARING"],
  CONFIRMED: ["PREPARING"],
  PREPARING: ["READY"],
  READY: ["OUT_FOR_DELIVERY", "COMPLETED"],
  OUT_FOR_DELIVERY: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
};

function itemsCreate(draft: DraftOrder): Prisma.OrderItemCreateWithoutOrderInput[] {
  return draft.items
    .filter((l) => !l.pending)
    .map((l) => ({
      menuItem: l.menuItemId ? { connect: { id: l.menuItemId } } : undefined,
      variantId: l.variantId,
      name: l.name,
      variantName: l.variantName,
      addons: l.addonIds.map((id, i) => ({ id, name: l.addonNames[i] ?? "" })),
      removals: l.removals,
      notes: l.notes,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      lineTotal: l.lineTotal,
    }));
}

function orderFields(draft: DraftOrder) {
  const totals = computeTotals(draft);
  return {
    type: draft.orderType === "delivery" ? ("DELIVERY" as const) : ("PICKUP" as const),
    subtotal: totals.subtotal,
    deliveryFee: totals.deliveryFee,
    total: totals.total,
    customerName: draft.customerName,
    deliveryAddress: draft.orderType === "delivery" ? draft.deliveryAddress : null,
    deliveryLat: draft.orderType === "delivery" ? (draft.location?.lat ?? null) : null,
    deliveryLng: draft.orderType === "delivery" ? (draft.location?.lng ?? null) : null,
    deliveryZoneId: draft.orderType === "delivery" ? draft.zoneId : null,
    scheduledFor: draft.scheduledTime ? new Date(draft.scheduledTime) : null,
    paymentPreference: valueToPayment(draft.paymentPreference),
    notes: draft.notes,
  };
}

export async function createOrderFromDraft(opts: { conversationId: string; draft: DraftOrder; language: string; actor: Actor }) {
  if (!opts.draft.items.some((l) => !l.pending)) throw badRequest("Order has no items");
  const conv = await db.conversation.findUniqueOrThrow({ where: { id: opts.conversationId } });
  const order = await db.$transaction(async (tx) => {
    const r = await tx.restaurant.update({ where: { id: conv.restaurantId }, data: { orderSeq: { increment: 1 } }, select: { orderSeq: true, currency: true } });
    const fields = orderFields(opts.draft);
    const created = await tx.order.create({
      data: {
        restaurantId: conv.restaurantId,
        number: r.orderSeq,
        customerId: conv.customerId,
        conversationId: conv.id,
        currency: r.currency,
        language: opts.language,
        confirmedAt: new Date(),
        ...fields,
        items: { create: itemsCreate(opts.draft) },
        events: { create: { type: "CREATED", toStatus: "NEW", actorType: opts.actor.type, actorUserId: opts.actor.userId ?? null, message: "Order placed via WhatsApp" } },
      },
      include: { items: true },
    });
    await tx.customer.update({
      where: { id: conv.customerId },
      data: {
        orderCount: { increment: 1 },
        totalSpent: { increment: fields.total },
        lastOrderAt: new Date(),
        ...(opts.draft.customerName ? { name: opts.draft.customerName } : {}),
        ...(opts.draft.orderType === "delivery" && (opts.draft.deliveryAddress || opts.draft.location)
          ? { savedAddress: opts.draft.deliveryAddress, savedLat: opts.draft.location?.lat ?? null, savedLng: opts.draft.location?.lng ?? null }
          : {}),
      },
    });
    await tx.conversation.update({ where: { id: conv.id }, data: { state: "IDLE", draft: emptyDraft() as unknown as Prisma.InputJsonValue, editingOrderId: null, clarificationAttempts: 0 } });
    return created;
  });
  await audit({ restaurantId: conv.restaurantId, actorType: opts.actor.type, actorUserId: opts.actor.userId, action: "order.created", entityType: "Order", entityId: order.id, after: { number: order.number, total: num(order.total), items: order.items.length } });
  await notify({
    restaurantId: conv.restaurantId,
    type: "NEW_ORDER",
    title: `New order #${order.number}`,
    body: `${order.items.map((i) => `${i.quantity}× ${i.name}${i.variantName ? ` (${i.variantName})` : ""}`).join(", ")} · ${formatMoney(num(order.total), order.currency)} · ${order.type === "DELIVERY" ? "Delivery" : "Pickup"}`,
    link: `/dashboard/orders/${order.id}`,
  });
  return order;
}

export async function updateOrderFromDraft(opts: { orderId: string; conversationId: string; draft: DraftOrder; actor: Actor }) {
  const before = await db.order.findUniqueOrThrow({ where: { id: opts.orderId }, include: { items: true } });
  const fields = orderFields(opts.draft);
  const order = await db.$transaction(async (tx) => {
    // Status check inside the write so a kitchen status change can't race the customer's edit.
    const res = await tx.order.updateMany({ where: { id: opts.orderId, status: { in: EDITABLE_STATUSES } }, data: fields });
    if (res.count === 0) throw conflict("This order can no longer be changed");
    await tx.orderItem.deleteMany({ where: { orderId: opts.orderId } });
    await tx.order.update({
      where: { id: opts.orderId },
      data: {
        items: { create: itemsCreate(opts.draft) },
        events: { create: { type: "MODIFIED", actorType: opts.actor.type, actorUserId: opts.actor.userId ?? null, message: "Customer changed the order via WhatsApp" } },
      },
    });
    await tx.customer.update({ where: { id: before.customerId }, data: { totalSpent: { increment: fields.total - num(before.total) } } });
    await tx.conversation.update({ where: { id: opts.conversationId }, data: { state: "IDLE", draft: emptyDraft() as unknown as Prisma.InputJsonValue, editingOrderId: null, clarificationAttempts: 0 } });
    return tx.order.findUniqueOrThrow({ where: { id: opts.orderId }, include: { items: true } });
  });
  await audit({
    restaurantId: order.restaurantId,
    actorType: opts.actor.type,
    actorUserId: opts.actor.userId,
    action: "order.modified",
    entityType: "Order",
    entityId: order.id,
    before: { total: num(before.total), items: before.items.map((i) => `${i.quantity}× ${i.name}`) },
    after: { total: num(order.total), items: order.items.map((i) => `${i.quantity}× ${i.name}`) },
  });
  await notify({ restaurantId: order.restaurantId, type: "ORDER_UPDATED", title: `Order #${order.number} was changed by the customer`, body: `New total ${formatMoney(num(order.total), order.currency)}`, link: `/dashboard/orders/${order.id}` });
  return order;
}

export async function cancelOrder(opts: { restaurantId: string; orderId: string; actor: Actor; reason?: string; notifyCustomer?: boolean; ip?: string }) {
  const order = await db.order.findFirst({ where: { id: opts.orderId, restaurantId: opts.restaurantId, deletedAt: null } });
  if (!order) throw notFound("Order not found");
  if (order.status === "CANCELLED") return order;
  if (order.status === "COMPLETED") throw conflict("Completed orders can't be cancelled");
  // Customers may only cancel while the order is editable; staff can cancel any open order.
  const allowed: OrderStatus[] = opts.actor.type === "CUSTOMER" ? EDITABLE_STATUSES : ["NEW", "CONFIRMED", "PREPARING", "READY", "OUT_FOR_DELIVERY"];
  const updated = await db.$transaction(async (tx) => {
    const res = await tx.order.updateMany({
      where: { id: order.id, status: { in: allowed } },
      data: { status: "CANCELLED", cancelledAt: new Date(), cancelReason: opts.reason ?? null },
    });
    if (res.count === 0) throw conflict("This order can no longer be cancelled");
    await tx.orderEvent.create({ data: { orderId: order.id, type: "CANCELLED", fromStatus: order.status, toStatus: "CANCELLED", actorType: opts.actor.type, actorUserId: opts.actor.userId ?? null, message: opts.reason ?? null } });
    await tx.customer.update({ where: { id: order.customerId }, data: { totalSpent: { decrement: num(order.total) } } });
    return tx.order.findUniqueOrThrow({ where: { id: order.id } });
  });
  await audit({ restaurantId: order.restaurantId, actorType: opts.actor.type, actorUserId: opts.actor.userId, action: "order.cancelled", entityType: "Order", entityId: order.id, before: { status: order.status }, after: { status: "CANCELLED", reason: opts.reason }, ip: opts.ip });
  await notify({ restaurantId: order.restaurantId, type: "ORDER_CANCELLED", title: `Order #${order.number} cancelled${opts.actor.type === "CUSTOMER" ? " by the customer" : ""}`, body: opts.reason, link: `/dashboard/orders/${order.id}` });
  if (opts.notifyCustomer && order.conversationId) await notifyCustomerOfStatus(order.id, "CANCELLED");
  return updated;
}

export async function updateOrderStatus(opts: { restaurantId: string; orderId: string; to: OrderStatus; actor: Actor; ip?: string }) {
  if (opts.to === "CANCELLED") return cancelOrder({ restaurantId: opts.restaurantId, orderId: opts.orderId, actor: opts.actor, notifyCustomer: true, reason: "Cancelled by the restaurant", ip: opts.ip });
  const order = await db.order.findFirst({ where: { id: opts.orderId, restaurantId: opts.restaurantId, deletedAt: null } });
  if (!order) throw notFound("Order not found");
  if (order.status === opts.to) return order;
  if (!NEXT_STATUSES[order.status].includes(opts.to)) throw badRequest(`Can't move an order from ${order.status} to ${opts.to}`);
  if (opts.to === "OUT_FOR_DELIVERY" && order.type !== "DELIVERY") throw badRequest("Pickup orders don't go out for delivery");

  const updated = await db.$transaction(async (tx) => {
    const res = await tx.order.updateMany({
      where: { id: order.id, status: order.status },
      data: { status: opts.to, ...(opts.to === "COMPLETED" ? { completedAt: new Date() } : {}) },
    });
    if (res.count === 0) throw conflict("The order was updated by someone else. Refresh and try again.");
    await tx.orderEvent.create({ data: { orderId: order.id, type: "STATUS_CHANGED", fromStatus: order.status, toStatus: opts.to, actorType: opts.actor.type, actorUserId: opts.actor.userId ?? null } });
    return tx.order.findUniqueOrThrow({ where: { id: order.id } });
  });
  await audit({ restaurantId: order.restaurantId, actorType: opts.actor.type, actorUserId: opts.actor.userId, action: "order.status_changed", entityType: "Order", entityId: order.id, before: { status: order.status }, after: { status: opts.to }, ip: opts.ip });
  await bumpLive(order.restaurantId);
  await notifyCustomerOfStatus(order.id, opts.to);
  return updated;
}

/** Sends the customer a localised status update over WhatsApp. */
async function notifyCustomerOfStatus(orderId: string, status: OrderStatus) {
  const order = await db.order.findUnique({ where: { id: orderId }, include: { restaurant: true } });
  if (!order?.conversationId || status === "NEW") return;
  const lang = order.language ?? order.restaurant.defaultLanguage;
  const key =
    status === "READY" ? (order.type === "PICKUP" ? "notify.READY_pickup" : "notify.READY_delivery") : (`notify.${status}` as const);
  const text = t(lang, key as Parameters<typeof t>[1], { number: order.number, restaurant: order.restaurant.name });
  await sendToCustomer({ conversationId: order.conversationId, content: { kind: "text", text }, sender: "SYSTEM", language: lang }).catch((err) =>
    console.error("[orders] status notification failed", err),
  );
}

export async function assignOrder(opts: { restaurantId: string; orderId: string; assigneeId: string | null; actor: Actor }) {
  const order = await db.order.findFirst({ where: { id: opts.orderId, restaurantId: opts.restaurantId, deletedAt: null } });
  if (!order) throw notFound("Order not found");
  let assigneeName = "nobody";
  if (opts.assigneeId) {
    const u = await db.user.findFirst({ where: { id: opts.assigneeId, restaurantId: opts.restaurantId, isActive: true, deletedAt: null } });
    if (!u) throw badRequest("That team member doesn't exist");
    assigneeName = u.name;
  }
  const updated = await db.order.update({
    where: { id: order.id },
    data: {
      assignedToId: opts.assigneeId,
      events: { create: { type: "ASSIGNED", actorType: opts.actor.type, actorUserId: opts.actor.userId ?? null, message: `Assigned to ${assigneeName}` } },
    },
  });
  await audit({ restaurantId: order.restaurantId, actorType: opts.actor.type, actorUserId: opts.actor.userId, action: "order.assigned", entityType: "Order", entityId: order.id, before: { assignedToId: order.assignedToId }, after: { assignedToId: opts.assigneeId } });
  await bumpLive(order.restaurantId);
  return updated;
}

export function orderPlacedText(lang: string, number: number, total: number, currency: string, updated = false) {
  return t(lang, updated ? "orderUpdated" : "orderPlaced", { number, total: formatMoney(total, currency, lang) });
}
