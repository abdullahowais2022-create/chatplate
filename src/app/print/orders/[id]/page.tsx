import { requirePageSession } from "@/server/auth/session";
import { getOrder } from "@/server/services/queries";
import { PAYMENT_LABEL } from "@/lib/constants";
import { formatDateTime, money } from "@/lib/utils";
import { PrintButton } from "./print-button";

export const metadata = { title: "Print ticket" };

/** 80mm thermal-printer friendly kitchen ticket. */
export default async function PrintOrder({ params }: { params: Promise<{ id: string }> }) {
  const s = await requirePageSession("orders:read");
  const o = await getOrder(s.restaurantId, (await params).id);
  const m = (n: number) => money(n, o.currency);
  return (
    <div className="mx-auto w-[80mm] bg-[#fff] p-3 font-mono text-[13px] leading-snug text-black">
      <PrintButton />
      <p className="text-center text-base font-bold">{o.restaurant.name}</p>
      {o.restaurant.address && <p className="text-center text-xs">{o.restaurant.address}</p>}
      <hr className="my-2 border-dashed border-black" />
      <p className="text-center text-2xl font-bold">#{o.number}</p>
      <p className="text-center text-lg font-bold">{o.type === "DELIVERY" ? "DELIVERY" : "PICKUP"}</p>
      <p className="text-center text-xs">{formatDateTime(o.createdAt, o.restaurant.timezone)}</p>
      <p className="text-center font-bold">{o.scheduledFor ? `FOR ${formatDateTime(o.scheduledFor, o.restaurant.timezone)}` : "ASAP"}</p>
      <hr className="my-2 border-dashed border-black" />
      {o.items.map((i) => (
        <div key={i.id} className="mb-1.5">
          <div className="flex justify-between font-bold"><span>{i.quantity} × {i.name}{i.variantName ? ` (${i.variantName})` : ""}</span><span>{m(i.lineTotal)}</span></div>
          {i.addons.map((a) => <p key={a} className="pl-3">+ {a}</p>)}
          {i.removals.map((r) => <p key={r} className="pl-3 font-bold">NO {r.toUpperCase()}</p>)}
          {i.notes && <p className="pl-3 italic">* {i.notes}</p>}
        </div>
      ))}
      <hr className="my-2 border-dashed border-black" />
      <div className="flex justify-between"><span>Subtotal</span><span>{m(o.subtotal)}</span></div>
      {o.type === "DELIVERY" && <div className="flex justify-between"><span>Delivery</span><span>{m(o.deliveryFee)}</span></div>}
      <div className="flex justify-between text-base font-bold"><span>TOTAL</span><span>{m(o.total)}</span></div>
      <p className="mt-1">Pay: {PAYMENT_LABEL[o.paymentPreference]}</p>
      <hr className="my-2 border-dashed border-black" />
      <p className="font-bold">{o.customerName ?? "Customer"}</p>
      <p>{o.customer.phone}</p>
      {o.type === "DELIVERY" && <p>{o.deliveryAddress ?? (o.deliveryLocation ? `Pin: ${o.deliveryLocation.lat.toFixed(5)}, ${o.deliveryLocation.lng.toFixed(5)}` : "")}</p>}
      {o.notes && <p className="mt-1">Note: {o.notes}</p>}
    </div>
  );
}
