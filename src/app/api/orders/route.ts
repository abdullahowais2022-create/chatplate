import { route, ok } from "@/server/http";
import { requireApiSession } from "@/server/auth/session";
import { listOrders } from "@/server/services/queries";
import { ORDER_STATUSES } from "@/lib/schemas";

export const GET = route(async (req) => {
  const s = await requireApiSession("orders:read");
  const url = new URL(req.url);
  const raw = url.searchParams.get("status");
  const status = raw === "ACTIVE" ? "ACTIVE" : (ORDER_STATUSES as readonly string[]).includes(raw ?? "") ? (raw as (typeof ORDER_STATUSES)[number]) : undefined;
  return ok(await listOrders(s.restaurantId, { status, q: url.searchParams.get("q") ?? undefined }));
});
