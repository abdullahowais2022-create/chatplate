import "server-only";
import type { MessageType, Prisma } from "@prisma/client";
import { db } from "../db";
import { encrypt, hashPhone, normalizePhone } from "../crypto";
import { bumpLive } from "../live";
import { rateLimit } from "../ratelimit";
import { audit } from "../audit";
import { putPrivate } from "../storage";
import { downloadMedia, getCredentials, markRead } from "../whatsapp/client";
import type { InboundWaMessage } from "../whatsapp/payload";
import { transcribe } from "../ai/transcribe";
import { loadPipelineContext } from "../ai/context";
import { runPipeline, type PipelineOutput } from "../ai/pipeline";
import type { InboundInput } from "../ai/types";
import { t } from "../ai/i18n";
import { detectLanguage } from "../ai/heuristic";
import { sendToCustomer, isSimulatedPhone } from "./messaging";
import { notify } from "./notifications";
import { cancelOrder, createOrderFromDraft, orderPlacedText, updateOrderFromDraft } from "./orders";
import { num } from "./serialize";

export type InboundEnvelope = {
  restaurantId: string;
  phone: string;
  profileName: string | null;
  waMessageId: string | null;
  timestamp: Date;
  type: MessageType;
  text: string | null;
  mediaId?: string | null;
  mimeType?: string | null;
  location?: { lat: number; lng: number; name?: string | null; address?: string | null } | null;
  buttonId?: string | null;
  raw: unknown;
};

const TYPE_MAP: Record<string, MessageType> = {
  text: "TEXT", audio: "AUDIO", image: "IMAGE", location: "LOCATION", interactive: "INTERACTIVE", button: "BUTTON",
  document: "DOCUMENT", video: "VIDEO", sticker: "STICKER", contacts: "CONTACTS", reaction: "REACTION",
};

export function envelopeFromWa(restaurantId: string, m: InboundWaMessage, profileName: string | null): InboundEnvelope {
  const type = TYPE_MAP[m.type] ?? "UNKNOWN";
  const reply = m.interactive?.button_reply ?? m.interactive?.list_reply;
  return {
    restaurantId,
    phone: normalizePhone(m.from),
    profileName,
    waMessageId: m.id,
    timestamp: new Date(Number(m.timestamp) * 1000 || Date.now()),
    type,
    text: m.text?.body ?? m.image?.caption ?? m.video?.caption ?? reply?.title ?? m.button?.text ?? null,
    mediaId: m.audio?.id ?? m.image?.id ?? null,
    mimeType: m.audio?.mime_type ?? m.image?.mime_type ?? null,
    location: m.location ? { lat: m.location.latitude, lng: m.location.longitude, name: m.location.name, address: m.location.address } : null,
    buttonId: reply?.id ?? m.button?.payload ?? null,
    raw: m,
  };
}

const LEASE_MS = 90_000;

/**
 * Serialises processing per conversation so concurrent messages can't clobber the cart.
 * Uses a lease column rather than a held transaction, so it works with tiny serverless connection pools.
 */
async function withConversationLock<T>(conversationId: string, fn: () => Promise<T>): Promise<T> {
  const deadline = Date.now() + 60_000;
  for (;;) {
    const now = new Date();
    const { count } = await db.conversation.updateMany({
      where: { id: conversationId, OR: [{ lockedUntil: null }, { lockedUntil: { lt: now } }] },
      data: { lockedUntil: new Date(now.getTime() + LEASE_MS) },
    });
    if (count === 1) break;
    if (Date.now() > deadline) throw new Error("Conversation is busy; will retry");
    await new Promise((r) => setTimeout(r, 400));
  }
  try {
    return await fn();
  } finally {
    await db.conversation.update({ where: { id: conversationId }, data: { lockedUntil: null } }).catch(() => undefined);
  }
}

async function upsertCustomer(env: InboundEnvelope) {
  const phoneHash = hashPhone(env.phone);
  return db.customer.upsert({
    where: { restaurantId_phoneHash: { restaurantId: env.restaurantId, phoneHash } },
    create: {
      restaurantId: env.restaurantId,
      phoneHash,
      phoneEnc: encrypt(env.phone),
      phoneLast4: env.phone.slice(-4),
      profileName: env.profileName,
      lastMessageAt: env.timestamp,
    },
    update: { ...(env.profileName ? { profileName: env.profileName } : {}), lastMessageAt: env.timestamp },
  });
}

/**
 * Processes one inbound customer message end to end. Idempotent: a repeated WhatsApp message id is ignored.
 * Returns the pipeline output when the AI ran (useful for the simulator).
 */
