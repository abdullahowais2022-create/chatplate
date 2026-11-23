import { route, ok, parseJson, clientIp, badRequest } from "@/server/http";
import { requireApiSession } from "@/server/auth/session";
import { businessSettingsSchema } from "@/lib/schemas";
import { db } from "@/server/db";
import { getSettings } from "@/server/services/queries";
import { audit } from "@/server/audit";

export const GET = route(async () => {
  const s = await requireApiSession("settings:read");
  return ok(await getSettings(s.restaurantId));
});

export const PATCH = route(async (req) => {
  const s = await requireApiSession("settings:write");
  const data = await parseJson(req, businessSettingsSchema);
  const before = await getSettings(s.restaurantId);
  if ((data.deliveryEnabled ?? before.deliveryEnabled) === false && (data.pickupEnabled ?? before.pickupEnabled) === false) {
    throw badRequest("Enable delivery, pickup, or both");
  }
  await db.restaurant.update({ where: { id: s.restaurantId }, data });
  const changed = Object.fromEntries(Object.keys(data).map((k) => [k, (before as Record<string, unknown>)[k]]));
  await audit({ restaurantId: s.restaurantId, actorType: "STAFF", actorUserId: s.userId, action: "settings.updated", entityType: "Restaurant", entityId: s.restaurantId, before: changed, after: data, ip: clientIp(req) });
  return ok(await getSettings(s.restaurantId));
});
