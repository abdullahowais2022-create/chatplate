import { route, ok, badRequest } from "@/server/http";
import { requireApiSession } from "@/server/auth/session";
import { publicBytesUsed, putPublic, usesDatabaseStorage } from "@/server/storage";
import { randomToken } from "@/server/crypto";
import { enforceRateLimit } from "@/server/ratelimit";

const MAX = 2 * 1024 * 1024;
const MAX_TOTAL_PER_BUSINESS = 100 * 1024 * 1024;

function sniff(buf: Buffer): { ext: string; type: string } | null {
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return { ext: "png", type: "image/png" };
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { ext: "jpg", type: "image/jpeg" };
  if (buf.subarray(0, 4).toString() === "RIFF" && buf.subarray(8, 12).toString() === "WEBP") return { ext: "webp", type: "image/webp" };
  return null;
}

/** Image upload for logos and menu photos. Type is checked by magic bytes, not the client's claim. */
export const POST = route(async (req) => {
  const s = await requireApiSession("menu:write");
  await enforceRateLimit("upload", s.userId, 30, "10 m");
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) throw badRequest("Attach an image file");
  if (file.size > MAX) throw badRequest("Images must be 2 MB or smaller");
  const buf = Buffer.from(await file.arrayBuffer());
  const kind = sniff(buf);
  if (!kind) throw badRequest("Only PNG, JPEG or WebP images are allowed");
  if (usesDatabaseStorage() && (await publicBytesUsed(s.restaurantId)) + buf.length > MAX_TOTAL_PER_BUSINESS) {
    throw badRequest("Your image storage is full (100 MB). Remove unused product photos or connect Supabase Storage.");
  }
  const url = await putPublic(`${s.restaurantId}/${randomToken(12)}.${kind.ext}`, buf, kind.type);
  return ok({ url }, { status: 201 });
});
