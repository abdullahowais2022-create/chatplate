import { route, ok, parseJson, clientIp } from "@/server/http";
import { requireApiSession } from "@/server/auth/session";
import { hoursSchema } from "@/lib/schemas";
import { db } from "@/server/db";
import { audit } from "@/server/audit";

export const PUT = route(async (req) => {
  const s = await requireApiSession("settings:write");
  const { hours } = await parseJson(req, hoursSchema);
  const before = await db.businessHour.findMany({ where: { restaurantId: s.restaurantId } });
  await db.$transaction([
    db.businessHour.deleteMany({ where: { restaurantId: s.restaurantId } }),
    db.businessHour.createMany({ data: hours.map((h) => ({ ...h, restaurantId: s.restaurantId })) }),
  ]);
  await audit({ restaurantId: s.restaurantId, actorType: "STAFF", actorUserId: s.userId, action: "settings.hours_updated", entityType: "Restaurant", entityId: s.restaurantId, before: before.map(({ dayOfWeek, openTime, closeTime, isClosed }) => ({ dayOfWeek, openTime, closeTime, isClosed })), after: hours, ip: clientIp(req) });
  return ok({ saved: true });
});
