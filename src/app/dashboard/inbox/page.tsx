import { requirePageSession } from "@/server/auth/session";
import { listConversations } from "@/server/services/queries";
import { InboxView } from "./inbox-view";

export const metadata = { title: "Live inbox" };

type Search = Promise<{ c?: string; filter?: string; q?: string }>;

export default async function InboxPage({ searchParams }: { searchParams: Search }) {
  const s = await requirePageSession("inbox:read");
  const sp = await searchParams;
  const filter = (["all", "attention", "unread", "human"].includes(sp.filter ?? "") ? sp.filter : "all") as "all" | "attention" | "unread" | "human";
  const conversations = await listConversations(s.restaurantId, { filter, q: sp.q });
  return <InboxView conversations={conversations} selectedId={sp.c ?? null} filter={filter} q={sp.q ?? ""} />;
}
