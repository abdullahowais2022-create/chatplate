import "server-only";
import type { CartLine, Decision, InboundInput, OrderExtraction, OutboundPlan, PipelineContext, RawExtraction } from "./types";
import { chooseLanguage, decide, extractionFromButton, missingStep } from "./flow";
import { heuristicExtract } from "./heuristic";
import { llmExtract } from "./extract";
import { composeReply, ensureLanguageLabels } from "./compose";
import { hasOpenAI } from "../env";
import { isOpenAt } from "./hours";
import { linesToRaw } from "./validate";

export type PipelineOutput = {
  engine: "openai" | "heuristic";
  language: string;
  raw: RawExtraction;
  extraction: OrderExtraction;
  decision: Decision;
  reply: string;
  outbound: OutboundPlan[];
  errors: string[];
  durationMs: number;
};

const INTERACTIVE_BODY_LIMIT = 1024;

/**
 * Runs one customer turn through extract → validate → decide → compose.
 * Pure with respect to the database: callers (webhook processing, playground) apply the result.
 */
export async function runPipeline(ctx: PipelineContext, input: InboundInput, opts: { forceHeuristic?: boolean } = {}): Promise<PipelineOutput> {
  const started = Date.now();
  const errors: string[] = [];
  const useLlm = hasOpenAI() && !opts.forceHeuristic;
  let engine: PipelineOutput["engine"] = useLlm ? "openai" : "heuristic";
  const text = input.text?.trim() ?? "";

  // 1. Extract
  let raw: RawExtraction | null = input.buttonId ? extractionFromButton(input.buttonId, ctx) : null;
  if (!raw) {
    const textForModel = text || (input.location ? "[The customer shared a location pin]" : "");
    if (useLlm) {
      try {
        raw = await llmExtract(ctx, textForModel, input.location ?? null);
      } catch (err) {
        errors.push(`extract: ${(err as Error).message}`);
        engine = "heuristic";
      }
    }
    raw ??= heuristicExtract(ctx, textForModel);
  }
  // A location pin never changes the cart by itself.
  if (!text && input.location) raw = { ...raw, cart_changed: false, items: linesToRaw(ctx.draft.items) };

  // 2. Language
  const language = chooseLanguage(ctx, raw.language, text);
  if (useLlm) await ensureLanguageLabels(language).catch(() => undefined);

  // 3. Decide (validation happens inside)
  const decision = decide(ctx, raw, input, language);

  // 4. Compose
  let reply = decision.draftReply;
  const templatedActions = new Set(["create_order", "update_order", "cancel_order"]);
  if (useLlm && engine === "openai" && reply && !templatedActions.has(decision.action)) {
    try {
      reply = await composeReply(ctx, decision, language, text);
    } catch (err) {
      errors.push(`compose: ${(err as Error).message}`);
    }
  }

  return {
    engine,
    language,
    raw,
    extraction: toSpecExtraction(ctx, raw, decision, language),
    decision,
    reply,
    outbound: buildOutbound(decision, reply),
    errors,
    durationMs: Date.now() - started,
  };
}

export function buildOutbound(decision: Decision, reply: string): OutboundPlan[] {
  if (!reply && !decision.summaryBlock) return [];
  if (decision.action === "summary" && decision.summaryBlock) {
    const body = `${decision.summaryBlock}\n\n${reply}`;
    if (decision.buttons && body.length <= INTERACTIVE_BODY_LIMIT) return [{ kind: "buttons", text: body, buttons: decision.buttons }];
    return [{ kind: "text", text: decision.summaryBlock }, decision.buttons ? { kind: "buttons", text: reply, buttons: decision.buttons } : { kind: "text", text: reply }];
  }
  const text = decision.summaryBlock ? `${reply}\n\n${decision.summaryBlock}` : reply;
  if (decision.requestLocation) return [{ kind: "location_request", text: text.slice(0, INTERACTIVE_BODY_LIMIT) }];
  if (decision.buttons?.length && text.length <= INTERACTIVE_BODY_LIMIT) return [{ kind: "buttons", text, buttons: decision.buttons }];
  return [{ kind: "text", text }];
}

function missingFields(ctx: PipelineContext, decision: Decision): string[] {
  const d = decision.draft;
  const out: string[] = [];
  if (!d.items.length) out.push("items");
  for (const l of d.items) if (l.pending === "variant") out.push(`variant:${l.name}`);
  if (!d.orderType) out.push("order_type");
  if (d.orderType === "delivery" && !d.deliveryAddress && !d.location) out.push("delivery_address");
  if (!d.customerName && !ctx.customer.name) out.push("customer_name");
  if (!isOpenAt(ctx.restaurant.hours, ctx.restaurant.timezone, ctx.now) && !d.scheduledTime) out.push("scheduled_time");
  if (ctx.restaurant.askPaymentPreference && !d.paymentPreference) out.push("payment_preference");
  // Reflect the deterministic step too (zone/minimum checks).
  if (decision.action === "ask" && out.length === 0) {
    const s = missingStep(ctx, d, "en", isOpenAt(ctx.restaurant.hours, ctx.restaurant.timezone, ctx.now));
    if (s.ask) out.push("clarification");
  }
  return out;
}

function toSpecExtraction(ctx: PipelineContext, raw: RawExtraction, decision: Decision, language: string): OrderExtraction {
  const d = decision.draft;
  const items = (d.items.length ? d.items : []).map((l: CartLine) => ({
    menu_item_id: l.menuItemId,
    name: l.name,
    quantity: l.quantity,
    variant: l.variantName,
    addons: l.addonNames,
    removals: l.removals,
    notes: l.notes,
    unit_price: l.unitPrice,
    line_total: l.lineTotal,
  }));
  return {
    intent: raw.intent,
    language,
    items,
    order_type: d.orderType ?? "unknown",
    delivery_address: d.deliveryAddress,
    location: d.location,
    scheduled_time: d.scheduledTime,
    customer_name: d.customerName ?? ctx.customer.name,
    customer_phone: ctx.customer.phone,
    payment_preference: d.paymentPreference ?? "unknown",
    confidence: raw.confidence,
    missing_information: missingFields(ctx, decision),
    requires_human: decision.action === "handoff" || Boolean(decision.flagForStaff),
  };
}
