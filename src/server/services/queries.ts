import "server-only";
import { embeddedSignupConfig } from "../whatsapp/embedded";
import type { CustomerTag, OrderStatus, Prisma } from "@prisma/client";
import { db } from "../db";
import { decryptOrNull } from "../crypto";
import { notFound } from "../http";
import { num } from "./serialize";
import { withinCustomerWindow } from "./messaging";
import { NEXT_STATUSES } from "./orders";
import { zonedParts, zonedTimeToUtc } from "../ai/hours";

// All read models are scoped by restaurantId and return plain, serialisable DTOs (no secrets).

const phoneOf = (enc: string) => decryptOrNull(enc) ?? "";
export const displayPhone = (p: string) => (/^\d+$/.test(p) ? `+${p}` : p);

// ───────── Conversations ─────────

export async function listConversations(restaurantId: string, opts: { filter?: "all" | "attention" | "unread" | "human"; q?: string; take?: number } = {}) {
  const where: Prisma.ConversationWhereInput = { restaurantId, lastMessageAt: { not: null } };
  if (opts.filter === "attention") where.needsHuman = true;
  if (opts.filter === "unread") where.unreadCount = { gt: 0 };
  if (opts.filter === "human") where.mode = "HUMAN";
  if (opts.q) where.customer = { OR: [{ name: { contains: opts.q, mode: "insensitive" } }, { profileName: { contains: opts.q, mode: "insensitive" } }, { phoneLast4: { contains: opts.q } }] };
  const rows = await db.conversation.findMany({
    where,
    orderBy: { lastMessageAt: "desc" },
    take: opts.take ?? 100,
    include: { customer: true, assignedTo: { select: { id: true, name: true } } },
  });
  return rows.map((c) => ({
    id: c.id,
    customerId: c.customerId,
    customerName: c.customer.name ?? c.customer.profileName ?? null,
    phone: displayPhone(phoneOf(c.customer.phoneEnc)),
    language: c.language ?? c.customer.preferredLanguage,
    mode: c.mode,
    state: c.state,
    needsHuman: c.needsHuman,
    needsHumanReason: c.needsHumanReason,
    unreadCount: c.unreadCount,
    lastMessagePreview: c.lastMessagePreview,
    lastMessageAt: c.lastMessageAt?.toISOString() ?? null,
    assignedTo: c.assignedTo,
    tags: c.customer.tags,
  }));
}
export type ConversationListItem = Awaited<ReturnType<typeof listConversations>>[number];

export async function getConversation(restaurantId: string, id: string) {
  const c = await db.conversation.findFirst({
    where: { id, restaurantId },
    include: {
      customer: true,
      restaurant: { select: { defaultLanguage: true } },
      assignedTo: { select: { id: true, name: true } },
      messages: { orderBy: { createdAt: "asc" }, take: 300, include: { voiceNote: true, staffUser: { select: { name: true } } } },
      orders: { orderBy: { createdAt: "desc" }, take: 5, select: { id: true, number: true, status: true, total: true, createdAt: true } },
    },
  });
  if (!c) throw notFound("Conversation not found");
  return {
    id: c.id,
    mode: c.mode,
    state: c.state,
    language: c.language,
    /** The team's language: customer messages are translated into it, staff replies out of it. */
    staffLanguage: c.restaurant.defaultLanguage,
    needsHuman: c.needsHuman,
    needsHumanReason: c.needsHumanReason,
    aiSuggestion: c.aiSuggestion,
    withinWindow: withinCustomerWindow(c.lastInboundAt) || !/^\d+$/.test(phoneOf(c.customer.phoneEnc)),
    assignedTo: c.assignedTo,
    customer: {
      id: c.customer.id,
      name: c.customer.name ?? c.customer.profileName,
      phone: displayPhone(phoneOf(c.customer.phoneEnc)),
      language: c.customer.preferredLanguage,
      tags: c.customer.tags,
      orderCount: c.customer.orderCount,
      savedAddress: c.customer.savedAddress,
    },
    orders: c.orders.map((o) => ({ ...o, total: num(o.total), createdAt: o.createdAt.toISOString() })),
    messages: c.messages.map((m) => ({
      id: m.id,
      direction: m.direction,
      sender: m.sender,
      type: m.type,
      body: m.body,
      language: m.language,
      translation: m.translation,
      translationLanguage: m.translationLanguage,
      status: m.status,
      error: m.error,
      createdAt: m.createdAt.toISOString(),
      staffName: m.staffUser?.name ?? null,
      buttons: m.payload && typeof m.payload === "object" && "buttons" in m.payload ? ((m.payload as { buttons: { id: string; title: string }[] }).buttons ?? []).map((b) => ({ id: b.id, title: b.title })) : [],
      requestsLocation: Boolean(m.payload && typeof m.payload === "object" && (m.payload as { kind?: string }).kind === "location_request"),
      location:
        m.type === "LOCATION" && m.payload && typeof m.payload === "object" && "location" in m.payload
          ? (m.payload as { location: { latitude: number; longitude: number; name?: string } }).location
          : null,
      voiceNote: m.voiceNote ? { id: m.voiceNote.id, status: m.voiceNote.status, transcript: m.voiceNote.transcript, hasAudio: Boolean(m.voiceNote.storageKey), error: m.voiceNote.error } : null,
      ai: m.aiData && typeof m.aiData === "object" ? (m.aiData as Record<string, unknown>) : null,
    })),
  };
}
export type ConversationDetail = Awaited<ReturnType<typeof getConversation>>;

