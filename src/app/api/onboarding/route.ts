import { z } from "zod";
import { route, ok, parseJson } from "@/server/http";
import { requireApiSession } from "@/server/auth/session";
import { db } from "@/server/db";
import { audit } from "@/server/audit";

const schema = z.object({ step: z.number().int().min(0).max(10), complete: z.boolean().default(false) });

export const PATCH = route(async (req) => {
  const s = await requireApiSession("settings:write");
  const { step, complete } = await parseJson(req, schema);
  await db.restaurant.update({ where: { id: s.restaurantId }, data: { onboardingStep: step, ...(complete ? { onboardingCompletedAt: new Date() } : {}) } });
  if (complete) await audit({ restaurantId: s.restaurantId, actorType: "STAFF", actorUserId: s.userId, action: "restaurant.onboarding_completed", entityType: "Restaurant", entityId: s.restaurantId });
  return ok({ step, complete });
});
