import type { CartLine, DraftOrder, MenuSnapshot, RestaurantFacts } from "./types";
import { formatMoney, round2 } from "./money";
import { t } from "./i18n";
import { localName } from "./validate";
import { formatLocalTime } from "./hours";

export function computeTotals(draft: Pick<DraftOrder, "items" | "orderType" | "deliveryFee">) {
  const subtotal = round2(draft.items.filter((l) => !l.pending).reduce((s, l) => s + l.lineTotal, 0));
  const deliveryFee = draft.orderType === "delivery" ? round2(draft.deliveryFee) : 0;
  return { subtotal, deliveryFee, total: round2(subtotal + deliveryFee) };
}

export function lineLabel(line: CartLine, menu: MenuSnapshot, lang: string): string {
  const item = menu.items.find((i) => i.id === line.menuItemId);
  const name = item ? localName(item, lang) : line.name;
  const variant = item?.variants.find((v) => v.id === line.variantId);
  const addons = line.addonIds.map((id) => item?.addons.find((a) => a.id === id)).filter(Boolean).map((a) => localName(a!, lang));
  let s = `${line.quantity}× ${name}`;
  if (variant) s += ` (${localName(variant, lang)})`;
  if (addons.length) s += ` + ${addons.join(", ")}`;
  if (line.removals.length) s += ` — ${t(lang, "without")} ${line.removals.join(", ")}`;
  if (line.notes) s += ` — "${line.notes}"`;
  return s;
}

/** Deterministic order summary: every number here comes from the database. */
export function renderSummary(draft: DraftOrder, menu: MenuSnapshot, restaurant: RestaurantFacts, lang: string, customerName?: string | null): string {
  const money = (n: number) => formatMoney(n, restaurant.currency, lang);
  const { subtotal, deliveryFee, total } = computeTotals(draft);
  const lines = draft.items.filter((l) => !l.pending).map((l) => `• ${lineLabel(l, menu, lang)} — ${money(l.lineTotal)}`);
  const out = [`*${t(lang, "orderSummary")}*`, ...lines, "", `${t(lang, "subtotal")}: ${money(subtotal)}`];
  if (draft.orderType === "delivery") out.push(`${t(lang, "deliveryFee")}: ${money(deliveryFee)}`);
  out.push(`*${t(lang, "total")}: ${money(total)}*`, "");
  if (draft.orderType === "delivery") {
    out.push(`🛵 ${t(lang, "delivery")}: ${draft.deliveryAddress ?? (draft.location ? t(lang, "locationPin") : "—")}`);
  } else if (draft.orderType === "pickup") {
    out.push(`🏪 ${t(lang, "pickup")}${restaurant.address ? `: ${restaurant.address}` : ""}`);
  }
  out.push(`🕐 ${t(lang, "time")}: ${draft.scheduledTime ? formatLocalTime(new Date(draft.scheduledTime), restaurant.timezone, lang) : t(lang, "asap")}`);
  const name = draft.customerName ?? customerName;
  if (name) out.push(`👤 ${t(lang, "name")}: ${name}`);
  if (draft.paymentPreference && draft.paymentPreference !== "unknown") out.push(`💵 ${t(lang, "payment")}: ${t(lang, `pay.${draft.paymentPreference}`)}`);
  return out.join("\n");
}

export function renderMenu(menu: MenuSnapshot, restaurant: RestaurantFacts, lang: string): string {
  const money = (n: number) => formatMoney(n, restaurant.currency, lang);
  const parts: string[] = [];
  for (const c of menu.categories) {
    const items = menu.items.filter((i) => i.categoryId === c.id && i.isAvailable);
    if (!items.length) continue;
    parts.push(`*${localName(c, lang)}*`);
    for (const i of items) {
      const price = i.variants.length
        ? i.variants.filter((v) => v.isAvailable).map((v) => `${localName(v, lang)} ${money(v.price)}`).join(" / ")
        : money(i.price);
      parts.push(`• ${localName(i, lang)} — ${price}${i.isSoldOut ? " (sold out)" : ""}`);
    }
    parts.push("");
  }
  return parts.join("\n").trim();
}
