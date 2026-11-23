import { route, ok, parseJson, clientIp } from "@/server/http";
import { requireApiSession } from "@/server/auth/session";
import { notificationSettingsSchema } from "@/lib/schemas";
import { db } from "@/server/db";
import { encrypt } from "@/server/crypto";
import { audit } from "@/server/audit";

export const PUT = route(async (req) => {
  const s = await requireApiSession("settings:write");
  const { notifyWhatsAppNumber, ...rest } = await parseJson(req, notificationSettingsSchema);
  await db.restaurant.update({
    where: { id: s.restaurantId },
    data: { ...rest, notifyWhatsAppNumberEnc: notifyWhatsAppNumber ? encrypt(notifyWhatsAppNumber.replace(/[^\d]/g, "")) : null },
  });
  await audit({ restaurantId: s.restaurantId, actorType: "STAFF", actorUserId: s.userId, action: "settings.notifications_updated", entityType: "Restaurant", entityId: s.restaurantId, after: { ...rest, notifyWhatsAppNumber: notifyWhatsAppNumber ? "set" : null }, ip: clientIp(req) });
  return ok({ saved: true });
});
