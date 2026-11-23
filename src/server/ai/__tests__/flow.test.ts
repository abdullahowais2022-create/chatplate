import { describe, expect, it } from "vitest";
import { ctx, restaurant } from "./fixtures";
import { heuristicExtract, detectLanguage } from "../heuristic";
import { chooseLanguage, decide, BUTTON, extractionFromButton } from "../flow";
import type { PipelineContext, InboundInput, Decision } from "../types";
import { validateItems } from "../validate";
import { isOpenAt, nextOpening } from "../hours";
import { matchZone } from "../zones";

function turn(c: PipelineContext, text: string, extra: Partial<InboundInput> = {}): Decision {
  const input: InboundInput = { text, ...extra };
  const raw = extra.buttonId ? extractionFromButton(extra.buttonId, c)! : heuristicExtract(c, text);
  return decide(c, raw, input, chooseLanguage(c, raw.language, text));
}

const next = (c: PipelineContext, d: Decision): PipelineContext => ({ ...c, state: d.state, draft: d.draft, editingOrderId: d.editingOrderId, clarificationAttempts: d.clarificationAttempts });

describe("validation", () => {
  it("prices from the menu, never from the model", () => {
    const { lines, issues } = validateItems(ctx().menu, [
      { menu_item_id: "i_pep", name: "Pepperoni", quantity: 2, variant_id: "v_pep_l", variant: null, addon_ids: ["a_cheese"], addons: [], removals: ["onions"], notes: null },
    ]);
    expect(issues).toEqual([]);
    expect(lines[0]).toMatchObject({ unitPrice: 17.5, lineTotal: 35, removals: ["onions"] });
  });

  it("rejects invented and sold-out items", () => {
    const { lines, issues } = validateItems(ctx().menu, [
      { menu_item_id: null, name: "Sushi platter", quantity: 1, variant_id: null, variant: null, addon_ids: [], addons: [], removals: [], notes: null },
      { menu_item_id: "i_truffle", name: "Truffle Burger", quantity: 1, variant_id: null, variant: null, addon_ids: [], addons: [], removals: [], notes: null },
      { menu_item_id: "does-not-exist", name: "Ghost", quantity: 1, variant_id: null, variant: null, addon_ids: [], addons: [], removals: [], notes: null },
    ]);
    expect(lines).toEqual([]);
    expect(issues.map((i) => i.kind)).toEqual(["unknown_item", "sold_out", "unknown_item"]);
  });

  it("keeps a pending line when a size is required", () => {
    const { lines, issues } = validateItems(ctx().menu, [
      { menu_item_id: "i_pep", name: "Pepperoni", quantity: 1, variant_id: null, variant: null, addon_ids: [], addons: [], removals: [], notes: null },
    ]);
    expect(lines[0]?.pending).toBe("variant");
    expect(issues[0]?.kind).toBe("needs_variant");
  });

  it("uses a default variant when one exists", () => {
    const { lines } = validateItems(ctx().menu, [
      { menu_item_id: "i_coke", name: "Coke", quantity: 1, variant_id: null, variant: null, addon_ids: [], addons: [], removals: [], notes: null },
    ]);
    expect(lines[0]).toMatchObject({ variantId: "v_coke_can", unitPrice: 2.5 });
  });

  it("rejects variant ids belonging to another item", () => {
    const { lines, issues } = validateItems(ctx().menu, [
      { menu_item_id: "i_marg", name: "Margherita", quantity: 1, variant_id: "v_pep_l", variant: null, addon_ids: [], addons: [], removals: [], notes: null },
    ]);
    expect(lines[0]?.pending).toBe("variant");
    expect(issues[0]?.kind).toBe("unknown_variant");
  });
});

