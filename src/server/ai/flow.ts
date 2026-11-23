// Deterministic conversation policy. Given a (possibly AI-produced) extraction, decides what happens next.
// All facts the reply may mention (prices, hours, zones, availability) are produced here from real data.

import type { Decision, DraftOrder, InboundInput, ItemIssue, PaymentValue, PipelineContext, RawExtraction } from "./types";
import { emptyDraft } from "./types";
import { t } from "./i18n";
import { checkScheduledTime, describeHours, formatLocalTime, isOpenAt, nextOpening } from "./hours";
import { matchZone } from "./zones";
import { linesToRaw, localName, sameCart, validateItems } from "./validate";
import { computeTotals, renderMenu, renderSummary } from "./summary";
import { formatMoney } from "./money";
import { normalize } from "./match";

export const BUTTON = {
  confirm: "cp:confirm",
  edit: "cp:edit",
  human: "cp:human",
  delivery: "cp:type:delivery",
  pickup: "cp:type:pickup",
  cancelYes: "cp:cancel_yes",
  cancelNo: "cp:cancel_no",
  payPrefix: "cp:pay:",
} as const;

const PAYMENT_VALUES: PaymentValue[] = ["cash", "card_on_delivery", "card_at_pickup", "bank_transfer", "pay_at_restaurant"];

/** Maps a tapped WhatsApp button to an extraction without calling the model. */
export function extractionFromButton(buttonId: string, ctx: PipelineContext): RawExtraction | null {
  const base: RawExtraction = {
    intent: "other",
    language: ctx.language ?? ctx.restaurant.defaultLanguage,
    confirmation: "none",
    wants_human: false,
    spam_or_abuse: false,
    cart_changed: false,
    items: linesToRaw(ctx.draft.items),
    order_type: "unknown",
    delivery_address: null,
    scheduled_time: null,
    customer_name: null,
    payment_preference: "unknown",
    question_topics: [],
    confidence: 1,
    missing_information: [],
    requires_human: false,
    requires_human_reason: null,
  };
  if (buttonId === BUTTON.confirm || buttonId === BUTTON.cancelYes) return { ...base, confirmation: "confirm" };
  if (buttonId === BUTTON.edit || buttonId === BUTTON.cancelNo) return { ...base, confirmation: "reject" };
  if (buttonId === BUTTON.human) return { ...base, wants_human: true };
  if (buttonId === BUTTON.delivery) return { ...base, intent: "new_order", order_type: "delivery" };
  if (buttonId === BUTTON.pickup) return { ...base, intent: "new_order", order_type: "pickup" };
  if (buttonId.startsWith(BUTTON.payPrefix)) {
    const v = buttonId.slice(BUTTON.payPrefix.length) as PaymentValue;
    if (PAYMENT_VALUES.includes(v)) return { ...base, intent: "new_order", payment_preference: v };
  }
  return null;
}

export function chooseLanguage(ctx: PipelineContext, detected: string | null | undefined, text: string | null): string {
  const r = ctx.restaurant;
  let lang = (detected ?? "").toLowerCase().split(/[-_]/)[0] || "";
  const wordCount = (text ?? "").trim().split(/\s+/).filter(Boolean).length;
  // Very short messages ("ok", "2", "yes") are unreliable for detection: keep the conversation language.
  if (ctx.language && (wordCount <= 2 || !/^[a-z]{2,3}$/.test(lang))) lang = ctx.language;
  if (!/^[a-z]{2,3}$/.test(lang)) lang = ctx.customer.preferredLanguage ?? r.defaultLanguage;
  const anyLanguage = r.supportedLanguages.length === 0 || r.supportedLanguages.includes("*");
  if (!anyLanguage && !r.supportedLanguages.includes(lang)) return r.defaultLanguage;
  return lang;
}

