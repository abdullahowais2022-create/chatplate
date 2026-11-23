import { route, ok, parseJson, clientIp } from "@/server/http";
import { requireApiSession } from "@/server/auth/session";
import { profileSchema } from "@/lib/schemas";
import { db } from "@/server/db";
import { audit } from "@/server/audit";

export const PUT = route(async (req) => {
  const s = await requireApiSession("settings:write");
  const data = await parseJson(req, profileSchema);
  const before = await db.restaurant.findUniqueOrThrow({ where: { id: s.restaurantId }, select: { name: true, address: true, phone: true, timezone: true, currency: true, logoUrl: true } });
  await db.restaurant.update({ where: { id: s.restaurantId }, data: { ...data, latitude: data.latitude ?? null, longitude: data.longitude ?? null } });
  await audit({ restaurantId: s.restaurantId, actorType: "STAFF", actorUserId: s.userId, action: "settings.profile_updated", entityType: "Restaurant", entityId: s.restaurantId, before, after: data, ip: clientIp(req) });
  return ok({ saved: true });
});
