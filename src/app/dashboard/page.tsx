import Link from "next/link";
import { ClipboardList, MessagesSquare } from "lucide-react";
import { requirePageSession } from "@/server/auth/session";
import { getAnalytics, listConversations } from "@/server/services/queries";
import { can } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader, Stat, EmptyState, Avatar } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { OrderStatusBadge } from "@/components/status";
import { STATUS_LABEL } from "@/lib/constants";
import { money, timeAgo } from "@/lib/utils";

export const metadata = { title: "Overview" };

const STATUS_ORDER = ["NEW", "CONFIRMED", "PREPARING", "READY", "OUT_FOR_DELIVERY", "COMPLETED", "CANCELLED"] as const;
const BAR: Record<string, string> = { NEW: "bg-brand", CONFIRMED: "bg-sky-500", PREPARING: "bg-amber-500", READY: "bg-emerald-500", OUT_FOR_DELIVERY: "bg-violet-500", COMPLETED: "bg-stone-400", CANCELLED: "bg-red-500" };

export default async function OverviewPage() {
  const s = await requirePageSession("overview:read");
  const [a, attention] = await Promise.all([getAnalytics(s.restaurantId, s.timezone), listConversations(s.restaurantId, { filter: "attention", take: 5 })]);
  const showRevenue = can(s.role, "analytics:revenue");
  const totalToday = Object.values(a.byStatus).reduce((x, y) => x + (y ?? 0), 0);
  const maxDay = Math.max(1, ...a.last7Days.map((d) => (showRevenue ? d.revenue : d.orders)));

  const today = new Intl.DateTimeFormat("en", { weekday: "long", day: "numeric", month: "long", timeZone: s.timezone }).format(new Date());

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title={`Good ${greeting(s.timezone)}, ${s.name.split(" ")[0]}`}
        description={today}
        actions={
          <>
            <Button variant="outline" asChild><Link href="/dashboard/orders">All orders</Link></Button>
            <Button asChild><Link href="/dashboard/inbox"><MessagesSquare /> Open inbox</Link></Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border bg-border lg:grid-cols-4 [&>*]:bg-card">
        <Stat label="Orders today" value={a.ordersToday} />
        {showRevenue ? <Stat label="Revenue today" value={money(a.revenueToday, s.currency)} hint="Cancelled orders excluded" /> : <Stat label="Active chats" value={a.activeConversations} />}
        {showRevenue ? <Stat label="Average order" value={money(a.averageOrderValue, s.currency)} /> : <Stat label="Live orders" value={a.activeOrders.length} />}
        <Stat label="Needs you" value={a.needsAttention} hint={`${a.activeConversations} chats in the last 24 h`} tone={a.needsAttention ? "warning" : "default"} />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="overflow-hidden lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle>Live orders</CardTitle>
            <Link href="/dashboard/orders" className="text-xs font-medium text-muted-foreground hover:text-foreground">View all</Link>
          </CardHeader>
          {a.activeOrders.length === 0 ? (
            <CardContent><EmptyState icon={ClipboardList} title="No live orders" description="Orders show up here as soon as a customer confirms on WhatsApp." /></CardContent>
          ) : (
            <table className="w-full table-fixed text-sm">
              <thead>
                <tr className="border-y bg-muted/40 text-left">
                  <th className="label-caps w-20 py-2 pl-4 pr-2 font-semibold">Order</th>
                  <th className="label-caps px-2 py-2 font-semibold">Customer</th>
                  <th className="label-caps hidden w-24 px-2 py-2 text-right font-semibold sm:table-cell">Total</th>
                  <th className="label-caps w-32 py-2 pl-2 pr-4 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {a.activeOrders.map((o) => (
                  <tr key={o.id} className="group relative hover:bg-muted/40">
                    <td className="num py-3 pl-4 pr-2 align-top font-medium">
                      <Link href={`/dashboard/orders/${o.id}`} className="after:absolute after:inset-0">{o.number}</Link>
                    </td>
                    <td className="px-2 py-3 align-top">
                      <p className="truncate font-medium">{o.customerName ?? "Customer"} <span className="font-normal text-muted-foreground">· {o.type === "DELIVERY" ? "Delivery" : "Pickup"} · {timeAgo(o.createdAt)}</span></p>
                      <p className="truncate text-xs text-muted-foreground">{o.itemsSummary}</p>
                    </td>
                    <td className="num hidden whitespace-nowrap px-2 py-3 text-right align-top sm:table-cell">{money(o.total, o.currency)}</td>
                    <td className="py-3 pl-2 pr-4 align-top"><OrderStatusBadge status={o.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle>Needs a person</CardTitle>
            <Link href="/dashboard/inbox?filter=attention" className="text-xs font-medium text-muted-foreground hover:text-foreground">Inbox</Link>
          </CardHeader>
          {attention.length === 0 ? (
            <CardContent><p className="py-6 text-center text-sm text-muted-foreground">Nothing waiting. The assistant is handling every chat.</p></CardContent>
          ) : (
            <ul className="divide-y border-t">
              {attention.map((c) => (
                <li key={c.id}>
                  <Link href={`/dashboard/inbox?c=${c.id}`} className="flex items-start gap-3 px-4 py-3 hover:bg-muted/40">
                    <Avatar name={c.customerName ?? c.phone} className="h-8 w-8" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="truncate text-sm font-medium">{c.customerName ?? c.phone}</p>
                        <span className="shrink-0 text-[11px] text-muted-foreground">{timeAgo(c.lastMessageAt)}</span>
                      </div>
                      <p className="flex items-center gap-1.5 truncate text-xs font-medium text-foreground"><span className="size-1.5 shrink-0 rounded-full bg-brand" />{c.needsHumanReason ?? "Needs attention"}</p>
                      <p className="truncate text-xs text-muted-foreground" dir="auto">{c.lastMessagePreview}</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle>Today by status</CardTitle></CardHeader>
          <CardContent>
            {totalToday === 0 ? (
              <p className="text-sm text-muted-foreground">No orders yet today.</p>
            ) : (
              <>
                <div className="flex h-2 overflow-hidden rounded-full bg-muted">
                  {STATUS_ORDER.filter((st) => a.byStatus[st]).map((st) => (
                    <div key={st} className={BAR[st]} style={{ width: `${((a.byStatus[st] ?? 0) / totalToday) * 100}%` }} />
                  ))}
                </div>
                <dl className="mt-4 space-y-2 text-sm">
                  {STATUS_ORDER.filter((st) => a.byStatus[st]).map((st) => (
                    <div key={st} className="flex items-center justify-between">
                      <dt className="flex items-center gap-2 text-muted-foreground"><span className={`size-2 rounded-sm ${BAR[st]}`} />{STATUS_LABEL[st]}</dt>
                      <dd className="num">{a.byStatus[st]}</dd>
                    </div>
                  ))}
                </dl>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle>Last 7 days</CardTitle>
            <span className="label-caps">{showRevenue ? `Revenue, ${s.currency}` : "Orders"}</span>
          </CardHeader>
          <CardContent>
            <div className="flex h-44 items-end gap-2 border-b sm:gap-3">
              {a.last7Days.map((d, i) => {
                const v = showRevenue ? d.revenue : d.orders;
                const isToday = i === a.last7Days.length - 1;
                return (
                  <div key={d.date} className="flex flex-1 flex-col items-center justify-end gap-1.5" title={`${d.orders} orders`}>
                    <span className="num text-[11px] text-muted-foreground">{showRevenue ? Math.round(v ?? 0) : v}</span>
                    <div className={`w-full max-w-12 rounded-t-sm ${isToday ? "bg-brand" : "bg-foreground/80"}`} style={{ height: `${Math.max(3, ((v ?? 0) / maxDay) * 120)}px` }} />
                  </div>
                );
              })}
            </div>
            <div className="mt-1.5 flex gap-2 sm:gap-3">
              {a.last7Days.map((d) => (
                <span key={d.date} className="flex-1 text-center text-[11px] text-muted-foreground">{new Intl.DateTimeFormat("en", { weekday: "short", timeZone: s.timezone }).format(new Date(d.date))}</span>
              ))}
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
