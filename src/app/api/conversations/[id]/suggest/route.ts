import { route, ok, notFound } from "@/server/http";
import { requireApiSession } from "@/server/auth/session";
import { db } from "@/server/db";
import { loadPipelineContext } from "@/server/ai/context";
import { runPipeline } from "@/server/ai/pipeline";
import { enforceRateLimit } from "@/server/ratelimit";

type Ctx = { params: Promise<{ id: string }> };

/** Generates an AI-suggested reply for staff. Dry run: nothing is sent and no state changes. */
export const POST = route<Ctx>(async (_req, { params }) => {
  const s = await requireApiSession("inbox:reply");
  await enforceRateLimit("suggest", s.userId, 30, "1 m");
  const { id } = await params;
  const conv = await db.conversation.findFirst({ where: { id, restaurantId: s.restaurantId } });
  if (!conv) throw notFound("Conversation not found");
  const last = await db.message.findFirst({ where: { conversationId: id, direction: "INBOUND" }, orderBy: { createdAt: "desc" }, include: { voiceNote: true } });
  if (!last) return ok({ suggestion: null });
  const ctx = await loadPipelineContext(id);
  // loadPipelineContext drops the newest message from history assuming it's being processed; it is.
  const out = await runPipeline(ctx, { text: last.voiceNote?.transcript ?? last.body ?? "" });
  const suggestion = [out.decision.summaryBlock && out.decision.action === "summary" ? out.decision.summaryBlock : null, out.reply].filter(Boolean).join("\n\n");
  await db.conversation.update({ where: { id }, data: { aiSuggestion: suggestion } });
  return ok({ suggestion });
});
