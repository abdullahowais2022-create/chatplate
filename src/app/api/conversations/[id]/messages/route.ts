import { route, ok, parseJson, notFound, badRequest } from "@/server/http";
import { requireApiSession } from "@/server/auth/session";
import { replySchema } from "@/lib/schemas";
import { db } from "@/server/db";
import { sendToCustomer } from "@/server/services/messaging";
import { audit } from "@/server/audit";
import { enforceRateLimit } from "@/server/ratelimit";
import { translateText } from "@/server/ai/translate";
import { baseLang } from "@/server/ai/i18n";

type Ctx = { params: Promise<{ id: string }> };

/** Staff manual reply. Replying automatically takes the conversation over from the AI. */
export const POST = route<Ctx>(async (req, { params }) => {
  const s = await requireApiSession("inbox:reply");
  await enforceRateLimit("staff-reply", s.userId, 60, "1 m");
  const { id } = await params;
  const { text, translate } = await parseJson(req, replySchema);
  const conv = await db.conversation.findFirst({ where: { id, restaurantId: s.restaurantId }, include: { customer: { select: { preferredLanguage: true } }, restaurant: { select: { defaultLanguage: true } } } });
  if (!conv) throw notFound("Conversation not found");

  // Optionally translate the staff member's reply into the customer's language.
  const staffLang = baseLang(conv.restaurant.defaultLanguage);
  const customerLang = conv.language ?? conv.customer.preferredLanguage;
  let outgoing = text;
  let original: string | null = null;
  if (translate && customerLang && baseLang(customerLang) !== staffLang) {
    try {
      outgoing = (await translateText(text, customerLang, "to_customer")).text || text;
      original = text;
    } catch (err) {
      throw badRequest(`Couldn't translate the reply: ${(err as Error).message} Send it without translation or try again.`);
    }
  }
  if (conv.mode === "AI") {
    await db.conversation.update({ where: { id }, data: { mode: "HUMAN", assignedToId: s.userId } });
    await audit({ restaurantId: s.restaurantId, actorType: "STAFF", actorUserId: s.userId, action: "conversation.taken_over", entityType: "Conversation", entityId: id });
  }
  const msg = await sendToCustomer({ conversationId: id, content: { kind: "text", text: outgoing }, sender: "STAFF", staffUserId: s.userId });
  if (original) await db.message.update({ where: { id: msg.id }, data: { translation: original, translationLanguage: staffLang, language: baseLang(customerLang!) } });
  await db.conversation.update({ where: { id }, data: { aiSuggestion: null, unreadCount: 0 } });
  if (msg.status === "FAILED") throw badRequest(msg.error ?? "The message could not be delivered");
  return ok({ id: msg.id, status: msg.status });
});
