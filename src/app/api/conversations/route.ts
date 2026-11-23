import { route, ok } from "@/server/http";
import { requireApiSession } from "@/server/auth/session";
import { listConversations } from "@/server/services/queries";

export const GET = route(async (req) => {
  const s = await requireApiSession("inbox:read");
  const url = new URL(req.url);
  const filter = (url.searchParams.get("filter") ?? "all") as "all" | "attention" | "unread" | "human";
  return ok(await listConversations(s.restaurantId, { filter, q: url.searchParams.get("q") ?? undefined }));
});