// ───────── Orders ─────────

export async function listOrders(restaurantId: string, opts: { status?: OrderStatus | "ACTIVE"; q?: string; take?: number; customerId?: string } = {}) {
  const where: Prisma.OrderWhereInput = { restaurantId, deletedAt: null };
  if (opts.status === "ACTIVE") where.status = { in: ["NEW", "CONFIRMED", "PREPARING", "READY", "OUT_FOR_DELIVERY"] };
  else if (opts.status) where.status = opts.status;
  if (opts.customerId) where.customerId = opts.customerId;
  if (opts.q) {
    const n = Number(opts.q.replace("#", ""));
    where.OR = [{ customerName: { contains: opts.q, mode: "insensitive" } }, ...(Number.isInteger(n) && n > 0 ? [{ number: n }] : [])];
  }
  const rows = await db.order.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: opts.take ?? 100,
    include: { items: { select: { quantity: true, name: true, variantName: true } }, customer: { select: { name: true, profileName: true } }, assignedTo: { select: { id: true, name: true } } },
  });
  return rows.map((o) => ({
    id: o.id,
    number: o.number,
    status: o.status,
    type: o.type,
    total: num(o.total),
    currency: o.currency,
    customerName: o.customerName ?? o.customer.name ?? o.customer.profileName,
    itemsSummary: o.items.map((i) => `${i.quantity}× ${i.name}${i.variantName ? ` (${i.variantName})` : ""}`).join(", "),
    scheduledFor: o.scheduledFor?.toISOString() ?? null,
    createdAt: o.createdAt.toISOString(),
    assignedTo: o.assignedTo,
    paymentPreference: o.paymentPreference,
  }));
}
export type OrderListItem = Awaited<ReturnType<typeof listOrders>>[number];

export async function getOrder(restaurantId: string, id: string) {
  const o = await db.order.findFirst({
    where: { id, restaurantId, deletedAt: null },
    include: {
      items: true,
      customer: true,
      assignedTo: { select: { id: true, name: true } },
      deliveryZone: { select: { name: true } },
      events: { orderBy: { createdAt: "asc" } },
      conversation: { select: { id: true } },
      restaurant: { select: { name: true, address: true, phone: true, timezone: true } },
    },
  });
  if (!o) throw notFound("Order not found");
  const actorIds = [...new Set(o.events.map((e) => e.actorUserId).filter(Boolean))] as string[];
  const actors = actorIds.length ? await db.user.findMany({ where: { id: { in: actorIds }, restaurantId }, select: { id: true, name: true } }) : [];
  const messages = o.conversationId
    ? await db.message.findMany({
        where: { conversationId: o.conversationId, createdAt: { gte: new Date(o.createdAt.getTime() - 2 * 3_600_000), lte: new Date(o.createdAt.getTime() + 60_000) } },
        orderBy: { createdAt: "asc" },
        take: 40,
        include: { voiceNote: { select: { transcript: true } } },
      })
    : [];
  return {
    id: o.id,
    number: o.number,
    status: o.status,
    nextStatuses: NEXT_STATUSES[o.status].filter((s) => !(s === "OUT_FOR_DELIVERY" && o.type !== "DELIVERY")),
    type: o.type,
    source: o.source,
    currency: o.currency,
    subtotal: num(o.subtotal),
    deliveryFee: num(o.deliveryFee),
    total: num(o.total),
    customerName: o.customerName ?? o.customer.name ?? o.customer.profileName,
    customer: { id: o.customer.id, phone: displayPhone(phoneOf(o.customer.phoneEnc)), tags: o.customer.tags, orderCount: o.customer.orderCount },
    deliveryAddress: o.deliveryAddress,
    deliveryLocation: o.deliveryLat != null && o.deliveryLng != null ? { lat: o.deliveryLat, lng: o.deliveryLng } : null,
    deliveryZone: o.deliveryZone?.name ?? null,
    scheduledFor: o.scheduledFor?.toISOString() ?? null,
    paymentPreference: o.paymentPreference,
    notes: o.notes,
    language: o.language,
    assignedTo: o.assignedTo,
    conversationId: o.conversation?.id ?? null,
    cancelReason: o.cancelReason,
    createdAt: o.createdAt.toISOString(),
    restaurant: o.restaurant,
    items: o.items.map((i) => ({
      id: i.id,
      name: i.name,
      variantName: i.variantName,
      addons: Array.isArray(i.addons) ? (i.addons as { name: string }[]).map((a) => a.name) : [],
      removals: i.removals,
      notes: i.notes,
      quantity: i.quantity,
      unitPrice: num(i.unitPrice),
      lineTotal: num(i.lineTotal),
    })),
    timeline: o.events.map((e) => ({
      id: e.id,
      type: e.type,
      fromStatus: e.fromStatus,
      toStatus: e.toStatus,
      actorType: e.actorType,
      actorName: actors.find((a) => a.id === e.actorUserId)?.name ?? null,
      message: e.message,
      createdAt: e.createdAt.toISOString(),
    })),
    messages: messages.map((m) => ({ id: m.id, direction: m.direction, sender: m.sender, body: m.voiceNote?.transcript ? `🎤 ${m.voiceNote.transcript}` : m.body, createdAt: m.createdAt.toISOString() })),
  };
}
export type OrderDetail = Awaited<ReturnType<typeof getOrder>>;

