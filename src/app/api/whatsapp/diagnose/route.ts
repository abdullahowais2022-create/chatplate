import { route, ok } from "@/server/http";
import { requireApiSession } from "@/server/auth/session";
import { enforceRateLimit } from "@/server/ratelimit";
import { diagnoseWhatsApp } from "@/server/whatsapp/diagnostics";

/** "Check connection": asks Meta what's wrong with this business's WhatsApp setup and fixes what it can. */
export const POST = route(async () => {
  const s = await requireApiSession("whatsapp:manage");
  await enforceRateLimit("wa-diagnose", s.restaurantId, 20, "1 h");
  return ok({ checks: await diagnoseWhatsApp(s.restaurantId) });
});
