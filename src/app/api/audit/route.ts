import { route, ok } from "@/server/http";
import { requireApiSession } from "@/server/auth/session";
import { listAudit } from "@/server/services/queries";

export const GET = route(async () => {
  const s = await requireApiSession("audit:read");
  return ok(await listAudit(s.restaurantId));
});
