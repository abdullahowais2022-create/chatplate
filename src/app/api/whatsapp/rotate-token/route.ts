import { embeddedSignupConfig } from "@/server/whatsapp/embedded";
import { isPlatformAdmin } from "@/server/env";
import { route, ok, forbidden } from "@/server/http";
import { requireApiSession } from "@/server/auth/session";
import { db } from "@/server/db";
import { randomToken } from "@/server/crypto";
import { audit } from "@/server/audit";
import { env } from "@/server/env";
import { getWhatsAppStatus } from "@/server/services/queries";

export const POST = route(async () => {
  const s = await requireApiSession("whatsapp:manage");
  if (embeddedSignupConfig() && !isPlatformAdmin(s.email)) throw forbidden("Use Connect with Facebook to connect WhatsApp.");
  const acc = await db.whatsAppAccount.update({ where: { restaurantId: s.restaurantId }, data: { verifyToken: randomToken(24), webhookVerifiedAt: null } });
  await audit({ restaurantId: s.restaurantId, actorType: "STAFF", actorUserId: s.userId, action: "whatsapp.verify_token_rotated", entityType: "WhatsAppAccount", entityId: acc.id });
  return ok(await getWhatsAppStatus(s.restaurantId, env().APP_URL, s.email));
});