function issueText(lang: string, issue: ItemIssue): string {
  switch (issue.kind) {
    case "unknown_item":
      return t(lang, "unknownItem", { item: issue.name }) + (issue.suggestions.length ? ` ${t(lang, "alternatives", { alts: issue.suggestions.join(", ") })}` : "");
    case "sold_out":
      return t(lang, "soldOut", { item: issue.name }) + (issue.alternatives.length ? ` ${t(lang, "alternatives", { alts: issue.alternatives.join(", ") })}` : "");
    case "unavailable":
      return t(lang, "unavailable", { item: issue.name }) + (issue.alternatives.length ? ` ${t(lang, "alternatives", { alts: issue.alternatives.join(", ") })}` : "");
    case "needs_variant":
      return t(lang, "askVariant", { item: issue.name, options: issue.options.join(" / ") });
    case "unknown_variant":
      return t(lang, "unknownVariant", { item: issue.name, requested: issue.requested, options: issue.options.join(" / ") });
    case "unknown_addon":
      return t(lang, "unknownAddon", { item: issue.name, addon: issue.requested, options: issue.options.join(", ") || "—" });
    case "invalid_quantity":
      return t(lang, "clarify");
  }
}

export function decide(ctx: PipelineContext, raw: RawExtraction, input: InboundInput, lang: string): Decision {
  const r = ctx.restaurant;
  const money = (n: number) => formatMoney(n, r.currency, lang);
  let draft: DraftOrder = structuredClone(ctx.draft);
  const text = input.text ?? "";
  const facts: string[] = [];
  const open = isOpenAt(r.hours, r.timezone, ctx.now);
  const next = nextOpening(r.hours, r.timezone, ctx.now);
  const nextStr = next ? formatLocalTime(next, r.timezone, lang) : "—";

  const base: Decision = {
    action: "answer",
    state: ctx.state,
    draft,
    editingOrderId: ctx.editingOrderId,
    clarificationAttempts: ctx.clarificationAttempts,
    draftReply: "",
    facts,
    summaryBlock: null,
    buttons: null,
    requestLocation: false,
    handoffReason: null,
    flagForStaff: null,
    orderEffect: null,
    outcome: "none",
  };
  const done = (d: Partial<Decision>): Decision => ({ ...base, draft, ...d, facts });
  const humanButton = { id: BUTTON.human, title: t(lang, "talkToHuman") };

  facts.push(`Restaurant: ${r.name}. Currently ${open ? "OPEN" : `CLOSED (next opening: ${nextStr})`}. Opening hours: ${describeHours(r.hours)}.`);

  // ── Location pin merges into the draft ──
  if (input.location) {
    draft.location = { lat: input.location.lat, lng: input.location.lng };
    if (input.location.address) draft.deliveryAddress = [input.location.name, input.location.address].filter(Boolean).join(", ");
    draft.zoneId = null;
    if (!draft.orderType && r.deliveryEnabled) draft.orderType = "delivery";
  }

  // ── 1. Abuse / spam ──
  if (raw.spam_or_abuse) {
    facts.push("The customer's message was abusive, spam or unrelated. Politely redirect to ordering; do not engage further.");
    return done({ action: "redirect", draftReply: t(lang, "redirect", { restaurant: r.name }) });
  }

  // ── 2. Human handoff ──
  const ntext = normalize(text);
  const keyword = r.handoffKeywords.find((k) => k.trim() && ntext.includes(normalize(k)));
  const complaint = raw.intent === "complaint";
  if (raw.wants_human || raw.requires_human || keyword || (complaint && r.handoffOnComplaint)) {
    const reason = raw.wants_human
      ? "Customer asked to talk to a human"
      : complaint
        ? "Customer complaint"
        : keyword
          ? `Message mentions "${keyword}"`
          : raw.requires_human_reason ?? "AI flagged the request as needing a human";
    facts.push("A staff member is taking over this conversation. Tell the customer briefly and warmly.");
    return done({ action: "handoff", handoffReason: reason, draftReply: t(lang, "handoff") });
  }
  if (complaint) {
    facts.push("Customer has a complaint. Apologise sincerely and say the team has been notified. Promise nothing else.");
    return done({ action: "answer", flagForStaff: "Customer complaint", draftReply: t(lang, "flagged") });
  }

  // ── 3. Pending cancellation confirmation ──
  if (draft.pendingCancelOrderId) {
    const orderId = draft.pendingCancelOrderId;
    draft.pendingCancelOrderId = null;
    const order = ctx.editableOrder?.id === orderId ? ctx.editableOrder : null;
    if (raw.confirmation === "confirm") {
      if (!order) {
        const num = ctx.latestOrder?.number ?? "";
        return done({ action: "cannot_modify", flagForStaff: `Customer wants to cancel order #${num}, but it's no longer editable`, draftReply: t(lang, "cannotModify", { number: num }) });
      }
      draft = emptyDraft();
      return done({
        action: "cancel_order",
        state: "IDLE",
        editingOrderId: null,
        orderEffect: { type: "cancel", orderId: order.id },
        outcome: "cancel_order",
        draftReply: t(lang, "orderCancelled", { number: order.number }),
      });
    }
    if (raw.confirmation === "reject") {
      return done({ action: "answer", draftReply: t(lang, "keptOrder", { number: order?.number ?? "" }) });
    }
  }

  // ── 4. Cancel intent ──
  if (raw.intent === "cancel_order") {
    const editable = ctx.editableOrder;
    if (editable) {
      draft.pendingCancelOrderId = editable.id;
      return done({
        action: "confirm_cancel",
        draftReply: t(lang, "confirmCancel", { number: editable.number }),
        buttons: [
          { id: BUTTON.cancelYes, title: t(lang, "yesCancel") },
          { id: BUTTON.cancelNo, title: t(lang, "keepOrder") },
        ],
      });
    }
    const latest = ctx.latestOrder;
    if (latest && !["COMPLETED", "CANCELLED"].includes(latest.status) && !draft.items.length) {
      return done({ action: "cannot_modify", flagForStaff: `Customer wants to cancel order #${latest.number} (status ${latest.status})`, draftReply: t(lang, "cannotModify", { number: latest.number }) });
    }
    if (draft.items.length) {
      draft = emptyDraft();
      return done({ action: "cancel_draft", state: "IDLE", editingOrderId: null, draftReply: t(lang, "cartCleared") });
    }
    return done({ action: "answer", draftReply: t(lang, "noActiveOrder") });
  }

  // ── 5. Reservation (out of AI scope) ──
  if (raw.intent === "reservation") {
    facts.push("The AI does not take table reservations. Say the team will get back to them about the reservation.");
    return done({ action: "answer", flagForStaff: "Reservation request", draftReply: t(lang, "flagged") });
  }

  const orderingSignal =
    raw.cart_changed ||
    raw.intent === "new_order" ||
    raw.intent === "modify_order" ||
    raw.order_type !== "unknown" ||
    Boolean(raw.delivery_address) ||
    Boolean(raw.customer_name) ||
    Boolean(raw.scheduled_time) ||
    raw.payment_preference !== "unknown" ||
    Boolean(input.location && draft.items.length) ||
    (ctx.state !== "IDLE" && raw.confirmation !== "none");

  // ── 6. Closed and no pre-orders ──
  if (!open && r.autoReplyWhenClosed && !r.allowPreorders && orderingSignal) {
    return done({ action: "closed", draftReply: r.closedMessage?.trim() || t(lang, "closedNoPreorder", { next: nextStr }) });
  }

  // ── 7. Confirmation of the summary ──
  if (ctx.state === "AWAITING_CONFIRMATION" && !raw.cart_changed && raw.confirmation === "reject") {
    return done({ action: "ask", state: "ORDERING", draftReply: t(lang, "whatChange") });
  }
  let menuChangedNotice = false;
  let carriedIssues: ItemIssue[] = [];
  if (ctx.state === "AWAITING_CONFIRMATION" && !raw.cart_changed && raw.confirmation === "confirm") {
    // Re-validate against the live menu: an item may have sold out since the summary was shown.
    const re = validateItems(ctx.menu, linesToRaw(draft.items), lang);
    if (re.issues.length === 0 && sameCart(re.lines, draft.items)) {
      const step = missingStep(ctx, draft, lang, open);
      if (!step.ask) {
        draft = step.draft;
        const effect = ctx.editingOrderId ? ({ type: "update", orderId: ctx.editingOrderId } as const) : ({ type: "create" } as const);
        return done({
          action: ctx.editingOrderId ? "update_order" : "create_order",
          state: "IDLE",
          orderEffect: effect,
          outcome: ctx.editingOrderId ? "modify_order" : "create_order",
          draftReply: "", // filled in once the order number is known
        });
      }
    } else {
      draft.items = re.lines;
      carriedIssues = re.issues;
      menuChangedNotice = true;
      facts.push("The menu changed since the summary was shown (an item sold out or a price changed). Show the updated summary.");
    }
  }

  // ── 8. Questions ──
  const answer = answerQuestions(ctx, raw, draft, lang, input);
  facts.push(...answer.facts);

  if (!orderingSignal && !menuChangedNotice) {
    if (answer.reply) {
      return done({ action: "answer", draftReply: answer.reply, summaryBlock: answer.block, requestLocation: answer.requestLocation });
    }
    // Greeting / small talk / unclear
    const greeting = ctx.isFirstContact || raw.confidence >= 0.85;
    if (greeting && raw.intent === "other") {
      const custom = r.greetingMessage?.trim();
      const categories = ctx.menu.categories.map((c) => localName(c, lang)).join(", ");
      facts.push(`Menu categories: ${categories}.`);
      return done({ action: "greet", draftReply: custom || t(lang, "greeting", { restaurant: r.name }) });
    }
    if (raw.confidence < r.handoffConfidenceThreshold || raw.intent === "other") {
      const attempts = ctx.clarificationAttempts + 1;
      if (attempts > r.maxClarifications) {
        return done({ action: "handoff", clarificationAttempts: 0, handoffReason: "AI could not understand the customer after several attempts", draftReply: t(lang, "handoff") });
      }
      return done({ action: "clarify", clarificationAttempts: attempts, draftReply: t(lang, "clarify"), buttons: attempts >= 2 ? [humanButton] : null });
    }
    if (raw.intent === "question") {
      facts.push(`Restaurant address: ${r.address ?? "not provided"}. Phone: ${r.phone ?? "not provided"}.`);
      return done({ action: "answer", draftReply: t(lang, "redirect", { restaurant: r.name }) });
    }
  }

  // ── 9. Ordering ──
  let editingOrderId = ctx.editingOrderId;
  let issues: ItemIssue[] = carriedIssues;
  if (raw.cart_changed) {
    if (raw.intent === "modify_order" && !draft.items.length && !editingOrderId) {
      const ed = ctx.editableOrder;
      if (ed) {
        editingOrderId = ed.id;
        draft = {
          ...emptyDraft(),
          orderType: ed.type,
          deliveryAddress: ed.deliveryAddress,
          location: ed.location,
          scheduledTime: ed.scheduledTime,
          customerName: ed.customerName,
          paymentPreference: ed.paymentPreference,
        };
        facts.push(`The customer is modifying their existing order #${ed.number}.`);
      } else if (ctx.latestOrder && !["COMPLETED", "CANCELLED"].includes(ctx.latestOrder.status)) {
        return done({
          action: "cannot_modify",
          flagForStaff: `Customer wants to change order #${ctx.latestOrder.number} (status ${ctx.latestOrder.status})`,
          draftReply: t(lang, "cannotModify", { number: ctx.latestOrder.number }),
        });
      }
    }
    const v = validateItems(ctx.menu, raw.items, lang);
    draft.items = v.lines;
    issues = v.issues;
  }

  let scheduleProblem: string | null = null;
  if (raw.order_type === "delivery" || raw.order_type === "pickup") {
    const enabled = raw.order_type === "delivery" ? r.deliveryEnabled : r.pickupEnabled;
    if (enabled) {
      if (draft.orderType !== raw.order_type) draft.zoneId = null;
      draft.orderType = raw.order_type;
    } else facts.push(`${raw.order_type} is not offered by this restaurant.`);
  }
  if (raw.delivery_address) {
    draft.deliveryAddress = raw.delivery_address.slice(0, 300);
    draft.zoneId = null;
    if (!draft.orderType && r.deliveryEnabled) draft.orderType = "delivery";
  }
  if (raw.customer_name) draft.customerName = raw.customer_name.slice(0, 80);
  if (raw.scheduled_time && raw.scheduled_time !== "asap") {
    const check = checkScheduledTime(raw.scheduled_time, r.hours, r.timezone, ctx.now, r.prepTimeMinutes);
    if (check.ok) draft.scheduledTime = check.date.toISOString();
    else scheduleProblem = check.reason;
  } else if (raw.scheduled_time === "asap" && open) draft.scheduledTime = null;
  if (raw.payment_preference !== "unknown") {
    if (r.acceptedPaymentMethods.includes(raw.payment_preference)) draft.paymentPreference = raw.payment_preference;
    else facts.push(`Payment method "${raw.payment_preference}" is not accepted. Accepted: ${r.acceptedPaymentMethods.join(", ")}.`);
  }

  const prefix = answer.reply ? `${answer.reply}\n\n` : "";
  const ask = (reply: string, extra: Partial<Decision> = {}) =>
    done({ action: "ask", state: "ORDERING", editingOrderId, draftReply: prefix + reply, ...extra });

  // a. Item problems
  if (issues.length) {
    const attempts = ctx.clarificationAttempts + 1;
    if (attempts > r.maxClarifications + 1) {
      return done({ action: "handoff", editingOrderId, clarificationAttempts: 0, handoffReason: "Repeated item clarification failures", draftReply: t(lang, "handoff") });
    }
    facts.push(...issues.map((i) => `Item issue: ${JSON.stringify(i)}`));
    return ask(issues.map((i) => issueText(lang, i)).join("\n"), { clarificationAttempts: attempts });
  }
  if (scheduleProblem) {
    return ask(scheduleProblem === "too_soon" ? t(lang, "tooSoon", { minutes: r.prepTimeMinutes }) : t(lang, "invalidTime", { hours: describeHours(r.hours) }));
  }

  const step = missingStep(ctx, draft, lang, open);
  draft = step.draft;
  if (step.flag) base.flagForStaff = step.flag;
  if (step.ask) {
    return ask(step.ask.reply, { buttons: step.ask.buttons ?? null, requestLocation: step.ask.requestLocation ?? false, clarificationAttempts: 0 });
  }

  // b. Complete → summary
  if (r.deliveryInstructions && draft.orderType === "delivery") facts.push(`Delivery instructions: ${r.deliveryInstructions}`);
  if (r.pickupInstructions && draft.orderType === "pickup") facts.push(`Pickup instructions: ${r.pickupInstructions}`);
  if (r.paymentNote) facts.push(`Payment note: ${r.paymentNote}`);
  const totals = computeTotals(draft);
  facts.push(`Order total: ${money(totals.total)}. Payment is collected by the restaurant directly; never ask for card details.`);
  return done({
    action: "summary",
    state: "AWAITING_CONFIRMATION",
    editingOrderId,
    clarificationAttempts: 0,
    summaryBlock: renderSummary(draft, ctx.menu, r, lang, ctx.customer.name),
    draftReply: prefix + t(lang, "confirmPrompt"),
    buttons: [{ id: BUTTON.confirm, title: t(lang, "confirm") }, { id: BUTTON.edit, title: t(lang, "edit") }, humanButton],
  });
}