export async function handleInbound(env: InboundEnvelope): Promise<PipelineOutput | null> {
  if (env.waMessageId && (await db.message.findUnique({ where: { waMessageId: env.waMessageId }, select: { id: true } }))) return null;

  const restaurant = await db.restaurant.findUniqueOrThrow({ where: { id: env.restaurantId } });
  const customer = await upsertCustomer(env);
  const conversation = await db.conversation.upsert({
    where: { restaurantId_customerId: { restaurantId: env.restaurantId, customerId: customer.id } },
    create: { restaurantId: env.restaurantId, customerId: customer.id },
    update: {},
  });

  return withConversationLock(conversation.id, async () => {
    let message;
    try {
      message = await db.message.create({
        data: {
          restaurantId: env.restaurantId,
          conversationId: conversation.id,
          direction: "INBOUND",
          sender: "CUSTOMER",
          type: env.type,
          waMessageId: env.waMessageId,
          body: env.text,
          payload: env.raw as Prisma.InputJsonValue,
          status: "RECEIVED",
          createdAt: env.timestamp,
        },
      });
    } catch (err) {
      if ((err as { code?: string }).code === "P2002") return null; // duplicate delivery raced us
      throw err;
    }

    const preview = env.text ?? (env.type === "AUDIO" ? "🎤 Voice note" : env.type === "LOCATION" ? "📍 Location" : `[${env.type.toLowerCase()}]`);
    await db.conversation.update({
      where: { id: conversation.id },
      data: { lastInboundAt: env.timestamp, lastMessageAt: env.timestamp, lastMessagePreview: preview.slice(0, 140), unreadCount: { increment: 1 } },
    });
    await bumpLive(env.restaurantId);

    const creds = isSimulatedPhone(env.phone) ? null : await getCredentials(env.restaurantId);
    if (creds && env.waMessageId) void markRead(creds, env.waMessageId);

    if (customer.tags.includes("BLOCKED")) return null;

    // Abuse protection: cap AI work per customer.
    if (!(await rateLimit("inbound-customer", customer.id, 12, "1 m"))) {
      if (await rateLimit("inbound-customer-warn", customer.id, 1, "5 m")) {
        await sendToCustomer({ conversationId: conversation.id, sender: "SYSTEM", content: { kind: "text", text: t(conversation.language ?? restaurant.defaultLanguage, "rateLimited") } });
      }
      return null;
    }

    const lang = conversation.language ?? customer.preferredLanguage ?? restaurant.defaultLanguage;
    const input: InboundInput = { text: env.text, location: env.location ?? null, buttonId: env.buttonId ?? null };

    // ── Voice notes ──
    if (env.type === "AUDIO" && env.mediaId) {
      const vn = await db.voiceNote.create({ data: { restaurantId: env.restaurantId, messageId: message.id, mediaId: env.mediaId, mimeType: env.mimeType } });
      try {
        if (!creds) throw new Error("WhatsApp is not connected; cannot download media");
        const media = await downloadMedia(creds, env.mediaId);
        const key = `${env.restaurantId}/${message.id}.${media.mimeType.includes("ogg") ? "ogg" : "bin"}`;
        await putPrivate(key, media.data, media.mimeType);
        await db.voiceNote.update({ where: { id: vn.id }, data: { storageKey: key, sizeBytes: media.data.length, mimeType: media.mimeType } });
        const tr = await transcribe(media.data, media.mimeType);
        if (!tr.ok) throw new Error(tr.reason);
        const detected = detectLanguage(tr.text, lang);
        await db.voiceNote.update({ where: { id: vn.id }, data: { transcript: tr.text, language: detected, status: "COMPLETED" } });
        await db.message.update({ where: { id: message.id }, data: { body: tr.text } });
        input.text = tr.text;
        input.transcribed = true;
      } catch (err) {
        await db.voiceNote.update({ where: { id: vn.id }, data: { status: "FAILED", error: (err as Error).message.slice(0, 500) } });
        if (conversation.mode === "AI" && restaurant.aiEnabled) {
          await sendToCustomer({ conversationId: conversation.id, sender: "AI", content: { kind: "text", text: t(lang, "voiceFailed") } });
        }
        return null;
      }
    } else if (["IMAGE", "VIDEO", "DOCUMENT", "STICKER", "CONTACTS", "UNKNOWN"].includes(env.type) && !env.text) {
      if (conversation.mode === "AI" && restaurant.aiEnabled) {
        await sendToCustomer({ conversationId: conversation.id, sender: "AI", content: { kind: "text", text: t(lang, "unsupportedMedia") } });
      }
      return null;
    } else if (env.type === "REACTION") {
      return null;
    }

    // ── Human mode: produce a suggestion only, never send ──
    if (conversation.mode === "HUMAN" || !restaurant.aiEnabled) {
      const ctx = await loadPipelineContext(conversation.id);
      const out = await runPipeline(ctx, input).catch(() => null);
      await db.conversation.update({
        where: { id: conversation.id },
        data: {
          aiSuggestion: out?.reply ?? null,
          ...(restaurant.aiEnabled ? {} : { needsHuman: true, needsHumanReason: "AI replies are turned off" }),
        },
      });
      await db.message.update({ where: { id: message.id }, data: { aiData: out ? (debugData(out) as Prisma.InputJsonValue) : undefined } });
      await bumpLive(env.restaurantId);
      return out;
    }

    const ctx = await loadPipelineContext(conversation.id);
    const out = await runPipeline(ctx, input);
    await db.message.update({ where: { id: message.id }, data: { aiData: debugData(out) as Prisma.InputJsonValue, language: out.language } });
    await applyPipelineResult(conversation.id, out);
    return out;
  });
}

