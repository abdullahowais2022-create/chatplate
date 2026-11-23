import Link from "next/link";
import { ClipboardList, Search } from "lucide-react";
import { requirePageSession } from "@/server/auth/session";
import { listOrders } from "@/server/services/queries";
import { ORDER_STATUSES } from "@/lib/schemas";
import { STATUS_LABEL, PAYMENT_LABEL } from "@/lib/constants";
import { PageHeader, EmptyState } from "@/components/ui/misc";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { OrderStatusBadge } from "@/components/status";
import { cn, money, timeAgo, formatDateTime } from "@/lib/utils";

export const metadata = { title: "Orders" };

const TABS = [{ id: "ACTIVE", label: "Active" }, ...ORDER_STATUSES.map((s) => ({ id: s, label: STATUS_LABEL[s] })), { id: "ALL", label: "All" }];

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  const s = await requirePageSession("orders:read");
  const sp = await searchParams;
  const tab = TABS.some((t) => t.id === sp.status) ? sp.status! : "ACTIVE";
  const orders = await listOrders(s.restaurantId, { status: tab === "ALL" ? undefined : (tab as "ACTIVE"), q: sp.q, take: 200 });

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="Orders" description="Every order confirmed by a customer on WhatsApp. Update the status and the customer is notified automatically." />
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex gap-1 overflow-x-auto rounded-lg bg-muted p-1 scrollbar-thin">
          {TABS.map((t) => (
            <Link key={t.id} href={`/dashboard/orders?status=${t.id}${sp.q ? `&q=${encodeURIComponent(sp.q)}` : ""}`} className={cn("whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium", tab === t.id ? "bg-card shadow" : "text-muted-foreground hover:text-foreground")}>
              {t.label}
            </Link>
          ))}
        </div>
        <form className="relative w-full lg:w-72">
          <input type="hidden" name="status" value={tab} />
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input name="q" defaultValue={sp.q} placeholder="Order # or customer name" className="pl-9" />
        </form>
      </div>

      {orders.length === 0 ? (
        <EmptyState icon={ClipboardList} title={tab === "ACTIVE" ? "No active orders" : "No orders here"} description="Orders appear here as soon as a customer confirms on WhatsApp. Try the AI playground to place a test order." />
      ) : (
        <>
          {/* Mobile cards */}
          <div className="space-y-2 md:hidden">
            {orders.map((o) => (
              <Link key={o.id} href={`/dashboard/orders/${o.id}`} className="block rounded-xl border bg-card p-3 shadow-sm">
                <div className="flex items-center justify-between"><span className="font-mono font-semibold">#{o.number}</span><OrderStatusBadge status={o.status} /></div>
                <p className="mt-1 text-sm font-medium">{o.customerName ?? "Customer"} · {o.type === "DELIVERY" ? "Delivery" : "Pickup"}</p>
                <p className="truncate text-xs text-muted-foreground">{o.itemsSummary}</p>
                <div className="mt-1 flex justify-between text-xs text-muted-foreground"><span>{timeAgo(o.createdAt)}</span><span className="font-semibold text-foreground">{money(o.total, o.currency)}</span></div>
              </Link>
            ))}
          </div>
          {/* Desktop table */}
          <Card className="hidden overflow-hidden md:block">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr><th className="px-4 py-3">Order</th><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Items</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Payment</th><th className="px-4 py-3">Assigned</th><th className="px-4 py-3 text-right">Total</th><th className="px-4 py-3">Status</th></tr>
              </thead>
              <tbody className="divide-y">
                {orders.map((o) => (
                  <tr key={o.id} className="group relative hover:bg-muted/40">
                    <td className="px-4 py-3"><Link href={`/dashboard/orders/${o.id}`} className="font-mono font-semibold after:absolute after:inset-0">#{o.number}</Link><p className="text-xs text-muted-foreground" title={formatDateTime(o.createdAt, s.timezone)}>{timeAgo(o.createdAt)}</p></td>
                    <td className="px-4 py-3 font-medium">{o.customerName ?? "—"}</td>
                    <td className="max-w-xs px-4 py-3"><p className="truncate text-muted-foreground">{o.itemsSummary}</p></td>
                    <td className="px-4 py-3">{o.type === "DELIVERY" ? "🛵 Delivery" : "🏪 Pickup"}{o.scheduledFor && <p className="text-xs text-muted-foreground">for {formatDateTime(o.scheduledFor, s.timezone)}</p>}</td>
                    <td className="px-4 py-3 text-muted-foreground">{PAYMENT_LABEL[o.paymentPreference]}</td>
                    <td className="px-4 py-3 text-muted-foreground">{o.assignedTo?.name ?? "—"}</td>
                    <td className="px-4 py-3 text-right font-semibold">{money(o.total, o.currency)}</td>
                    <td className="px-4 py-3"><OrderStatusBadge status={o.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </div>
  );
}
