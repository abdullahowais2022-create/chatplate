import { route, ok, parseJson } from "@/server/http";
import { requireApiSession } from "@/server/auth/session";
import { playgroundSchema } from "@/lib/schemas";
import { loadRestaurantContext } from "@/server/ai/context";
import { runPipeline } from "@/server/ai/pipeline";
import { parseDraft } from "@/server/services/serialize";
import { enforceRateLimit } from "@/server/ratelimit";
import type { PipelineContext } from "@/server/ai/types";

/** Dry-run of the AI against the live menu and settings. Nothing is stored or sent. */
export const POST = route(async (req) => {
  const s = await requireApiSession("playground:use");
  await enforceRateLimit("playground", s.userId, 40, "1 m");
  const input = await parseJson(req, playgroundSchema);
  const { facts, menu } = await loadRestaurantContext(s.restaurantId);
  const ctx: PipelineContext = {
    restaurant: facts,
    menu,
    state: input.state,
    draft: parseDraft(input.draft ?? null),
    editingOrderId: null,
    language: input.language ?? null,
    clarificationAttempts: 0,
    customer: { name: input.customerName ?? null, savedAddress: null, savedLocation: null, preferredLanguage: null, phone: null },
    history: input.history,
    editableOrder: null,
    latestOrder: null,
    isFirstContact: input.history.length === 0,
    now: new Date(),
  };
  const out = await runPipeline(ctx, { text: input.message }, { forceHeuristic: input.forceHeuristic });
  const effect = out.decision.outcome !== "none" ? out.decision.outcome : out.decision.state === "AWAITING_CONFIRMATION" ? "awaiting_confirmation" : "none";
  return ok({
    engine: out.engine,
    language: out.language,
    intent: out.raw.intent,
    extraction: out.extraction,
    action: out.decision.action,
    wouldDo: effect,
    missing: out.extraction.missing_information,
    reply: out.reply,
    outbound: out.outbound,
    handoffReason: out.decision.handoffReason,
    flagForStaff: out.decision.flagForStaff,
    errors: out.errors,
    durationMs: out.durationMs,
    next: { state: out.decision.state, draft: out.decision.draft, language: out.language },
  });
});