// ───────── Menu ─────────

export async function getMenu(restaurantId: string) {
  const cats = await db.menuCategory.findMany({
    where: { restaurantId, deletedAt: null },
    orderBy: { sortOrder: "asc" },
    include: {
      items: {
        where: { deletedAt: null },
        orderBy: { sortOrder: "asc" },
        include: { variants: { orderBy: { sortOrder: "asc" } }, addons: { orderBy: { sortOrder: "asc" } } },
      },
    },
  });
  return cats.map((c) => ({
    id: c.id,
    name: c.name,
    nameI18n: (c.nameI18n ?? {}) as Record<string, string>,
    description: c.description,
    isActive: c.isActive,
    sortOrder: c.sortOrder,
    items: c.items.map((i) => ({
      id: i.id,
      categoryId: i.categoryId,
      name: i.name,
      nameI18n: (i.nameI18n ?? {}) as Record<string, string>,
      description: i.description,
      descriptionI18n: (i.descriptionI18n ?? {}) as Record<string, string>,
      price: num(i.price),
      imageUrl: i.imageUrl,
      isAvailable: i.isAvailable,
      isSoldOut: i.isSoldOut,
      dietaryTags: i.dietaryTags,
      aliases: i.aliases,
      sortOrder: i.sortOrder,
      variants: i.variants.map((v) => ({ id: v.id, name: v.name, nameI18n: (v.nameI18n ?? {}) as Record<string, string>, price: num(v.price), isDefault: v.isDefault, isAvailable: v.isAvailable })),
      addons: i.addons.map((a) => ({ id: a.id, name: a.name, nameI18n: (a.nameI18n ?? {}) as Record<string, string>, price: num(a.price), isAvailable: a.isAvailable })),
    })),
  }));
}
export type MenuCategoryDTO = Awaited<ReturnType<typeof getMenu>>[number];
export type MenuItemDTO = MenuCategoryDTO["items"][number];

// ───────── Settings ─────────

