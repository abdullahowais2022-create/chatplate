import { route, ok, parseJson, clientIp } from "@/server/http";
import { signupSchema } from "@/lib/schemas";
import { passwordSchema } from "@/server/auth/password";
import { enforceRateLimit } from "@/server/ratelimit";
import { createRestaurantWithOwner } from "@/server/services/restaurants";
import { createSession } from "@/server/auth/session";
import { audit } from "@/server/audit";

export const POST = route(async (req) => {
  const ip = clientIp(req);
  await enforceRateLimit("signup", ip, 5, "1 h");
  const input = await parseJson(req, signupSchema);
  passwordSchema.parse(input.password);
  const { restaurant, user } = await createRestaurantWithOwner(input);
  await createSession(user.id, { ip, userAgent: req.headers.get("user-agent") ?? undefined });
  await audit({ restaurantId: restaurant.id, actorType: "STAFF", actorUserId: user.id, action: "restaurant.created", entityType: "Restaurant", entityId: restaurant.id, ip });
  return ok({ redirect: "/onboarding" }, { status: 201 });
});
