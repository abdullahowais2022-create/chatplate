import "server-only";
import type { MessageStatus, Prisma, WhatsAppAccount } from "@prisma/client";
import { db } from "../db";
import { enqueue } from "../queue";
import { bumpLive } from "../live";
import { normalizeWebhook, type NormalizedEvent, type WaStatus } from "./payload";
import { envelopeFromWa, handleInbound } from "../services/inbound";
import { explainMetaError } from "./client";

/**
 * Stores each event once (unique externalId) and queues it. Returns quickly so Meta gets its 200
 * within the timeout; duplicates from Meta retries are dropped here.
 */
export async function ingestWebhook(account: WhatsAppAccount, body: unknown) {
  const events = normalizeWebhook(body);
  let queued = 0;
  for (const e of events) {
    if (account.phoneNumberId && e.phoneNumberId && e.phoneNumberId !== account.phoneNumberId) continue;
    // Fast path for Meta's retries; the unique index below still guarantees idempotency under races.
    if (await db.webhookEvent.findUnique({ where: { externalId: e.externalId }, select: { id: true } })) continue;
    try {
      const row = await db.webhookEvent.create({
        data: { restaurantId: account.restaurantId, externalId: e.externalId, type: e.kind, payload: e as unknown as Prisma.InputJsonValue },
      });
      await enqueue({ type: "process-webhook-event", eventId: row.id }, { dedupeId: row.id });
      queued++;
    } catch (err) {
      if ((err as { code?: string }).code !== "P2002") throw err; // duplicate → already handled
    }
  }
  await db.whatsAppAccount.update({
    where: { id: account.id },
    data: { lastWebhookAt: new Date(), ...(account.status === "PENDING_VERIFICATION" ? { status: "CONNECTED", lastError: null } : {}) },
  });
  return { received: events.length, queued };
}

export async function processWebhookEvent(eventId: string) {
  const ev = await db.webhookEvent.findUnique({ where: { id: eventId } });
  if (!ev || ev.status === "PROCESSED" || ev.status === "IGNORED" || !ev.restaurantId) return;
  await db.webhookEvent.update({ where: { id: ev.id }, data: { status: "PROCESSING", attempts: { increment: 1 } } });
  try {
    const e = ev.payload as unknown as NormalizedEvent;
    if (e.kind === "message") await handleInbound(envelopeFromWa(ev.restaurantId, e.message, e.profileName));
    else if (e.kind === "status") await applyStatus(ev.restaurantId, e.status);
    await db.webhookEvent.update({ where: { id: ev.id }, data: { status: "PROCESSED", processedAt: new Date(), error: null } });
  } catch (err) {
    await db.webhookEvent.update({ where: { id: ev.id }, data: { status: "FAILED", error: (err as Error).message.slice(0, 1000) } });
    throw err; // let the queue retry
  }
}

const RANK: Partial<Record<MessageStatus, number>> = { QUEUED: 0, SENT: 1, DELIVERED: 2, READ: 3 };

async function applyStatus(restaurantId: string, s: WaStatus) {
  const msg = await db.message.findFirst({ where: { waMessageId: s.id, restaurantId } });
  if (!msg) return; // status for a message we didn't send (e.g. sent from the WhatsApp app)
  const at = new Date(Number(s.timestamp) * 1000 || Date.now());
  const map: Record<string, MessageStatus> = { sent: "SENT", delivered: "DELIVERED", read: "READ", failed: "FAILED" };
  const next = map[s.status];
  if (!next) return;
  if (next !== "FAILED" && (RANK[msg.status] ?? -1) >= (RANK[next] ?? 0)) return; // out-of-order delivery
  const err = s.errors?.[0];
  await db.message.update({
    where: { id: msg.id },
    data: {
      status: next,
      ...(next === "SENT" ? { sentAt: msg.sentAt ?? at } : {}),
      ...(next === "DELIVERED" ? { deliveredAt: at } : {}),
      ...(next === "READ" ? { readAt: at, deliveredAt: msg.deliveredAt ?? at } : {}),
      ...(next === "FAILED" ? { failedAt: at, error: explainMetaError(err?.code, err?.message ?? err?.title) } : {}),
    },
  });
  await bumpLive(restaurantId);
}