type Ask = { reply: string; buttons?: { id: string; title: string }[]; requestLocation?: boolean };
export type StepResult = { draft: DraftOrder; ask: Ask | null; flag: string | null };

/**
 * Fills in what can be derived (zone + fee, saved name/address, single payment method) and returns
 * the first missing piece of information, or `ask: null` when the order is complete.
 */
export function missingStep(ctx: PipelineContext, input: DraftOrder, lang: string, open: boolean): StepResult {
  const r = ctx.restaurant;
  const draft = structuredClone(input);
  const money = (n: number) => formatMoney(n, r.currency, lang);
  let flag: string | null = null;
  const result = (ask: Ask | null, d: DraftOrder = draft): StepResult => ({ draft: d, ask, flag });

  const pending = draft.items.find((l) => l.pending === "variant");
  if (pending) {
    const item = ctx.menu.items.find((i) => i.id === pending.menuItemId);
    const options = item?.variants.filter((v) => v.isAvailable).map((v) => `${localName(v, lang)} (${money(v.price)})`) ?? [];
    return result({ reply: t(lang, "askVariant", { item: item ? localName(item, lang) : pending.name, options: options.join(" / ") }) });
  }
  if (draft.items.length === 0) {
    return result({ reply: t(lang, "askItems", { categories: ctx.menu.categories.map((c) => localName(c, lang)).join(", ") }) });
  }
  if (!draft.orderType) {
    if (r.deliveryEnabled && !r.pickupEnabled) draft.orderType = "delivery";
    else if (r.pickupEnabled && !r.deliveryEnabled) draft.orderType = "pickup";
    else
      return result({
        reply: t(lang, "askOrderType"),
        buttons: [
          { id: BUTTON.delivery, title: t(lang, "delivery") },
          { id: BUTTON.pickup, title: t(lang, "pickup") },
        ],
      });
  }

  let zoneMin: number | null = null;
  if (draft.orderType === "delivery") {
    if (!draft.deliveryAddress && !draft.location) {
      if (ctx.customer.savedAddress || ctx.customer.savedLocation) {
        draft.deliveryAddress = ctx.customer.savedAddress;
        draft.location = ctx.customer.savedLocation;
      } else return result({ reply: t(lang, "askAddress"), requestLocation: true });
    }
    const match = matchZone(r.zones, r.location, { location: draft.location, address: draft.deliveryAddress });
    if (match.status === "inside") {
      draft.zoneId = match.zone.id;
      draft.deliveryFee = match.zone.fee;
      zoneMin = match.zone.minimumOrder;
    } else if (match.status === "outside") {
      return result(
        {
          reply: `${t(lang, "outsideZone")}${r.pickupEnabled ? ` ${t(lang, "offerPickup")}` : ""}`,
          buttons: r.pickupEnabled ? [{ id: BUTTON.pickup, title: t(lang, "pickup") }, { id: BUTTON.human, title: t(lang, "talkToHuman") }] : undefined,
        },
        { ...draft, location: null, deliveryAddress: null, zoneId: null },
      );
    } else if (match.status === "unknown") {
      if (!draft.location) return result({ reply: t(lang, "unknownZone"), requestLocation: true });
      // Pin given but the zone can't be determined (restaurant has no coordinates): staff verifies the fee.
      draft.zoneId = null;
      draft.deliveryFee = 0;
      flag = "Verify the delivery zone and fee (restaurant coordinates are not set)";
    } else {
      draft.zoneId = null;
      draft.deliveryFee = 0;
    }
  } else {
    draft.zoneId = null;
    draft.deliveryFee = 0;
  }

  const { subtotal } = computeTotals(draft);
  const min = Math.max(r.minimumOrderAmount, draft.orderType === "delivery" ? (zoneMin ?? 0) : 0);
  if (min > 0 && subtotal < min) return result({ reply: t(lang, "belowMinimum", { min: money(min), subtotal: money(subtotal) }) });

  if (!draft.customerName) {
    if (ctx.customer.name) draft.customerName = ctx.customer.name;
    else return result({ reply: t(lang, "askName") });
  }
  if (!open && !draft.scheduledTime) {
    const next = nextOpening(r.hours, r.timezone, ctx.now);
    return result({ reply: t(lang, "askTimeClosed", { next: next ? formatLocalTime(next, r.timezone, lang) : "—" }) });
  }
  if (r.askPaymentPreference && !draft.paymentPreference) {
    // Only offer methods that make sense for the order type.
    const notFor: Record<string, PaymentValue[]> = { pickup: ["card_on_delivery"], delivery: ["card_at_pickup", "pay_at_restaurant"] };
    const methods = r.acceptedPaymentMethods.filter((m) => m !== "unknown" && !(notFor[draft.orderType ?? ""] ?? []).includes(m));
    if (methods.length === 1) draft.paymentPreference = methods[0]!;
    else if (methods.length > 1) {
      return result({
        reply: t(lang, "askPayment", { options: methods.map((m) => t(lang, `pay.${m}`)).join(", ") }),
        buttons: methods.length <= 3 ? methods.map((m) => ({ id: `${BUTTON.payPrefix}${m}`, title: t(lang, `pay.${m}`) })) : undefined,
      });
    }
  }
  return result(null);
}

