import { route, ok, parseJson, clientIp } from "@/server/http";
import { requireApiSession } from "@/server/auth/session";
import { categorySchema } from "@/lib/schemas";
import { createCategory } from "@/server/services/menu";

export const POST = route(async (req) => {
  const s = await requireApiSession("menu:write");
  const data = await parseJson(req, categorySchema);
  return ok(await createCategory(s.restaurantId, data, { userId: s.userId, ip: clientIp(req) }), { status: 201 });
});