export async function getSettings(restaurantId: string) {
  const r = await db.restaurant.findUniqueOrThrow({
    where: { id: restaurantId },
    include: { businessHours: { orderBy: [{ dayOfWeek: "asc" }, { openTime: "asc" }] }, deliveryZones: { orderBy: { sortOrder: "asc" } } },
  });
  return {
    name: r.name,
    businessType: r.businessType,
    logoUrl: r.logoUrl,
    address: r.address,
    phone: r.phone,
    email: r.email,
    timezone: r.timezone,
    currency: r.currency,
    latitude: r.latitude,
    longitude: r.longitude,
    defaultLanguage: r.defaultLanguage,
    supportedLanguages: r.supportedLanguages,
    deliveryEnabled: r.deliveryEnabled,
    pickupEnabled: r.pickupEnabled,
    minimumOrderAmount: num(r.minimumOrderAmount),
    pickupInstructions: r.pickupInstructions,
    deliveryInstructions: r.deliveryInstructions,
    prepTimeMinutes: r.prepTimeMinutes,
    allowPreorders: r.allowPreorders,
    acceptedPaymentMethods: r.acceptedPaymentMethods,
    askPaymentPreference: r.askPaymentPreference,
    paymentNote: r.paymentNote,
    aiEnabled: r.aiEnabled,
    aiTone: r.aiTone,
    aiCustomInstructions: r.aiCustomInstructions,
    greetingMessage: r.greetingMessage,
    autoReplyWhenClosed: r.autoReplyWhenClosed,
    closedMessage: r.closedMessage,
    handoffOnComplaint: r.handoffOnComplaint,
    handoffConfidenceThreshold: r.handoffConfidenceThreshold,
    handoffKeywords: r.handoffKeywords,
    maxClarifications: r.maxClarifications,
    notifyEmail: r.notifyEmail,
    notifyEmailAddresses: r.notifyEmailAddresses,
    notifyWhatsApp: r.notifyWhatsApp,
    notifyWhatsAppNumber: decryptOrNull(r.notifyWhatsAppNumberEnc),
    notifyOnNewOrder: r.notifyOnNewOrder,
    notifyOnNeedsHuman: r.notifyOnNeedsHuman,
    notifyOnComplaint: r.notifyOnComplaint,
    hours: r.businessHours.map((h) => ({ dayOfWeek: h.dayOfWeek, openTime: h.openTime, closeTime: h.closeTime, isClosed: h.isClosed })),
    zones: r.deliveryZones.map((z) => ({
      id: z.id, name: z.name, type: z.type, radiusKm: z.radiusKm, areas: z.areas, fee: num(z.fee),
      minimumOrder: z.minimumOrder == null ? null : num(z.minimumOrder), estimatedMinutes: z.estimatedMinutes, isActive: z.isActive,
    })),
    onboardingStep: r.onboardingStep,
    onboardingCompleted: Boolean(r.onboardingCompletedAt),
  };
}
export type SettingsDTO = Awaited<ReturnType<typeof getSettings>>;

export async function getWhatsAppStatus(restaurantId: string, appUrl: string) {
  const acc = await db.whatsAppAccount.findUnique({ where: { restaurantId } });
  if (!acc) return null;
  return {
    status: acc.status,
    wabaId: acc.wabaId,
    phoneNumberId: acc.phoneNumberId,
    displayPhoneNumber: acc.displayPhoneNumber,
    hasAccessToken: Boolean(acc.accessTokenEnc),
    hasAppSecret: Boolean(acc.appSecretEnc),
    verifyToken: acc.verifyToken,
    webhookUrl: `${appUrl.replace(/\/$/, "")}/api/webhooks/whatsapp/${acc.webhookKey}`,
    webhookVerifiedAt: acc.webhookVerifiedAt?.toISOString() ?? null,
    lastWebhookAt: acc.lastWebhookAt?.toISOString() ?? null,
    lastTestAt: acc.lastTestAt?.toISOString() ?? null,
    lastError: acc.lastError,
    connectionMethod: acc.connectionMethod,
    /** Settings for the one-click "Connect WhatsApp" button, or null when the platform hasn't enabled it. */
    embeddedSignup: embeddedSignupConfig(),
  };
}
export type WhatsAppStatusDTO = NonNullable<Awaited<ReturnType<typeof getWhatsAppStatus>>>;

// ───────── Customers ─────────

export async function listCustomers(restaurantId: string, opts: { q?: string; tag?: CustomerTag } = {}) {
  const where: Prisma.CustomerWhereInput = { restaurantId, deletedAt: null };
  if (opts.tag) where.tags = { has: opts.tag };
  if (opts.q) where.OR = [{ name: { contains: opts.q, mode: "insensitive" } }, { profileName: { contains: opts.q, mode: "insensitive" } }, { phoneLast4: { contains: opts.q } }];
  const rows = await db.customer.findMany({ where, orderBy: { lastMessageAt: { sort: "desc", nulls: "last" } }, take: 200 });
  return rows.map((c) => ({
    id: c.id,
    name: c.name ?? c.profileName,
    phone: displayPhone(phoneOf(c.phoneEnc)),
    preferredLanguage: c.preferredLanguage,
    tags: c.tags,
    orderCount: c.orderCount,
    totalSpent: num(c.totalSpent),
    lastOrderAt: c.lastOrderAt?.toISOString() ?? null,
    lastMessageAt: c.lastMessageAt?.toISOString() ?? null,
  }));
}

