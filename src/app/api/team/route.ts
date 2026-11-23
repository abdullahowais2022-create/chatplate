import { route, ok, parseJson, clientIp, conflict } from "@/server/http";
import { requireApiSession } from "@/server/auth/session";
import { teamCreateSchema } from "@/lib/schemas";
import { db } from "@/server/db";
import { hashPassword, passwordSchema } from "@/server/auth/password";
import { listTeam } from "@/server/services/queries";
import { audit } from "@/server/audit";

export const GET = route(async () => {
  const s = await requireApiSession("orders:read");
  return ok(await listTeam(s.restaurantId));
});

/** The owner creates staff accounts with a temporary password (they're asked to change it). */
export const POST = route(async (req) => {
  const s = await requireApiSession("team:manage");
  const data = await parseJson(req, teamCreateSchema);
  passwordSchema.parse(data.temporaryPassword);
  if (await db.user.findUnique({ where: { email: data.email } })) throw conflict("A user with this email already exists");
  const user = await db.user.create({
    data: { restaurantId: s.restaurantId, name: data.name, email: data.email, role: data.role, passwordHash: await hashPassword(data.temporaryPassword), mustChangePassword: true },
  });
  await audit({ restaurantId: s.restaurantId, actorType: "STAFF", actorUserId: s.userId, action: "team.member_added", entityType: "User", entityId: user.id, after: { email: data.email, role: data.role }, ip: clientIp(req) });
  return ok({ id: user.id }, { status: 201 });
});
