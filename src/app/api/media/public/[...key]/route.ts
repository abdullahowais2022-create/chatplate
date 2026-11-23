import { NextResponse } from "next/server";
import { getLocalPublic } from "@/server/storage";

type Ctx = { params: Promise<{ key: string[] }> };

/** Local-development stand-in for the public storage bucket. */
export async function GET(_req: Request, { params }: Ctx) {
  const { key } = await params;
  const file = await getLocalPublic(key.join("/")).catch(() => null);
  if (!file) return new NextResponse("Not found", { status: 404 });
  return new NextResponse(new Uint8Array(file.data), { headers: { "Content-Type": file.contentType, "Cache-Control": "public, max-age=86400" } });
}
