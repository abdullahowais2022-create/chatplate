import { route, ok, notFound, clientIp } from "@/server/http";
import { isDemoMode } from "@/server/env";
import { db } from "@/server/db";
import { createSession } from "@/server/auth/session";
import { enforceRateLimit } from "@/server/ratelimit";
import { DEMO_EMAIL } from "@/lib/constants";



export const POST = route(async (req) => {
  if (!isDemoMode()) throw notFound();
  await enforceRateLimit("demo", clientIp(req), 20, "1 h");
  const user = await db.user.findUnique({ where: { email: DEMO_EMAIL } });
  if (!user) throw notFound("The demo restaurant hasn't been seeded. Run `npm run db:seed`.");
  await createSession(user.id, { ip: clientIp(req), userAgent: req.headers.get("user-agent") ?? undefined });
  return ok({ redirect: "/dashboard" });
});
