import { route } from "@/server/http";
import { requireApiSession } from "@/server/auth/session";
import { getOrder } from "@/server/services/queries";
import { formatMoney } from "@/server/ai/money";
import { PAYMENT_LABEL, STATUS_LABEL } from "@/lib/constants";

type Ctx = { params: Promise<{ id: string }> };

/** Plain-text kitchen ticket (download). The printable HTML version lives at /print/orders/[id]. */
export const GET = route<Ctx>(async (_req, { params }) => {
  const s = await requireApiSession("orders:read");
  const o = await getOrder(s.restaurantId, (await params).id);
  const m = (n: number) => formatMoney(n, o.currency);
  const fmt = (iso: string) => new Intl.DateTimeFormat("en", { timeZone: o.restaurant.timezone, dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
  const lines = [
    o.restaurant.name,
    `ORDER #${o.number} · ${o.type === "DELIVERY" ? "DELIVERY" : "PICKUP"}`,
    `Placed: ${fmt(o.createdAt)}`,
    `When: ${o.scheduledFor ? fmt(o.scheduledFor) : "ASAP"}`,
    `Status: ${STATUS_LABEL[o.status]}`,
    "----------------------------------------",
    ...o.items.flatMap((i) => [
      `${i.quantity} x ${i.name}${i.variantName ? ` (${i.variantName})` : ""}   ${m(i.lineTotal)}`,
      ...i.addons.map((a) => `    + ${a}`),
      ...i.removals.map((r) => `    - NO ${r}`),
      ...(i.notes ? [`    * ${i.notes}`] : []),
    ]),
    "----------------------------------------",
    `Subtotal: ${m(o.subtotal)}`,
    ...(o.type === "DELIVERY" ? [`Delivery: ${m(o.deliveryFee)}`] : []),
    `TOTAL: ${m(o.total)}`,
    `Payment: ${PAYMENT_LABEL[o.paymentPreference]} (collected by the business)`,
    "----------------------------------------",
    `Customer: ${o.customerName ?? "—"}  ${o.customer.phone}`,
    ...(o.type === "DELIVERY" ? [`Address: ${o.deliveryAddress ?? (o.deliveryLocation ? `pin ${o.deliveryLocation.lat},${o.deliveryLocation.lng}` : "—")}`] : []),
    ...(o.notes ? [`Notes: ${o.notes}`] : []),
  ];
  return new Response(lines.join("\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Content-Disposition": `attachment; filename="order-${o.number}.txt"`, "Cache-Control": "no-store" },
  });
});
