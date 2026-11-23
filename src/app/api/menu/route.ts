import { route, ok } from "@/server/http";
import { requireApiSession } from "@/server/auth/session";
import { getMenu } from "@/server/services/queries";

export const GET = route(async () => {
  const s = await requireApiSession("menu:read");
  return ok(await getMenu(s.restaurantId));
});
