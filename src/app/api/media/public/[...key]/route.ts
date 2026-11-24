import { NextResponse } from "next/server";
import { getStoredPublic } from "@/server/storage";

type Ctx = { params: Promise<{ key: string[] }> };

/** Serves public images (logos, product photos) kept in the database when no Supabase bucket is set. */
export async function GET(_req: Request, { params }: Ctx) {
  const { key } = await params;
  const file = await getStoredPublic(key.join("/")).catch(() => null);
  if (!file) return new NextResponse("Not found", { status: 404 });
  return new NextResponse(new Uint8Array(file.data), {
    headers: {
      "Content-Type": file.contentType,
      // Keys are random and never reused, so the file can be cached forever.
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
    },
  });
}
