import { route, ok, parseJson, clientIp } from "@/server/http";
import { requireApiSession } from "@/server/auth/session";
import { menuItemSchema } from "@/lib/schemas";
import { saveMenuItem } from "@/server/services/menu";

export const POST = route(async (req) => {
  const s = await requireApiSession("menu:write");
  const data = await parseJson(req, menuItemSchema);
  return ok(await saveMenuItem(s.restaurantId, null, data, { userId: s.userId, ip: clientIp(req) }), { status: 201 });
});
