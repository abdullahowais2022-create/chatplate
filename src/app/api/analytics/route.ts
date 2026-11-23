import { route, ok } from "@/server/http";
import { requireApiSession } from "@/server/auth/session";
import { getAnalytics } from "@/server/services/queries";
import { can } from "@/lib/permissions";

export const GET = route(async () => {
  const s = await requireApiSession("overview:read");
  const a = await getAnalytics(s.restaurantId, s.timezone);
  if (!can(s.role, "analytics:revenue")) return ok({ ...a, revenueToday: null, averageOrderValue: null, last7Days: a.last7Days.map((d) => ({ ...d, revenue: null })) });
  return ok(a);
});
