import Link from "next/link";
import { AlertTriangle, ArrowRight, ClipboardList, DollarSign, MessagesSquare, Receipt, ShoppingBag, UtensilsCrossed } from "lucide-react";
import { requirePageSession } from "@/server/auth/session";
import { getAnalytics, listConversations } from "@/server/services/queries";
import { can } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader, Stat, EmptyState, Avatar } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { OrderStatusBadge } from "@/components/status";
import { STATUS_LABEL } from "@/lib/constants";
import { money, timeAgo } from "@/lib/utils";

export const metadata = { title: "Overview" };

const STATUS_ORDER = ["NEW", "CONFIRMED", "PREPARING", "READY", "OUT_FOR_DELIVERY", "COMPLETED", "CANCELLED"] as const;
const BAR: Record<string, string> = { NEW: "bg-sky-500", CONFIRMED: "bg-violet-500", PREPARING: "bg-amber-500", READY: "bg-emerald-500", OUT_FOR_DELIVERY: "bg-brand-500", COMPLETED: "bg-stone-400", CANCELLED: "bg-red-400" };

export default async function OverviewPage() {
  const s = await requirePageSession("overview:read");
  const [a, attention] = await Promise.all([getAnalytics(s.restaurantId, s.timezone), listConversations(s.restaurantId, { filter: "attention", take: 5 })]);
  const showRevenue = can(s.role, "analytics:revenue");
  const totalToday = Object.values(a.byStatus).reduce((x, y) => x + (y ?? 0), 0);
  const maxDay = Math.max(1, ...a.last7Days.map((d) => (showRevenue ? d.revenue : d.orders)));

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title={`Good ${greeting(s.timezone)}, ${s.name.split(" ")[0]}`}
        description="Here's what's happening at your restaurant today."
        actions={
          <>
            <Button variant="outline" asChild><Link href="/dashboard/menu"><UtensilsCrossed /> Menu</Link></Button>
            <Button variant="outline" asChild><Link href="/dashboard/orders"><ClipboardList /> Orders</Link></Button>
            <Button asChild><Link href="/dashboard/inbox"><MessagesSquare /> Open inbox</Link></Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Orders today" value={a.ordersToday} icon={ShoppingBag} />
        {showRevenue ? <Stat label="Revenue today" value={money(a.revenueToday, s.currency)} hint="Excludes cancelled orders" icon={DollarSign} tone="success" /> : <Stat label="Active conversations" value={a.activeConversations} icon={MessagesSquare} />}
        {showRevenue ? <Stat label="Average order value" value={money(a.averageOrderValue, s.currency)} icon={Receipt} /> : <Stat label="Live orders" value={a.activeOrders.length} icon={ClipboardList} />}
        <Stat label="Need attention" value={a.needsAttention} hint={`${a.activeConversations} active conversations (24h)`} icon={AlertTriangle} tone={a.needsAttention ? "warning" : "default"} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Live orders</CardTitle>
            <Button variant="ghost" size="sm" asChild><Link href="/dashboard/orders">View all <ArrowRight /></Link></Button>
          </CardHeader>
          <CardContent>
            {a.activeOrders.length === 0 ? (
              <EmptyState icon={ClipboardList} title="No live orders right now" description="New WhatsApp orders appear here the moment a customer confirms." />
            ) : (
              <ul className="divide-y">
                {a.activeOrders.map((o) => (
                  <li key={o.id}>
                    <Link href={`/dashboard/orders/${o.id}`} className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-3 hover:bg-muted/60">
                      <div className="w-14 shrink-0 font-mono text-sm font-semibold">#{o.number}</div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{o.customerName ?? "Customer"} · <span className="text-muted-foreground">{o.type === "DELIVERY" ? "Delivery" : "Pickup"}</span></p>
                        <p className="truncate text-xs text-muted-foreground">{o.itemsSummary}</p>
                      </div>
                      <div className="hidden text-right text-sm font-medium sm:block">{money(o.total, o.currency)}<p className="text-xs font-normal text-muted-foreground">{timeAgo(o.createdAt)}</p></div>
                      <OrderStatusBadge status={o.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Needs a human</CardTitle>
            <Button variant="ghost" size="sm" asChild><Link href="/dashboard/inbox?filter=attention">Inbox <ArrowRight /></Link></Button>
          </CardHeader>
          <CardContent>
            {attention.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Nothing needs you right now. The AI is handling it. 🎉</p>
            ) : (
              <ul className="space-y-2">
                {attention.map((c) => (
                  <li key={c.id}>
                    <Link href={`/dashboard/inbox?c=${c.id}`} className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50/60 p-3 hover:bg-amber-50">
                      <Avatar name={c.customerName ?? c.phone} className="h-8 w-8" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{c.customerName ?? c.phone}</p>
                        <p className="truncate text-xs text-amber-800">{c.needsHumanReason ?? "Needs attention"}</p>
                        <p className="truncate text-xs text-muted-foreground">{c.lastMessagePreview}</p>
                      </div>
                      <span className="text-[11px] text-muted-foreground">{timeAgo(c.lastMessageAt)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Orders by status (today)</CardTitle></CardHeader>
          <CardContent className="space-y-2.5">
            {totalToday === 0 && <p className="text-sm text-muted-foreground">No orders yet today.</p>}
            {STATUS_ORDER.filter((st) => a.byStatus[st]).map((st) => (
              <div key={st}>
                <div className="mb-1 flex justify-between text-sm"><span>{STATUS_LABEL[st]}</span><span className="font-medium">{a.byStatus[st]}</span></div>
                <div className="h-2 rounded-full bg-muted"><div className={`h-2 rounded-full ${BAR[st]}`} style={{ width: `${((a.byStatus[st] ?? 0) / totalToday) * 100}%` }} /></div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Last 7 days</CardTitle>
            <Badge variant="secondary">{showRevenue ? "Revenue" : "Orders"}</Badge>
          </CardHeader>
          <CardContent>
            <div className="flex h-44 items-end gap-2 sm:gap-4">
              {a.last7Days.map((d) => {
                const v = showRevenue ? d.revenue : d.orders;
                return (
                  <div key={d.date} className="flex flex-1 flex-col items-center gap-1.5">
                    <span className="text-[11px] text-muted-foreground">{showRevenue ? money(v, s.currency).replace(/\.\d+$/, "") : v}</span>
                    <div className="w-full rounded-t-md bg-gradient-to-t from-brand-600 to-brand-400" style={{ height: `${Math.max(4, ((v ?? 0) / maxDay) * 120)}px` }} title={`${d.orders} orders`} />
                    <span className="text-xs text-muted-foreground">{new Intl.DateTimeFormat("en", { weekday: "short", timeZone: s.timezone }).format(new Date(d.date))}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function greeting(tz: string) {
  const h = Number(new Intl.DateTimeFormat("en-US", { hour: "numeric", hourCycle: "h23", timeZone: tz }).format(new Date()));
  return h < 12 ? "morning" : h < 18 ? "afternoon" : "evening";
}
