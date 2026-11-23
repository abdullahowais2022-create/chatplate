import type { CartLine, ItemIssue, MenuItemSnap, MenuSnapshot, RawItem } from "./types";
import { bestMatch, suggestItems } from "./match";
import { round2 } from "./money";

const MAX_QTY = 50;

export const localName = (x: { name: string; nameI18n?: Record<string, string> }, lang?: string | null) =>
  (lang && x.nameI18n?.[lang]) || x.name;

function alternativesFor(menu: MenuSnapshot, item: MenuItemSnap): string[] {
  return menu.items
    .filter((i) => i.id !== item.id && i.categoryId === item.categoryId && i.isAvailable && !i.isSoldOut)
    .slice(0, 3)
    .map((i) => i.name);
}

export function findMenuItem(menu: MenuSnapshot, raw: { menu_item_id: string | null; name: string }): MenuItemSnap | null {
  if (raw.menu_item_id) {
    const byId = menu.items.find((i) => i.id === raw.menu_item_id);
    if (byId) return byId;
  }
  return bestMatch(menu.items, raw.name)?.item ?? null;
}

/**
 * Validates model-proposed items against the live menu. Prices are always taken from the menu, never
 * from the model. Unknown, sold-out and unavailable items are dropped and reported as issues;
 * items missing a required size are kept as `pending` lines so the next turn can fill them in.
 */
export function validateItems(menu: MenuSnapshot, rawItems: RawItem[], lang?: string | null): { lines: CartLine[]; issues: ItemIssue[] } {
  const lines: CartLine[] = [];
  const issues: ItemIssue[] = [];

  for (const raw of rawItems) {
    const qty = Math.round(Number(raw.quantity));
    if (!Number.isFinite(qty) || qty <= 0) continue; // zero = removed
    const item = findMenuItem(menu, raw);
    if (!item) {
      issues.push({ kind: "unknown_item", name: raw.name, suggestions: suggestItems(menu.items, raw.name) });
      continue;
    }
    const display = localName(item, lang);
    if (qty > MAX_QTY) {
      issues.push({ kind: "invalid_quantity", name: display });
      continue;
    }
    if (!item.isAvailable) {
      issues.push({ kind: "unavailable", name: display, alternatives: alternativesFor(menu, item) });
      continue;
    }
    if (item.isSoldOut) {
      issues.push({ kind: "sold_out", name: display, alternatives: alternativesFor(menu, item) });
      continue;
    }

    // Variant
    let variant = null as MenuItemSnap["variants"][number] | null;
    let pending: CartLine["pending"] = null;
    const availableVariants = item.variants.filter((v) => v.isAvailable);
    if (item.variants.length > 0) {
      if (raw.variant_id) variant = item.variants.find((v) => v.id === raw.variant_id) ?? null;
      if (!variant && raw.variant) variant = bestMatch(item.variants, raw.variant, 0.55)?.item ?? null;
      if (variant && !variant.isAvailable) {
        issues.push({ kind: "unknown_variant", name: display, requested: localName(variant, lang), options: availableVariants.map((v) => localName(v, lang)) });
        variant = null;
        pending = "variant";
      } else if (!variant && (raw.variant || raw.variant_id)) {
        issues.push({ kind: "unknown_variant", name: display, requested: raw.variant ?? "?", options: availableVariants.map((v) => localName(v, lang)) });
        pending = "variant";
      } else if (!variant) {
        const def = availableVariants.find((v) => v.isDefault) ?? (availableVariants.length === 1 ? availableVariants[0] : undefined);
        if (def) variant = def;
        else {
          pending = "variant";
          issues.push({ kind: "needs_variant", name: display, options: availableVariants.map((v) => localName(v, lang)) });
        }
      }
    }

    // Add-ons
    const addons: MenuItemSnap["addons"] = [];
    const wanted = [...new Set([...(raw.addon_ids ?? []), ...(raw.addons ?? [])])];
    for (const a of wanted) {
      const found = item.addons.find((x) => x.id === a) ?? bestMatch(item.addons, a, 0.55)?.item ?? null;
      if (!found || !found.isAvailable) {
        // Don't double-report when the model gave both an id and a name for the same add-on.
        if (found && addons.some((x) => x.id === found.id)) continue;
        if (!found && item.addons.some((x) => x.id === a)) continue;
        issues.push({ kind: "unknown_addon", name: display, requested: a, options: item.addons.filter((x) => x.isAvailable).map((x) => localName(x, lang)) });
        continue;
      }
      if (!addons.some((x) => x.id === found.id)) addons.push(found);
    }

    const base = pending ? 0 : (variant?.price ?? item.price);
    const unitPrice = pending ? 0 : round2(base + addons.reduce((s, a) => s + a.price, 0));
    lines.push({
      menuItemId: item.id,
      variantId: variant?.id ?? null,
      addonIds: addons.map((a) => a.id),
      removals: (raw.removals ?? []).map((r) => r.trim()).filter(Boolean).slice(0, 6),
      notes: raw.notes?.trim().slice(0, 200) || null,
      quantity: qty,
      name: item.name,
      variantName: variant?.name ?? null,
      addonNames: addons.map((a) => a.name),
      unitPrice,
      lineTotal: round2(unitPrice * qty),
      pending,
    });
  }
  return { lines: mergeLines(lines), issues };
}

const lineKey = (l: CartLine) =>
  [l.menuItemId, l.variantId ?? "", [...l.addonIds].sort().join(","), [...l.removals].sort().join(","), l.notes ?? "", l.pending ?? ""].join("|");

export function mergeLines(lines: CartLine[]): CartLine[] {
  const map = new Map<string, CartLine>();
  for (const l of lines) {
    const k = lineKey(l);
    const ex = map.get(k);
    if (ex) {
      ex.quantity += l.quantity;
      ex.lineTotal = round2(ex.unitPrice * ex.quantity);
    } else map.set(k, { ...l });
  }
  return [...map.values()];
}

/** Converts cart lines back to raw items, e.g. to re-validate a cart against the live menu at confirmation time. */
export const linesToRaw = (lines: CartLine[]): RawItem[] =>
  lines.map((l) => ({
    menu_item_id: l.menuItemId,
    name: l.name,
    quantity: l.quantity,
    variant_id: l.variantId,
    variant: l.variantName,
    addon_ids: l.addonIds,
    addons: [],
    removals: l.removals,
    notes: l.notes,
  }));

export const sameCart = (a: CartLine[], b: CartLine[]) =>
  a.length === b.length &&
  JSON.stringify(a.map((l) => [lineKey(l), l.quantity, l.unitPrice]).sort()) === JSON.stringify(b.map((l) => [lineKey(l), l.quantity, l.unitPrice]).sort());
