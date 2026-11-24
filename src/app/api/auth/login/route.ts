import { route, ok, parseJson, clientIp, unauthorized, forbidden } from "@/server/http";
import { loginSchema } from "@/lib/schemas";
import { enforceRateLimit } from "@/server/ratelimit";
import { db } from "@/server/db";
import { burnPasswordCheck, verifyPassword } from "@/server/auth/password";
import { createSession } from "@/server/auth/session";
import { audit } from "@/server/audit";

export const POST = route(async (req) => {
  const ip = clientIp(req);
  await enforceRateLimit("login-ip", ip, 20, "15 m");
  const { email, password } = await parseJson(req, loginSchema);
  await enforceRateLimit("login-email", email, 8, "15 m");
  const user = await db.user.findUnique({ where: { email }, include: { restaurant: true } });
  if (!user || user.deletedAt) {
    await burnPasswordCheck(password);
    throw unauthorized("Incorrect email or password");
  }
  if (!(await verifyPassword(password, user.passwordHash))) {
    await audit({ restaurantId: user.restaurantId, actorType: "STAFF", actorUserId: user.id, action: "auth.login_failed", entityType: "User", entityId: user.id, ip });
    throw unauthorized("Incorrect email or password");
  }
  if (!user.isActive) throw forbidden("Your account has been deactivated. Ask the business owner to re-enable it.");
  await createSession(user.id, { ip, userAgent: req.headers.get("user-agent") ?? undefined });
  await audit({ restaurantId: user.restaurantId, actorType: "STAFF", actorUserId: user.id, action: "auth.login", entityType: "User", entityId: user.id, ip });
  return ok({ redirect: user.restaurant.onboardingCompletedAt ? "/dashboard" : "/onboarding" });
});
