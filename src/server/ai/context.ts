import "server-only";
import { db } from "../db";
import type { HistoryTurn, PipelineContext } from "./types";
import { EDITABLE_STATUSES, parseDraft, toMenuSnapshot, toOrderSnapshot, toRestaurantFacts } from "../services/serialize";
import { decryptOrNull } from "../crypto";

export async function loadRestaurantContext(restaurantId: string) {
  const [restaurant, categories] = await Promise.all([
    db.restaurant.findUniqueOrThrow({ where: { id: restaurantId }, include: { businessHours: true, deliveryZones: true } }),
    db.menuCategory.findMany({
      where: { restaurantId, deletedAt: null },
      include: { items: { where: { deletedAt: null }, include: { variants: true, addons: true } } },
    }),
  ]);
  return { restaurant, facts: toRestaurantFacts(restaurant), menu: toMenuSnapshot(restaurant.currency, categories) };
}

/** Builds the full pipeline context for a live conversation. */
export async function loadPipelineContext(conversationId: string, now = new Date()): Promise<PipelineContext> {
  const conv = await db.conversation.findUniqueOrThrow({ where: { id: conversationId }, include: { customer: true } });
  const [{ facts, menu }, recent, editable, latest, priorOutbound] = await Promise.all([
    loadRestaurantContext(conv.restaurantId),
    db.message.findMany({ where: { conversationId }, orderBy: { createdAt: "desc" }, take: 14, include: { voiceNote: true } }),
    db.order.findFirst({ where: { customerId: conv.customerId, status: { in: EDITABLE_STATUSES }, deletedAt: null }, orderBy: { createdAt: "desc" }, include: { items: true } }),
    db.order.findFirst({ where: { customerId: conv.customerId, deletedAt: null }, orderBy: { createdAt: "desc" }, include: { items: true } }),
    db.message.count({ where: { conversationId, direction: "OUTBOUND" } }),
  ]);
  const history: HistoryTurn[] = recent
    .reverse()
    .slice(0, -1) // exclude the message being processed
    .map((m) => ({
      role: m.sender === "CUSTOMER" ? ("customer" as const) : m.sender === "STAFF" ? ("staff" as const) : ("assistant" as const),
      text: m.voiceNote?.transcript ? `[voice] ${m.voiceNote.transcript}` : (m.body ?? `[${m.type.toLowerCase()}]`),
    }));
  const c = conv.customer;
  return {
    restaurantId: conv.restaurantId,
    restaurant: facts,
    menu,
    state: conv.state,
    draft: parseDraft(conv.draft),
    editingOrderId: conv.editingOrderId,
    language: conv.language,
    clarificationAttempts: conv.clarificationAttempts,
    customer: {
      name: c.name,
      savedAddress: c.savedAddress,
      savedLocation: c.savedLat != null && c.savedLng != null ? { lat: c.savedLat, lng: c.savedLng } : null,
      preferredLanguage: c.preferredLanguage,
      phone: decryptOrNull(c.phoneEnc),
    },
    history,
    editableOrder: editable ? toOrderSnapshot(editable) : null,
    latestOrder: latest ? toOrderSnapshot(latest) : null,
    isFirstContact: priorOutbound === 0,
    now,
  };
}
