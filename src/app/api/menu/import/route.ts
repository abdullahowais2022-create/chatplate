import { z } from "zod";
import { route, ok, parseJson, clientIp } from "@/server/http";
import { requireApiSession } from "@/server/auth/session";
import { enforceRateLimit } from "@/server/ratelimit";
import { db } from "@/server/db";
import { applyCatalog, catalogDraftSchema, draftCatalog } from "@/server/ai/catalog-import";

const IMAGE = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/;

const schema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("preview"),
    text: z.string().max(12_000).nullish(),
    image: z.string().max(3_000_000).regex(IMAGE, "Unsupported image").nullish(),
  }),
  z.object({ mode: z.literal("apply"), draft: catalogDraftSchema }),
]);

/** "Set up with AI": preview a catalogue read from text/photo, then apply the reviewed version. */
export const POST = route(async (req) => {
  const s = await requireApiSession("menu:write");
  const input = await parseJson(req, schema);
  if (input.mode === "preview") {
    await enforceRateLimit("menu-ai-import", s.restaurantId, 20, "1 h");
    const r = await db.restaurant.findUniqueOrThrow({ where: { id: s.restaurantId }, select: { name: true, businessType: true, currency: true } });
    const draft = await draftCatalog({ text: input.text, image: input.image, businessType: r.businessType, businessName: r.name, currency: r.currency });
    return ok({ draft });
  }
  return ok(await applyCatalog(s.restaurantId, input.draft, { userId: s.userId, ip: clientIp(req) }));
});
