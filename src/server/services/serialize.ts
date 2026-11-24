import "server-only";
import type { Prisma, PaymentPreference, OrderStatus } from "@prisma/client";
import type { CartLine, DraftOrder, I18n, MenuSnapshot, OrderSnapshot, PaymentValue, RestaurantFacts } from "../ai/types";
import { emptyDraft } from "../ai/types";

export const num = (d: Prisma.Decimal | number | null | undefined) => (d == null ? 0 : Number(d.toString()));
const i18n = (j: Prisma.JsonValue | null | undefined): I18n => (j && typeof j === "object" && !Array.isArray(j) ? (j as I18n) : {});

export const EDITABLE_STATUSES: OrderStatus[] = ["NEW", "CONFIRMED"];

export const paymentToValue = (p: PaymentPreference | null | undefined): PaymentValue | null =>
  p && p !== "UNKNOWN" ? (p.toLowerCase() as PaymentValue) : null;
export const valueToPayment = (v: PaymentValue | null | undefined): PaymentPreference =>
  v && v !== "unknown" ? (v.toUpperCase() as PaymentPreference) : "UNKNOWN";

type RestaurantWithRelations = Prisma.RestaurantGetPayload<{ include: { businessHours: true; deliveryZones: true } }>;

export function toRestaurantFacts(r: RestaurantWithRelations): RestaurantFacts {
  return {
    name: r.name,
    address: r.address,
    phone: r.phone,
    timezone: r.timezone,
    currency: r.currency,
    location: r.latitude != null && r.longitude != null ? { lat: r.latitude, lng: r.longitude } : null,
    defaultLanguage: r.defaultLanguage,
    supportedLanguages: r.supportedLanguages,
    deliveryEnabled: r.deliveryEnabled,
    pickupEnabled: r.pickupEnabled,
    minimumOrderAmount: num(r.minimumOrderAmount),
    pickupInstructions: r.pickupInstructions,
    deliveryInstructions: r.deliveryInstructions,
    prepTimeMinutes: r.prepTimeMinutes,
    businessType: r.businessType,
    allowPreorders: r.allowPreorders,
    acceptedPaymentMethods: r.acceptedPaymentMethods.map((p) => p.toLowerCase() as PaymentValue).filter((p) => p !== "unknown"),
    askPaymentPreference: r.askPaymentPreference,
    paymentNote: r.paymentNote,
    aiTone: r.aiTone,
    aiCustomInstructions: r.aiCustomInstructions,
    greetingMessage: r.greetingMessage,
    autoReplyWhenClosed: r.autoReplyWhenClosed,
    closedMessage: r.closedMessage,
    handoffOnComplaint: r.handoffOnComplaint,
    handoffConfidenceThreshold: r.handoffConfidenceThreshold,
    handoffKeywords: r.handoffKeywords,
    maxClarifications: r.maxClarifications,
    hours: r.businessHours.map((h) => ({ dayOfWeek: h.dayOfWeek, openTime: h.openTime, closeTime: h.closeTime, isClosed: h.isClosed })),
    zones: r.deliveryZones
      .filter((z) => z.isActive)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((z) => ({ id: z.id, name: z.name, type: z.type, radiusKm: z.radiusKm, areas: z.areas, fee: num(z.fee), minimumOrder: z.minimumOrder == null ? null : num(z.minimumOrder), estimatedMinutes: z.estimatedMinutes })),
  };
}

type CategoryWithItems = Prisma.MenuCategoryGetPayload<{ include: { items: { include: { variants: true; addons: true } } } }>;

export function toMenuSnapshot(currency: string, categories: CategoryWithItems[]): MenuSnapshot {
  const active = categories.filter((c) => c.isActive && !c.deletedAt).sort((a, b) => a.sortOrder - b.sortOrder);
  return {
    currency,
    categories: active.map((c) => ({ id: c.id, name: c.name, nameI18n: i18n(c.nameI18n) })),
    items: active.flatMap((c) =>
      c.items
        .filter((i) => !i.deletedAt)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((i) => ({
          id: i.id,
          categoryId: c.id,
          categoryName: c.name,
          name: i.name,
          nameI18n: i18n(i.nameI18n),
          description: i.description,
          price: num(i.price),
          isAvailable: i.isAvailable,
          isSoldOut: i.isSoldOut,
          dietaryTags: i.dietaryTags,
          aliases: i.aliases,
          variants: i.variants.sort((a, b) => a.sortOrder - b.sortOrder).map((v) => ({ id: v.id, name: v.name, nameI18n: i18n(v.nameI18n), price: num(v.price), isDefault: v.isDefault, isAvailable: v.isAvailable })),
          addons: i.addons.sort((a, b) => a.sortOrder - b.sortOrder).map((a) => ({ id: a.id, name: a.name, nameI18n: i18n(a.nameI18n), price: num(a.price), isAvailable: a.isAvailable })),
        })),
    ),
  };
}

export function parseDraft(json: Prisma.JsonValue | null | undefined): DraftOrder {
  if (!json || typeof json !== "object" || Array.isArray(json)) return emptyDraft();
  return { ...emptyDraft(), ...(json as unknown as Partial<DraftOrder>) };
}

type OrderWithItems = Prisma.OrderGetPayload<{ include: { items: true } }>;

export function toOrderSnapshot(o: OrderWithItems): OrderSnapshot {
  return {
    id: o.id,
    number: o.number,
    status: o.status,
    editable: EDITABLE_STATUSES.includes(o.status),
    type: o.type === "DELIVERY" ? "delivery" : "pickup",
    items: o.items.map(orderItemToLine),
    total: num(o.total),
    deliveryAddress: o.deliveryAddress,
    location: o.deliveryLat != null && o.deliveryLng != null ? { lat: o.deliveryLat, lng: o.deliveryLng } : null,
    scheduledTime: o.scheduledFor?.toISOString() ?? null,
    customerName: o.customerName,
    paymentPreference: paymentToValue(o.paymentPreference),
    createdAt: o.createdAt.toISOString(),
  };
}

export function orderItemToLine(i: OrderWithItems["items"][number]): CartLine {
  const addons = Array.isArray(i.addons) ? (i.addons as { id: string; name: string }[]) : [];
  return {
    menuItemId: i.menuItemId ?? "",
    variantId: i.variantId,
    addonIds: addons.map((a) => a.id),
    addonNames: addons.map((a) => a.name),
    removals: i.removals,
    notes: i.notes,
    quantity: i.quantity,
    name: i.name,
    variantName: i.variantName,
    unitPrice: num(i.unitPrice),
    lineTotal: num(i.lineTotal),
    pending: null,
  };
}
