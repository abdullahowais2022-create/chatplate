export const maxDuration = 60;

import { route, ok, parseJson, badRequest } from "@/server/http";
import { requireApiSession } from "@/server/auth/session";
import { simulatorSchema } from "@/lib/schemas";
import { handleInbound } from "@/server/services/inbound";
import { enforceAiQuota, enforceRateLimit } from "@/server/ratelimit";
import { db } from "@/server/db";
import { hashPhone } from "@/server/crypto";

/**
 * End-to-end simulator: injects a message from a fake customer through the *real* processing path
 * (orders, notifications, inbox), with WhatsApp sending simulated. Great for demos and staff training.
 */
export const POST = route(async (req) => {
  const s = await requireApiSession("playground:use");
  await enforceRateLimit("simulator", s.userId, 30, "1 m");
  await enforceAiQuota(s.restaurantId);
  const input = await parseJson(req, simulatorSchema);
  if (!input.text && !input.buttonId && !input.location) throw badRequest("Send text, a button or a location");
  const phone = `sim-${input.customer.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 30)}`;
  const out = await handleInbound({
    restaurantId: s.restaurantId,
    phone,
    profileName: input.customer,
    waMessageId: null,
    timestamp: new Date(),
    type: input.location ? "LOCATION" : input.buttonId ? "INTERACTIVE" : "TEXT",
    text: input.text ?? null,
    location: input.location ?? null,
    buttonId: input.buttonId ?? null,
    raw: { simulated: true, ...input },
  });
  const customer = await db.customer.findUnique({ where: { restaurantId_phoneHash: { restaurantId: s.restaurantId, phoneHash: hashPhone(phone) } }, include: { conversations: true } });
  return ok({ conversationId: customer?.conversations[0]?.id ?? null, action: out?.decision.action ?? null, engine: out?.engine ?? null });
});
