import "server-only";
import type { MessageSender, Prisma } from "@prisma/client";
import { db } from "../db";
import { decryptOrNull } from "../crypto";
import { bumpLive } from "../live";
import { explainMetaError, getCredentials, MetaApiError, sendMessage, type OutboundContent } from "../whatsapp/client";

const WINDOW_MS = 24 * 60 * 60 * 1000;

export const isSimulatedPhone = (phone: string | null) => !phone || !/^\d{6,16}$/.test(phone);

export function previewOf(content: OutboundContent) {
  return content.text.replace(/\s+/g, " ").slice(0, 140);
}

/**
 * Stores and sends one outbound message. Never throws for delivery problems: the message is saved as
 * FAILED with a readable error so staff can see it in the inbox.
 */
export async function sendToCustomer(opts: {
  conversationId: string;
  content: OutboundContent;
  sender: MessageSender;
  staffUserId?: string | null;
  aiData?: Prisma.InputJsonValue;
  language?: string | null;
}) {
  const conv = await db.conversation.findUniqueOrThrow({ where: { id: opts.conversationId }, include: { customer: true } });
  const phone = decryptOrNull(conv.customer.phoneEnc);
  const message = await db.message.create({
    data: {
      restaurantId: conv.restaurantId,
      conversationId: conv.id,
      direction: "OUTBOUND",
      sender: opts.sender,
      type: opts.content.kind === "text" ? "TEXT" : "INTERACTIVE",
      body: opts.content.text,
      payload: opts.content as unknown as Prisma.InputJsonValue,
      aiData: opts.aiData,
      language: opts.language ?? conv.language,
      status: "QUEUED",
      staffUserId: opts.staffUserId ?? null,
    },
  });

  let update: Prisma.MessageUpdateInput;
  const creds = isSimulatedPhone(phone) ? null : await getCredentials(conv.restaurantId);
  if (!creds) {
    update = { status: "SIMULATED", sentAt: new Date() };
  } else if (!conv.lastInboundAt || Date.now() - conv.lastInboundAt.getTime() > WINDOW_MS) {
    update = { status: "FAILED", failedAt: new Date(), error: explainMetaError(131047) };
  } else {
    try {
      const waMessageId = await sendMessage(creds, phone!, opts.content);
      update = { status: "SENT", waMessageId, sentAt: new Date() };
    } catch (err) {
      const msg = err instanceof MetaApiError ? err.message : `Send failed: ${(err as Error).message}`;
      update = { status: "FAILED", failedAt: new Date(), error: msg };
      console.error("[whatsapp] send failed", { conversationId: conv.id, error: msg });
    }
  }

  const saved = await db.message.update({ where: { id: message.id }, data: update });
  await db.conversation.update({
    where: { id: conv.id },
    data: { lastMessageAt: new Date(), lastMessagePreview: previewOf(opts.content) },
  });
  await bumpLive(conv.restaurantId);
  return saved;
}

export function withinCustomerWindow(lastInboundAt: Date | null) {
  return Boolean(lastInboundAt && Date.now() - lastInboundAt.getTime() <= WINDOW_MS);
}
