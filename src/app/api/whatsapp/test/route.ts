import { route, ok, parseJson, badRequest } from "@/server/http";
import { requireApiSession } from "@/server/auth/session";
import { testMessageSchema } from "@/lib/schemas";
import { db } from "@/server/db";
import { getCredentials, sendMessage, MetaApiError } from "@/server/whatsapp/client";
import { normalizePhone } from "@/server/crypto";
import { enforceRateLimit } from "@/server/ratelimit";
import { env } from "@/server/env";

/**
 * Sends a test message. Note: outside a 24h customer window Meta only delivers approved templates,
 * so we send the built-in "hello_world" template, which every WABA has by default.
 */
export const POST = route(async (req) => {
  const s = await requireApiSession("whatsapp:manage");
  await enforceRateLimit("wa-test", s.restaurantId, 10, "1 h");
  const { to } = await parseJson(req, testMessageSchema);
  const creds = await getCredentials(s.restaurantId);
  if (!creds) throw badRequest("Save your WhatsApp credentials first");
  try {
    const res = await fetch(`https://graph.facebook.com/${env().META_GRAPH_API_VERSION}/${creds.phoneNumberId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${creds.accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", to: normalizePhone(to), type: "template", template: { name: "hello_world", language: { code: "en_US" } } }),
    });
    const json = (await res.json()) as { error?: { message?: string; code?: number } };
    if (!res.ok) throw new MetaApiError(json.error?.message ?? "Test message failed", res.status, json.error?.code);
    // Free-form text too: delivered only if the recipient has messaged this number in the last 24h.
    await sendMessage(creds, normalizePhone(to), { kind: "text", text: "✅ TillText test message: your WhatsApp connection works!" }).catch(() => undefined);
    await db.whatsAppAccount.update({ where: { restaurantId: s.restaurantId }, data: { lastTestAt: new Date(), lastError: null } });
    return ok({ sent: true });
  } catch (err) {
    const message = err instanceof MetaApiError ? err.message : (err as Error).message;
    await db.whatsAppAccount.update({ where: { restaurantId: s.restaurantId }, data: { lastError: message } });
    throw badRequest(message);
  }
});
