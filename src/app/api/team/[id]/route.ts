import { route, ok, parseJson, clientIp, notFound, badRequest } from "@/server/http";
import { requireApiSession } from "@/server/auth/session";
import { teamUpdateSchema } from "@/lib/schemas";
import { db } from "@/server/db";
import { audit } from "@/server/audit";

type Ctx = { params: Promise<{ id: string }> };

async function assertNotLastOwner(restaurantId: string, userId: string) {
  const owners = await db.user.count({ where: { restaurantId, role: "OWNER", isActive: true, deletedAt: null, NOT: { id: userId } } });
  if (owners === 0) throw badRequest("A restaurant needs at least one active owner");
}

export const PATCH = route<Ctx>(async (req, { params }) => {
  const s = await requireApiSession("team:manage");
  const { id } = await params;
  const data = await parseJson(req, teamUpdateSchema);
  const user = await db.user.findFirst({ where: { id, restaurantId: s.restaurantId, deletedAt: null } });
  if (!user) throw notFound("Team member not found");
  if (user.role === "OWNER" && ((data.role && data.role !== "OWNER") || data.isActive === false)) await assertNotLastOwner(s.restaurantId, id);
  await db.user.update({ where: { id }, data });
  if (data.isActive === false) await db.session.deleteMany({ where: { userId: id } });
  await audit({ restaurantId: s.restaurantId, actorType: "STAFF", actorUserId: s.userId, action: "team.member_updated", entityType: "User", entityId: id, before: { role: user.role, isActive: user.isActive }, after: data, ip: clientIp(req) });
  return ok({ saved: true });
});

export const DELETE = route<Ctx>(async (req, { params }) => {
  const s = await requireApiSession("team:manage");
  const { id } = await params;
  if (id === s.userId) throw badRequest("You can't remove yourself");
  const user = await db.user.findFirst({ where: { id, restaurantId: s.restaurantId, deletedAt: null } });
  if (!user) throw notFound("Team member not found");
  if (user.role === "OWNER") await assertNotLastOwner(s.restaurantId, id);
  // Soft delete; free the email address for reuse.
  await db.user.update({ where: { id }, data: { deletedAt: new Date(), isActive: false, email: `deleted+${id}@${user.email.split("@")[1]}` } });
  await db.session.deleteMany({ where: { userId: id } });
  await audit({ restaurantId: s.restaurantId, actorType: "STAFF", actorUserId: s.userId, action: "team.member_removed", entityType: "User", entityId: id, before: { email: user.email, role: user.role }, ip: clientIp(req) });
  return ok({ deleted: true });
});