describe("conversation flow (heuristic engine)", () => {
  it("takes an order end-to-end: items → type → name → summary → confirm", () => {
    let c = ctx();
    let d = turn(c, "I want 2 large pepperoni pizzas and a Coke");
    expect(d.action).toBe("ask");
    expect(d.draft.items).toHaveLength(2);
    expect(d.buttons?.map((b) => b.id)).toEqual([BUTTON.delivery, BUTTON.pickup]);

    c = next(c, d);
    d = turn(c, "", { buttonId: BUTTON.pickup });
    expect(d.draftReply).toMatch(/name/i);

    c = next(c, d);
    d = turn(c, "my name is Sara");
    expect(d.action).toBe("summary");
    expect(d.state).toBe("AWAITING_CONFIRMATION");
    expect(d.summaryBlock).toContain("$34.50");

    c = next(c, d);
    d = turn(c, "", { buttonId: BUTTON.confirm });
    expect(d.action).toBe("create_order");
    expect(d.orderEffect).toEqual({ type: "create" });
  });

  it("asks for size, then accepts the answer", () => {
    let c = ctx();
    let d = turn(c, "can I get a margherita");
    expect(d.draftReply).toMatch(/Small|Large/);
    c = next(c, d);
    d = turn(c, "large");
    expect(d.draft.items[0]).toMatchObject({ variantId: "v_marg_l", unitPrice: 14 });
  });

  it("removes items and changes quantities", () => {
    let c = ctx();
    let d = turn(c, "3 chicken burgers and fries");
    c = next(c, d);
    d = turn(c, "make it 4 chicken burgers instead");
    expect(d.draft.items.find((l) => l.menuItemId === "i_burger")?.quantity).toBe(4);
    c = next(c, d);
    d = turn(c, "remove the fries");
    expect(d.draft.items.map((l) => l.menuItemId)).toEqual(["i_burger"]);
  });

  it("refuses sold out items and suggests alternatives", () => {
    const d = turn(ctx(), "one truffle burger please");
    expect(d.action).toBe("ask");
    expect(d.draftReply).toMatch(/sold out/i);
    expect(d.draft.items).toHaveLength(0);
  });

  it("rejects delivery outside the zone and offers pickup", () => {
    let c = ctx();
    let d = turn(c, "2 chicken burgers for delivery");
    expect(d.requestLocation).toBe(true);
    c = next(c, d);
    d = turn(c, "", { location: { lat: 41.5, lng: -74.006 } });
    expect(d.draftReply).toMatch(/don't deliver/i);
    expect(d.buttons?.[0]?.id).toBe(BUTTON.pickup);
  });

  it("applies the zone fee for a pin inside the zone", () => {
    let c = ctx({ customer: { name: "Ali", savedAddress: null, savedLocation: null, preferredLanguage: null, phone: null } });
    const d0 = turn(c, "2 chicken burgers for delivery");
    c = next(c, d0);
    const d = turn(c, "", { location: { lat: 40.72, lng: -74.0 } });
    expect(d.action).toBe("summary");
    expect(d.draft.deliveryFee).toBe(3);
    expect(d.summaryBlock).toContain("$22.00");
  });

  it("confirms before cancelling an editable order", () => {
    const order = { id: "o1", number: 1042, status: "NEW", editable: true, type: "pickup" as const, items: [], total: 10, deliveryAddress: null, location: null, scheduledTime: null, customerName: "Sara", paymentPreference: null, createdAt: "" };
    let c = ctx({ editableOrder: order, latestOrder: order });
    let d = turn(c, "cancel my order");
    expect(d.action).toBe("confirm_cancel");
    c = next(c, d);
    d = turn(c, "", { buttonId: BUTTON.cancelYes });
    expect(d.orderEffect).toEqual({ type: "cancel", orderId: "o1" });
  });

  it("will not cancel an order that is already being prepared", () => {
    const order = { id: "o1", number: 1042, status: "PREPARING", editable: false, type: "pickup" as const, items: [], total: 10, deliveryAddress: null, location: null, scheduledTime: null, customerName: "Sara", paymentPreference: null, createdAt: "" };
    const d = turn(ctx({ latestOrder: order }), "cancel my order");
    expect(d.action).toBe("cannot_modify");
    expect(d.flagForStaff).toBeTruthy();
  });

  it("hands off to a human on request and on allergy keywords", () => {
    expect(turn(ctx(), "can I talk to a human").action).toBe("handoff");
    expect(turn(ctx(), "I have a nut allergy, is the pizza safe?").action).toBe("handoff");
  });

  it("answers opening hours without touching the cart", () => {
    const d = turn(ctx(), "What time do you open?");
    expect(d.action).toBe("answer");
    expect(d.draftReply).toMatch(/opening hours/i);
  });

  it("asks for a time when closed and pre-orders are allowed", () => {
    const hours = [{ dayOfWeek: 1, openTime: "11:00", closeTime: "14:00", isClosed: false }];
    const c = ctx({ restaurant: { ...restaurant, hours }, customer: { name: "Ali", savedAddress: null, savedLocation: null, preferredLanguage: null, phone: null } });
    const d = turn(c, "2 chicken burgers for pickup");
    expect(d.draftReply).toMatch(/closed/i);
  });

  it("refuses orders when closed without pre-orders", () => {
    const hours = [{ dayOfWeek: 1, openTime: "11:00", closeTime: "14:00", isClosed: false }];
    const c = ctx({ restaurant: { ...restaurant, hours, allowPreorders: false } });
    expect(turn(c, "2 chicken burgers").action).toBe("closed");
  });

  it("asks for payment preference only when enabled", () => {
    const c0 = ctx({ restaurant: { ...restaurant, askPaymentPreference: true, acceptedPaymentMethods: ["cash", "card_on_delivery", "card_at_pickup"] }, customer: { name: "Ali", savedAddress: null, savedLocation: null, preferredLanguage: null, phone: null } });
    const d = turn(c0, "2 chicken burgers for pickup");
    // "Card on delivery" makes no sense for pickup, so it isn't offered.
    expect(d.buttons?.map((b) => b.id)).toEqual(["cp:pay:cash", "cp:pay:card_at_pickup"]);
    const d2 = turn(ctx({ customer: c0.customer }), "2 chicken burgers for pickup");
    expect(d2.action).toBe("summary");
  });

  it("enforces the minimum order amount", () => {
    const c = ctx({ restaurant: { ...restaurant, minimumOrderAmount: 20 }, customer: { name: "Ali", savedAddress: null, savedLocation: null, preferredLanguage: null, phone: null } });
    const d = turn(c, "1 chicken burger for pickup");
    expect(d.draftReply).toMatch(/minimum order/i);
  });
});

describe("language", () => {
  it("detects common languages", () => {
    expect(detectLanguage("أريد بيتزا كبيرة")).toBe("ar");
    expect(detectLanguage("مجھے دو برگر چاہیے")).toBe("ur");
    expect(detectLanguage("मुझे दो बर्गर चाहिए")).toBe("hi");
    expect(detectLanguage("Je voudrais une pizza")).toBe("fr");
    expect(detectLanguage("Quiero dos hamburguesas por favor")).toBe("es");
    expect(detectLanguage("İki burger istiyorum")).toBe("tr");
    expect(detectLanguage("I want two burgers")).toBe("en");
  });

  it("keeps the conversation language for very short replies", () => {
    expect(chooseLanguage(ctx({ language: "fr" }), "en", "ok")).toBe("fr");
  });

  it("replies in French with French labels", () => {
    const d = turn(ctx(), "Je voudrais une pizza pepperoni grande");
    expect(d.draftReply).toMatch(/livraison/i);
  });
});

describe("hours & zones", () => {
  it("handles shifts that run past midnight", () => {
    const hours = [{ dayOfWeek: 5, openTime: "18:00", closeTime: "02:00", isClosed: false }];
    expect(isOpenAt(hours, "UTC", new Date("2026-11-28T01:00:00Z"))).toBe(true); // Sat 01:00
    expect(isOpenAt(hours, "UTC", new Date("2026-11-28T03:00:00Z"))).toBe(false);
  });

  it("computes the next opening in the restaurant timezone", () => {
    const hours = [{ dayOfWeek: 1, openTime: "11:00", closeTime: "22:00", isClosed: false }];
    const n = nextOpening(hours, "America/New_York", new Date("2026-11-23T12:00:00Z"));
    expect(n?.toISOString()).toBe("2026-11-23T16:00:00.000Z");
  });

  it("matches area zones by name", () => {
    const zones = [{ id: "a", name: "Old Town", type: "AREA" as const, radiusKm: null, areas: ["Old Town", "10115"], fee: 2, minimumOrder: null, estimatedMinutes: null }];
    expect(matchZone(zones, null, { address: "12 Baker street, old town" }).status).toBe("inside");
    expect(matchZone(zones, null, { address: "Somewhere else" }).status).toBe("outside");
  });
});
