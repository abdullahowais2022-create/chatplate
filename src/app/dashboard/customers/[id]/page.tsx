import Link from "next/link";
import { ArrowLeft, MessageSquare } from "lucide-react";
import { requirePageSession } from "@/server/auth/session";
import { getCustomer } from "@/server/services/queries";
import { can } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, Stat } from "@/components/ui/misc";
import { OrderStatusBadge } from "@/components/status";
import { CustomerEditor } from "./customer-editor";
import { formatDateTime, money } from "@/lib/utils";

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const s = await requirePageSession("customers:read");
  const c = await getCustomer(s.restaurantId, (await params).id);
  const aov = c.orderCount ? c.totalSpent / c.orderCount : 0;
  return (
    <div className="mx-auto max-w-5xl">
      <Button variant="ghost" size="sm" asChild className="mb-3 -ml-2"><Link href="/dashboard/customers"><ArrowLeft /> Customers</Link></Button>
      <div className="mb-6 flex items-center gap-4">
        <Avatar name={c.name ?? c.phone} className="h-14 w-14 text-base" />
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{c.name ?? c.profileName ?? "Unknown customer"}</h1>
          <p className="text-sm text-muted-foreground">{c.phone}{c.profileName && c.name !== c.profileName ? ` · WhatsApp name: ${c.profileName}` : ""} · Customer since {formatDateTime(c.createdAt, s.timezone)}</p>
        </div>
        {c.conversationId && <Button asChild><Link href={`/dashboard/inbox?c=${c.conversationId}`}><MessageSquare /> Open chat</Link></Button>}
      </div>
      <div className="mb-6 grid grid-cols-3 gap-3">
        <Stat label="Orders" value={c.orderCount} />
        <Stat label="Total spent" value={money(c.totalSpent, s.currency)} />
        <Stat label="Average order" value={money(aov, s.currency)} />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <CustomerEditor customer={{ id: c.id, name: c.name, tags: c.tags, notes: c.notes, savedAddress: c.savedAddress, preferredLanguage: c.preferredLanguage }} canEdit={can(s.role, "customers:write")} />
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Order history</CardTitle></CardHeader>
          <CardContent>
            {c.orders.length === 0 ? <p className="text-sm text-muted-foreground">No orders yet.</p> : (
              <ul className="divide-y">
                {c.orders.map((o) => (
                  <li key={o.id}>
                    <Link href={`/dashboard/orders/${o.id}`} className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-2.5 hover:bg-muted/50">
                      <span className="w-14 font-mono text-sm font-semibold">#{o.number}</span>
                      <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">{o.itemsSummary}</span>
                      <span className="hidden text-xs text-muted-foreground sm:block">{formatDateTime(o.createdAt, s.timezone)}</span>
                      <span className="text-sm font-medium">{money(o.total, o.currency)}</span>
                      <OrderStatusBadge status={o.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
