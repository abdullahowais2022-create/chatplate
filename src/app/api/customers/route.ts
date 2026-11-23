import { route, ok } from "@/server/http";
import { requireApiSession } from "@/server/auth/session";
import { listCustomers } from "@/server/services/queries";
import { CUSTOMER_TAGS } from "@/lib/schemas";

export const GET = route(async (req) => {
  const s = await requireApiSession("customers:read");
  const url = new URL(req.url);
  const tag = url.searchParams.get("tag");
  return ok(await listCustomers(s.restaurantId, { q: url.searchParams.get("q") ?? undefined, tag: (CUSTOMER_TAGS as readonly string[]).includes(tag ?? "") ? (tag as (typeof CUSTOMER_TAGS)[number]) : undefined }));
});
