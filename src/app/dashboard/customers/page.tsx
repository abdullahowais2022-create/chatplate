import Link from "next/link";
import { Search, Users } from "lucide-react";
import { requirePageSession } from "@/server/auth/session";
import { listCustomers } from "@/server/services/queries";
import { PageHeader, EmptyState, Avatar } from "@/components/ui/misc";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { languageName } from "@/lib/constants";
import { CUSTOMER_TAGS } from "@/lib/schemas";
import { cn, money, timeAgo } from "@/lib/utils";

export const metadata = { title: "Customers" };

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string; tag?: string }> }) {
  const s = await requirePageSession("customers:read");
  const sp = await searchParams;
  const tag = (CUSTOMER_TAGS as readonly string[]).includes(sp.tag ?? "") ? (sp.tag as (typeof CUSTOMER_TAGS)[number]) : undefined;
  const customers = await listCustomers(s.restaurantId, { q: sp.q, tag });
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Customers" description="Everyone who has messaged your WhatsApp number. Profiles are created automatically." />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1">
          {[undefined, ...CUSTOMER_TAGS].map((t) => (
            <Link key={t ?? "all"} href={`/dashboard/customers${t ? `?tag=${t}` : ""}`} className={cn("rounded-full px-3 py-1 text-xs font-medium", tag === t ? "bg-ink text-white" : "bg-muted text-muted-foreground")}>{t ? t.charAt(0) + t.slice(1).toLowerCase() : "All"}</Link>
          ))}
        </div>
        <form className="relative sm:w-72">
          {tag && <input type="hidden" name="tag" value={tag} />}
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input name="q" defaultValue={sp.q} placeholder="Name or last 4 digits" className="pl-9" />
        </form>
      </div>
      {customers.length === 0 ? <EmptyState icon={Users} title="No customers yet" description="Customers appear here after their first WhatsApp message." /> : (
        <Card className="divide-y">
          {customers.map((c) => (
            <Link key={c.id} href={`/dashboard/customers/${c.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40">
              <Avatar name={c.name ?? c.phone} />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 font-medium">{c.name ?? "Unknown"} {c.tags.map((t) => <Badge key={t} variant={t === "BLOCKED" ? "danger" : t === "VIP" ? "warning" : "secondary"} className="text-[10px]">{t}</Badge>)}</p>
                <p className="text-xs text-muted-foreground">{c.phone} · {languageName(c.preferredLanguage)}</p>
              </div>
              <div className="hidden text-right text-sm sm:block"><p className="font-medium">{c.orderCount} orders</p><p className="text-xs text-muted-foreground">{money(c.totalSpent, s.currency)} total</p></div>
              <div className="hidden w-24 text-right text-xs text-muted-foreground md:block">{c.lastMessageAt ? timeAgo(c.lastMessageAt) : "—"}</div>
            </Link>
          ))}
        </Card>
      )}
    </div>
  );
}
