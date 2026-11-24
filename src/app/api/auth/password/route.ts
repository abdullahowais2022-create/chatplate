import { route, ok, parseJson, unauthorized, forbidden, badRequest } from "@/server/http";
import { changePasswordSchema } from "@/lib/schemas";
import { requireApiSession } from "@/server/auth/session";
import { db } from "@/server/db";
import { hashPassword, passwordSchema, verifyPassword } from "@/server/auth/password";
import { audit } from "@/server/audit";

export const POST = route(async (req) => {
  const s = await requireApiSession(undefined, { allowPendingPasswordChange: true });
  if (s.isDemo) throw forbidden("This is disabled in the public demo");
  const { currentPassword, newPassword } = await parseJson(req, changePasswordSchema);
  passwordSchema.parse(newPassword);
  const user = await db.user.findUniqueOrThrow({ where: { id: s.userId } });
  if (!(await verifyPassword(currentPassword, user.passwordHash))) throw unauthorized("Current password is incorrect");
  if (currentPassword === newPassword) throw badRequest("Choose a password that's different from the current one");
  await db.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(newPassword), mustChangePassword: false } });
  // Sign out every other session.
  await db.session.deleteMany({ where: { userId: user.id, id: { not: s.sessionId } } });
  await audit({ restaurantId: s.restaurantId, actorType: "STAFF", actorUserId: s.userId, action: "auth.password_changed", entityType: "User", entityId: s.userId });
  return ok({ changed: true });
});
