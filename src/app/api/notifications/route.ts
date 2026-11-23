import { route, ok } from "@/server/http";
import { requireApiSession } from "@/server/auth/session";
import { listNotifications } from "@/server/services/queries";

export const GET = route(async () => {
  const s = await requireApiSession();
  return ok(await listNotifications(s.restaurantId));
});
