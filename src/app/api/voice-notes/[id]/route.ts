import { route, notFound } from "@/server/http";
import { requireApiSession } from "@/server/auth/session";
import { db } from "@/server/db";
import { getPrivate } from "@/server/storage";

type Ctx = { params: Promise<{ id: string }> };

/** Streams a stored voice note to authorised staff of the same restaurant only. */
export const GET = route<Ctx>(async (_req, { params }) => {
  const s = await requireApiSession("inbox:read");
  const vn = await db.voiceNote.findFirst({ where: { id: (await params).id, restaurantId: s.restaurantId } });
  if (!vn?.storageKey) throw notFound("Audio not available");
  const file = await getPrivate(vn.storageKey);
  if (!file) throw notFound("Audio not available");
  return new Response(new Uint8Array(file.data), { headers: { "Content-Type": file.contentType, "Cache-Control": "private, max-age=300" } });
});
