import { z } from "zod";
import { route, ok, parseJson, clientIp, badRequest } from "@/server/http";
import { requireApiSession } from "@/server/auth/session";
import { enforceRateLimit } from "@/server/ratelimit";
import { env } from "@/server/env";
import { getWhatsAppStatus } from "@/server/services/queries";
import { connectWithEmbeddedSignup } from "@/server/whatsapp/embedded";
import { MetaApiError } from "@/server/whatsapp/client";
import { audit } from "@/server/audit";

const schema = z.object({
  code: z.string().min(10).max(2000),
  wabaId: z.string().regex(/^\d{5,30}$/, "Invalid WhatsApp Business Account id"),
  phoneNumberId: z.string().regex(/^\d{5,30}$/, "Invalid phone number id"),
  /** The business keeps using the WhatsApp Business app on its phone (Meta "coexistence"). */
  existingApp: z.boolean().default(false),
});

/** Finishes Meta Embedded Signup: the browser sends the one-time code and the ids Meta returned. */
export const POST = route(async (req) => {
  const s = await requireApiSession("whatsapp:manage");
  await enforceRateLimit("wa-embedded", s.restaurantId, 10, "1 h");
  const input = await parseJson(req, schema);
  try {
    const r = await connectWithEmbeddedSignup(s.restaurantId, input);
    await audit({ restaurantId: s.restaurantId, actorType: "STAFF", actorUserId: s.userId, action: "whatsapp.connected_embedded", entityType: "WhatsAppAccount", entityId: s.restaurantId, after: { wabaId: input.wabaId, phoneNumberId: input.phoneNumberId, display: r.displayPhoneNumber, warning: r.warning }, ip: clientIp(req) });
    return ok({ ...(await getWhatsAppStatus(s.restaurantId, env().APP_URL, s.email)), warning: r.warning });
  } catch (err) {
    if (err instanceof MetaApiError) throw badRequest(err.message);
    throw err;
  }
});
