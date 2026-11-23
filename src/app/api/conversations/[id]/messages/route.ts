import { route, ok, parseJson, notFound, badRequest } from "@/server/http";
import { requireApiSession } from "@/server/auth/session";
import { replySchema } from "@/lib/schemas";
import { db } from "@/server/db";
import { sendToCustomer } from "@/server/services/messaging";
import { audit } from "@/server/audit";
import { enforceRateLimit } from "@/server/ratelimit";

type Ctx = { params: Promise<{ id: string }> };

/** Staff manual reply. Replying automatically takes the conversation over from the AI. */
export const POST = route<Ctx>(async (req, { params }) => {
  const s = await requireApiSession("inbox:reply");
  await enforceRateLimit("staff-reply", s.userId, 60, "1 m");
  const { id } = await params;
  const { text } = await parseJson(req, replySchema);
  const conv = await db.conversation.findFirst({ where: { id, restaurantId: s.restaurantId } });
  if (!conv) throw notFound("Conversation not found");
  if (conv.mode === "AI") {
    await db.conversation.update({ where: { id }, data: { mode: "HUMAN", assignedToId: s.userId } });
    await audit({ restaurantId: s.restaurantId, actorType: "STAFF", actorUserId: s.userId, action: "conversation.taken_over", entityType: "Conversation", entityId: id });
  }
  const msg = await sendToCustomer({ conversationId: id, content: { kind: "text", text }, sender: "STAFF", staffUserId: s.userId });
  await db.conversation.update({ where: { id }, data: { aiSuggestion: null, unreadCount: 0 } });
  if (msg.status === "FAILED") throw badRequest(msg.error ?? "The message could not be delivered");
  return ok({ id: msg.id, status: msg.status });
});