export async function getCustomer(restaurantId: string, id: string) {
  const c = await db.customer.findFirst({ where: { id, restaurantId, deletedAt: null }, include: { conversations: { select: { id: true } } } });
  if (!c) throw notFound("Customer not found");
  return {
    id: c.id,
    name: c.name,
    profileName: c.profileName,
    phone: displayPhone(phoneOf(c.phoneEnc)),
    preferredLanguage: c.preferredLanguage,
    savedAddress: c.savedAddress,
    tags: c.tags,
    notes: c.notes,
    orderCount: c.orderCount,
    totalSpent: num(c.totalSpent),
    createdAt: c.createdAt.toISOString(),
    conversationId: c.conversations[0]?.id ?? null,
    orders: await listOrders(restaurantId, { customerId: c.id, take: 50 }),
  };
}

// ───────── Team ─────────

export async function listTeam(restaurantId: string) {
  const users = await db.user.findMany({ where: { restaurantId, deletedAt: null }, orderBy: { createdAt: "asc" } });
  return users.map((u) => ({ id: u.id, name: u.name, email: u.email, role: u.role, isActive: u.isActive, lastLoginAt: u.lastLoginAt?.toISOString() ?? null, emailNotifications: u.emailNotifications }));
}

// ───────── Analytics ─────────

export async function getAnalytics(restaurantId: string, timezone: string) {
  const now = new Date();
  const p = zonedParts(now, timezone);
  const startOfToday = zonedTimeToUtc(p.year, p.month, p.day, 0, 0, timezone);
  const start7 = new Date(startOfToday.getTime() - 6 * 86_400_000);

  const [todayOrders, byStatus, attention, active, recent, last7] = await Promise.all([
    db.order.findMany({ where: { restaurantId, deletedAt: null, createdAt: { gte: startOfToday } }, select: { total: true, status: true } }),
    db.order.groupBy({ by: ["status"], where: { restaurantId, deletedAt: null, createdAt: { gte: startOfToday } }, _count: true }),
    db.conversation.count({ where: { restaurantId, OR: [{ needsHuman: true }, { mode: "HUMAN", unreadCount: { gt: 0 } }] } }),
    db.conversation.count({ where: { restaurantId, lastInboundAt: { gte: new Date(now.getTime() - 24 * 3_600_000) } } }),
    listOrders(restaurantId, { status: "ACTIVE", take: 8 }),
    db.order.findMany({ where: { restaurantId, deletedAt: null, createdAt: { gte: start7 }, status: { not: "CANCELLED" } }, select: { total: true, createdAt: true } }),
  ]);
  const valid = todayOrders.filter((o) => o.status !== "CANCELLED");
  const revenue = valid.reduce((s, o) => s + num(o.total), 0);
  const days = Array.from({ length: 7 }, (_, i) => {
    const from = new Date(start7.getTime() + i * 86_400_000);
    const to = new Date(from.getTime() + 86_400_000);
    const rows = last7.filter((o) => o.createdAt >= from && o.createdAt < to);
    return { date: from.toISOString(), orders: rows.length, revenue: rows.reduce((s, o) => s + num(o.total), 0) };
  });
  return {
    ordersToday: todayOrders.length,
    revenueToday: Math.round(revenue * 100) / 100,
    averageOrderValue: valid.length ? Math.round((revenue / valid.length) * 100) / 100 : 0,
    needsAttention: attention,
    activeConversations: active,
    byStatus: Object.fromEntries(byStatus.map((b) => [b.status, b._count])) as Partial<Record<OrderStatus, number>>,
    activeOrders: recent,
    last7Days: days,
  };
}
export type AnalyticsDTO = Awaited<ReturnType<typeof getAnalytics>>;

// ───────── Notifications & audit ─────────

export async function listNotifications(restaurantId: string, take = 30) {
  const rows = await db.notification.findMany({ where: { restaurantId }, orderBy: { createdAt: "desc" }, take });
  return rows.map((n) => ({ id: n.id, type: n.type, title: n.title, body: n.body, link: n.link, read: Boolean(n.readAt), createdAt: n.createdAt.toISOString() }));
}

export async function listAudit(restaurantId: string, take = 100) {
  const rows = await db.auditLog.findMany({ where: { restaurantId }, orderBy: { createdAt: "desc" }, take, include: { actorUser: { select: { name: true } } } });
  return rows.map((a) => ({
    id: a.id,
    action: a.action,
    entityType: a.entityType,
    entityId: a.entityId,
    actorType: a.actorType,
    actorName: a.actorUser?.name ?? null,
    before: a.before,
    after: a.after,
    createdAt: a.createdAt.toISOString(),
  }));
}
