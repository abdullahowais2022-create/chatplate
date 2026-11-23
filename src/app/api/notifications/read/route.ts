import { z } from "zod";
import { route, ok, parseJson } from "@/server/http";
import { requireApiSession } from "@/server/auth/session";
import { db } from "@/server/db";

const schema = z.object({ ids: z.array(z.string()).max(100).optional() });

export const POST = route(async (req) => {
  const s = await requireApiSession();
  const { ids } = await parseJson(req, schema);
  await db.notification.updateMany({ where: { restaurantId: s.restaurantId, readAt: null, ...(ids ? { id: { in: ids } } : {}) }, data: { readAt: new Date() } });
  return ok({ read: true });
});
