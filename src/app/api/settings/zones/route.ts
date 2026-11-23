import { route, ok, parseJson, clientIp } from "@/server/http";
import { requireApiSession } from "@/server/auth/session";
import { zonesSchema } from "@/lib/schemas";
import { db } from "@/server/db";
import { audit } from "@/server/audit";

export const PUT = route(async (req) => {
  const s = await requireApiSession("settings:write");
  const { zones } = await parseJson(req, zonesSchema);
  const existing = await db.deliveryZone.findMany({ where: { restaurantId: s.restaurantId } });
  const keep = zones.filter((z) => z.id && existing.some((e) => e.id === z.id)).map((z) => z.id!);
  await db.$transaction(async (tx) => {
    await tx.deliveryZone.deleteMany({ where: { restaurantId: s.restaurantId, id: { notIn: keep } } });
    for (const [i, z] of zones.entries()) {
      const { id, ...data } = z;
      const row = { ...data, radiusKm: data.type === "RADIUS" ? (data.radiusKm ?? null) : null, areas: data.type === "AREA" ? data.areas : [], minimumOrder: data.minimumOrder ?? null, estimatedMinutes: data.estimatedMinutes ?? null, sortOrder: i };
      if (id && keep.includes(id)) await tx.deliveryZone.update({ where: { id }, data: row });
      else await tx.deliveryZone.create({ data: { ...row, restaurantId: s.restaurantId } });
    }
  });
  await audit({ restaurantId: s.restaurantId, actorType: "STAFF", actorUserId: s.userId, action: "settings.zones_updated", entityType: "Restaurant", entityId: s.restaurantId, before: existing.map((e) => ({ name: e.name, fee: e.fee.toString() })), after: zones.map((z) => ({ name: z.name, fee: z.fee })), ip: clientIp(req) });
  return ok({ saved: true });
});
