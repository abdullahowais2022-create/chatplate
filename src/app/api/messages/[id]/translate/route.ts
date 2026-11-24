import { route, ok, notFound, badRequest } from "@/server/http";
import { requireApiSession } from "@/server/auth/session";
import { enforceRateLimit } from "@/server/ratelimit";
import { db } from "@/server/db";
import { translateText } from "@/server/ai/translate";
import { baseLang } from "@/server/ai/i18n";

type Ctx = { params: Promise<{ id: string }> };

/** Translates one message (or voice-note transcript) into the team's language and saves it. */
export const POST = route<Ctx>(async (_req, { params }) => {
  const s = await requireApiSession("inbox:read");
  await enforceRateLimit("translate", s.userId, 60, "10 m");
  const { id } = await params;
  const m = await db.message.findFirst({ where: { id, restaurantId: s.restaurantId }, include: { voiceNote: { select: { transcript: true } }, restaurant: { select: { defaultLanguage: true } } } });
  if (!m) throw notFound("Message not found");
  if (m.direction === "OUTBOUND" && m.translation) throw badRequest("This reply already shows what was originally typed");
  const text = m.body?.trim() || m.voiceNote?.transcript?.trim();
  if (!text) throw badRequest("There's no text to translate in this message");
  const target = baseLang(m.restaurant.defaultLanguage);
  try {
    const r = await translateText(text, target, "to_staff");
    const updated = await db.message.update({ where: { id }, data: { translation: r.text, translationLanguage: target, language: m.language ?? r.sourceLanguage } });
    return ok({ translation: updated.translation, translationLanguage: updated.translationLanguage, language: updated.language });
  } catch (err) {
    throw badRequest(`Couldn't translate: ${(err as Error).message}`);
  }
});
