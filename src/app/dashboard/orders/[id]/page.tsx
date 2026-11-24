import Link from "next/link";
import { ArrowLeft, MapPin, MessageSquare, Phone, User } from "lucide-react";
import { requirePageSession } from "@/server/auth/session";
import { getOrder, listTeam } from "@/server/services/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { OrderStatusBadge } from "@/components/status";
import { OrderActions } from "./order-actions";
import { PAYMENT_LABEL, STATUS_LABEL, languageName } from "@/lib/constants";
import { formatDateTime, money } from "@/lib/utils";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  return { title: `Order ${(await params).id.slice(-6)}` };
}

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const s = await requirePageSession("orders:read");
  const { id } = await params;
  const [o, team] = await Promise.all([getOrder(s.restaurantId, id), listTeam(s.restaurantId)]);
  const m = (n: number) => money(n, o.currency);

  return (
    <div className="mx-auto max-w-6xl">
      <Button variant="ghost" size="sm" asChild className="mb-3 -ml-2"><Link href="/dashboard/orders"><ArrowLeft /> All orders</Link></Button>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3"><h1 className="text-2xl font-bold">Order #{o.number}</h1><OrderStatusBadge status={o.status} /></div>
          <p className="mt-1 text-sm text-muted-foreground">Placed {formatDateTime(o.createdAt, o.restaurant.timezone)} via WhatsApp · {o.type === "DELIVERY" ? "Delivery" : "Pickup"} · {o.scheduledFor ? `Scheduled for ${formatDateTime(o.scheduledFor, o.restaurant.timezone)}` : "ASAP"}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <OrderActions order={{ id: o.id, status: o.status, nextStatuses: o.nextStatuses, assignedToId: o.assignedTo?.id ?? null, notes: o.notes, type: o.type }} team={team.filter((t) => t.isActive).map((t) => ({ id: t.id, name: t.name }))} />

          <Card>
            <CardHeader><CardTitle>Items</CardTitle></CardHeader>
            <CardContent>
              <ul className="divide-y">
                {o.items.map((i) => (
                  <li key={i.id} className="flex gap-3 py-3">
                    <span className="flex h-7 w-9 shrink-0 items-center justify-center rounded-md bg-muted text-sm font-bold text-foreground">{i.quantity}×</span>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{i.name}{i.variantName && <span className="text-muted-foreground"> · {i.variantName}</span>}</p>
                      {i.addons.length > 0 && <p className="text-sm text-emerald-700">+ {i.addons.join(", ")}</p>}
                      {i.removals.length > 0 && <p className="text-sm font-medium text-red-600">NO {i.removals.join(", ")}</p>}
                      {i.notes && <p className="text-sm italic text-muted-foreground">&ldquo;{i.notes}&rdquo;</p>}
                      <p className="text-xs text-muted-foreground">{m(i.unitPrice)} each</p>
                    </div>
                    <span className="font-medium">{m(i.lineTotal)}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-3 space-y-1 border-t pt-3 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{m(o.subtotal)}</span></div>
                {o.type === "DELIVERY" && <div className="flex justify-between"><span className="text-muted-foreground">Delivery fee{o.deliveryZone ? ` (${o.deliveryZone})` : ""}</span><span>{m(o.deliveryFee)}</span></div>}
                <div className="flex justify-between text-base font-bold"><span>Total</span><span>{m(o.total)}</span></div>
                <p className="pt-1 text-xs text-muted-foreground">Payment preference: <b>{PAYMENT_LABEL[o.paymentPreference]}</b>. Collected by your business, not online.</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle>Original WhatsApp messages</CardTitle>
              {o.conversationId && <Button variant="ghost" size="sm" asChild><Link href={`/dashboard/inbox?c=${o.conversationId}`}><MessageSquare /> Open chat</Link></Button>}
            </CardHeader>
            <CardContent>
              {o.messages.length === 0 ? <p className="text-sm text-muted-foreground">No messages linked to this order.</p> : (
                <div className="chat-bg max-h-96 space-y-2 overflow-y-auto rounded-lg p-3">
                  {o.messages.map((msg) => (
                    <div key={msg.id} className={msg.direction === "OUTBOUND" ? "flex justify-end" : "flex"}>
                      <p dir="auto" className={`max-w-[80%] whitespace-pre-wrap rounded-lg px-3 py-1.5 text-sm shadow-sm ${msg.direction === "OUTBOUND" ? "bubble-out" : "bg-white"}`}>{msg.body}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Customer</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="flex items-center gap-2"><User className="h-4 w-4 text-muted-foreground" /><Link className="font-medium hover:underline" href={`/dashboard/customers/${o.customer.id}`}>{o.customerName ?? "Customer"}</Link>{o.customer.tags.map((t) => <Badge key={t} variant="warning" className="text-[10px]">{t}</Badge>)}</p>
              <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" /><a href={`tel:${o.customer.phone}`} className="hover:underline">{o.customer.phone}</a></p>
              {o.type === "DELIVERY" && (
                <p className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <span>{o.deliveryAddress ?? "Location pin"}{o.deliveryLocation && <> · <a className="text-primary hover:underline" target="_blank" rel="noreferrer" href={`https://maps.google.com/?q=${o.deliveryLocation.lat},${o.deliveryLocation.lng}`}>Open map</a></>}</span>
                </p>
              )}
              <p className="text-muted-foreground">Language: {languageName(o.language)} · {o.customer.orderCount} orders total</p>
              {o.cancelReason && <p className="rounded-md bg-red-50 p-2 text-red-700">Cancelled: {o.cancelReason}</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Timeline</CardTitle></CardHeader>
            <CardContent>
              <ol className="relative space-y-4 border-l pl-4">
                {o.timeline.map((e) => (
                  <li key={e.id} className="text-sm">
                    <span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border-2 border-card bg-muted0" />
                    <p className="font-medium">
                      {e.type === "STATUS_CHANGED" ? `${STATUS_LABEL[e.fromStatus ?? ""] ?? e.fromStatus} → ${STATUS_LABEL[e.toStatus ?? ""] ?? e.toStatus}` : e.type === "CREATED" ? "Order placed" : e.type === "CANCELLED" ? "Cancelled" : e.type === "MODIFIED" ? "Order changed" : e.type === "ASSIGNED" ? "Assignment" : "Note"}
                    </p>
                    {e.message && <p className="text-muted-foreground">{e.message}</p>}
                    <p className="text-xs text-muted-foreground">{e.actorName ?? (e.actorType === "CUSTOMER" ? "Customer" : e.actorType === "AI" ? "AI assistant" : e.actorType.toLowerCase())} · {formatDateTime(e.createdAt, o.restaurant.timezone)}</p>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