export function debugData(out: PipelineOutput) {
  return {
    engine: out.engine,
    language: out.language,
    extraction: out.extraction,
    raw: out.raw,
    decision: { ...out.decision, facts: out.decision.facts.slice(0, 20) },
    reply: out.reply,
    errors: out.errors,
    durationMs: out.durationMs,
  };
}

/** Applies a pipeline decision: persists conversation state, creates/updates/cancels orders, sends replies. */
export async function applyPipelineResult(conversationId: string, out: PipelineOutput) {
  const d = out.decision;
  const conv = await db.conversation.findUniqueOrThrow({ where: { id: conversationId }, include: { customer: true } });
  const restaurantId = conv.restaurantId;

  await db.conversation.update({
    where: { id: conversationId },
    data: {
      state: d.state,
      draft: d.draft as unknown as Prisma.InputJsonValue,
      editingOrderId: d.editingOrderId,
      clarificationAttempts: d.clarificationAttempts,
      language: out.language,
      aiSuggestion: null,
    },
  });
  if (conv.customer.preferredLanguage !== out.language) {
    await db.customer.update({ where: { id: conv.customerId }, data: { preferredLanguage: out.language } });
  }

  const send = (content: PipelineOutput["outbound"][number]) =>
    sendToCustomer({ conversationId, content, sender: "AI", language: out.language, aiData: { action: d.action, engine: out.engine } });

  // Order effects first, so confirmations carry the real order number.
  if (d.orderEffect?.type === "create") {
    const order = await createOrderFromDraft({ conversationId, draft: d.draft, language: out.language, actor: { type: "CUSTOMER" } });
    await send({ kind: "text", text: orderPlacedText(out.language, order.number, num(order.total), order.currency) });
    return;
  }
  if (d.orderEffect?.type === "update") {
    try {
      const order = await updateOrderFromDraft({ orderId: d.orderEffect.orderId, conversationId, draft: d.draft, actor: { type: "CUSTOMER" } });
      await send({ kind: "text", text: orderPlacedText(out.language, order.number, num(order.total), order.currency, true) });
    } catch {
      const o = await db.order.findUnique({ where: { id: d.orderEffect.orderId } });
      await flag(conversationId, restaurantId, `Customer tried to change order #${o?.number} after it moved to ${o?.status}`);
      await send({ kind: "text", text: t(out.language, "cannotModify", { number: o?.number ?? "" }) });
    }
    return;
  }
  if (d.orderEffect?.type === "cancel") {
    try {
      await cancelOrder({ restaurantId, orderId: d.orderEffect.orderId, actor: { type: "CUSTOMER" }, reason: "Cancelled by the customer on WhatsApp" });
    } catch {
      const o = await db.order.findUnique({ where: { id: d.orderEffect.orderId } });
      await flag(conversationId, restaurantId, `Customer tried to cancel order #${o?.number} after it moved to ${o?.status}`);
      await send({ kind: "text", text: t(out.language, "cannotModify", { number: o?.number ?? "" }) });
      return;
    }
  }

  for (const plan of out.outbound) await send(plan);

  if (d.action === "handoff") {
    await db.conversation.update({ where: { id: conversationId }, data: { mode: "HUMAN", needsHuman: true, needsHumanReason: d.handoffReason } });
    await audit({ restaurantId, actorType: "AI", action: "conversation.escalated", entityType: "Conversation", entityId: conversationId, after: { reason: d.handoffReason } });
    await notify({
      restaurantId,
      type: d.handoffReason === "Customer complaint" ? "COMPLAINT" : "NEEDS_HUMAN",
      title: `${conv.customer.name ?? conv.customer.profileName ?? "A customer"} needs a human`,
      body: d.handoffReason ?? undefined,
      link: `/dashboard/inbox?c=${conversationId}`,
    });
  } else if (d.flagForStaff) {
    await flag(conversationId, restaurantId, d.flagForStaff);
  }
}

async function flag(conversationId: string, restaurantId: string, reason: string) {
  await db.conversation.update({ where: { id: conversationId }, data: { needsHuman: true, needsHumanReason: reason } });
  await audit({ restaurantId, actorType: "AI", action: "conversation.flagged", entityType: "Conversation", entityId: conversationId, after: { reason } });
  await notify({ restaurantId, type: /complaint/i.test(reason) ? "COMPLAINT" : "NEEDS_HUMAN", title: "Conversation needs attention", body: reason, link: `/dashboard/inbox?c=${conversationId}` });
}