function answerQuestions(ctx: PipelineContext, raw: RawExtraction, draft: DraftOrder, lang: string, input: InboundInput) {
  const r = ctx.restaurant;
  const money = (n: number) => formatMoney(n, r.currency, lang);
  const replies: string[] = [];
  const facts: string[] = [];
  let block: string | null = null;
  let requestLocation = false;
  const topics = new Set(raw.question_topics);
  if (input.location && !draft.items.length && ctx.state === "IDLE") topics.add("delivery_area");

  for (const topic of topics) {
    switch (topic) {
      case "hours": {
        replies.push(t(lang, "hoursAnswer", { hours: describeHours(r.hours) }));
        break;
      }
      case "delivery_area":
      case "delivery_fee": {
        if (!r.deliveryEnabled) {
          facts.push("This restaurant does not offer delivery, only pickup.");
          replies.push(t(lang, "outsideZone") + (r.pickupEnabled ? ` ${t(lang, "offerPickup")}` : ""));
          break;
        }
        facts.push(
          `Delivery zones: ${r.zones.map((z) => `${z.name} (${z.type === "RADIUS" ? `within ${z.radiusKm} km` : z.areas.join(", ")}) fee ${money(z.fee)}${z.minimumOrder ? `, min order ${money(z.minimumOrder)}` : ""}`).join("; ") || "no zones configured"}.`,
        );
        const loc = input.location ?? draft.location;
        const addr = raw.delivery_address ?? draft.deliveryAddress;
        const m = matchZone(r.zones, r.location, { location: loc, address: addr });
        if (m.status === "inside") replies.push(t(lang, "deliveryYes", { fee: money(m.zone.fee) }));
        else if (m.status === "outside") replies.push(t(lang, "outsideZone") + (r.pickupEnabled ? ` ${t(lang, "offerPickup")}` : ""));
        else if (m.status === "no_zones") replies.push(t(lang, "deliveryYes", { fee: money(0) }));
        else {
          replies.push(t(lang, "unknownZone"));
          requestLocation = true;
        }
        break;
      }
      case "menu":
        replies.push(t(lang, "menuIntro"));
        block = renderMenu(ctx.menu, r, lang);
        break;
      case "item_info": {
        const items = raw.items.map((i) => ctx.menu.items.find((m) => m.id === i.menu_item_id)).filter(Boolean);
        for (const i of items) {
          facts.push(
            `Menu item "${i!.name}": ${i!.description ?? "no description"}. Dietary tags: ${i!.dietaryTags.join(", ") || "none listed"}. Price: ${
              i!.variants.length ? i!.variants.map((v) => `${v.name} ${money(v.price)}`).join(", ") : money(i!.price)
            }. ${i!.isSoldOut ? "SOLD OUT." : ""} Add-ons: ${i!.addons.map((a) => `${a.name} +${money(a.price)}`).join(", ") || "none"}.`,
          );
        }
        facts.push("For allergy or medical questions beyond the listed dietary tags, say staff will confirm. Never guess ingredients.");
        break;
      }
      case "payment":
        replies.push(t(lang, "paymentInfo", { methods: r.acceptedPaymentMethods.map((m) => t(lang, `pay.${m}`)).join(", ") }));
        if (r.paymentNote) facts.push(`Payment note: ${r.paymentNote}`);
        break;
      case "order_status": {
        const o = ctx.latestOrder;
        replies.push(o ? t(lang, "orderStatusAnswer", { number: o.number, status: t(lang, `status.${o.status}` as never) }) : t(lang, "noOrders"));
        facts.push("Do not promise any delivery or ready time; staff will update the customer.");
        break;
      }
      case "location":
        replies.push(r.address ? t(lang, "addressLabel", { address: r.address }) : t(lang, "redirect", { restaurant: r.name }));
        break;
      default:
        break;
    }
  }
  return { reply: replies.join("\n"), facts, block, requestLocation };
}
