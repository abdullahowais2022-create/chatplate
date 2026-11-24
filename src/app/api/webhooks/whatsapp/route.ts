import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { safeEqual } from "@/server/crypto";
import { env } from "@/server/env";
import { verifyMetaSignature } from "@/server/whatsapp/signature";
import { normalizeWebhook, type NormalizedEvent } from "@/server/whatsapp/payload";
import { ingestEvents } from "@/server/whatsapp/ingest";
import { rateLimit } from "@/server/ratelimit";
import { clientIp } from "@/server/http";
import { noteWebhookRejection } from "@/server/whatsapp/diagnostics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_BODY = 1_000_000;

/**
 * Platform webhook for businesses connected with one-click signup (Meta Embedded Signup).
 * Set once in the TillText Meta app: Callback URL = {APP_URL}/api/webhooks/whatsapp,
 * Verify token = META_WEBHOOK_VERIFY_TOKEN. Signed with META_APP_SECRET.
 * Events are routed to the right business by the phone number id inside each event.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const expected = env().META_WEBHOOK_VERIFY_TOKEN;
  const token = url.searchParams.get("hub.verify_token") ?? "";
  if (!expected || url.searchParams.get("hub.mode") !== "subscribe" || !safeEqual(token, expected)) {
    return new NextResponse("Forbidden", { status: 403 });
  }
  return new NextResponse(url.searchParams.get("hub.challenge") ?? "", { status: 200, headers: { "Content-Type": "text/plain" } });
}

export async function POST(req: Request) {
  if (!(await rateLimit("webhook", clientIp(req), 3000, "1 m"))) return new NextResponse("Too many requests", { status: 429 });
  const secret = env().META_APP_SECRET;
  const raw = await req.text();
  if (raw.length > MAX_BODY) return new NextResponse("Payload too large", { status: 413 });
  if (!secret) {
    await noteWebhookRejection(raw, "Meta is sending messages, but META_APP_SECRET isn't set in Vercel. Add your Meta app's App secret there and redeploy.");
    return new NextResponse("Not configured", { status: 404 });
  }
  if (!verifyMetaSignature(raw, req.headers.get("x-hub-signature-256"), secret)) {
    console.warn("[webhook:platform] invalid signature");
    await noteWebhookRejection(raw, "Meta is sending messages, but they were rejected: META_APP_SECRET in Vercel doesn't match your Meta app's App secret (App settings → Basic). Copy it again, save, redeploy.");
    return new NextResponse("Invalid signature", { status: 401 });
  }
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return new NextResponse("Bad request", { status: 400 });
  }

  const byNumber = new Map<string, NormalizedEvent[]>();
  for (const e of normalizeWebhook(body)) {
    if (!e.phoneNumberId) continue;
    byNumber.set(e.phoneNumberId, [...(byNumber.get(e.phoneNumberId) ?? []), e]);
  }
  try {
    let queued = 0;
    for (const [phoneNumberId, events] of byNumber) {
      const account = await db.whatsAppAccount.findUnique({ where: { phoneNumberId } });
      if (!account) continue; // a number not (or no longer) connected to any business
      queued += (await ingestEvents(account, events)).queued;
    }
    return NextResponse.json({ ok: true, queued });
  } catch (err) {
    console.error("[webhook:platform] ingest failed", err);
    return new NextResponse("Temporary failure", { status: 500 });
  }
}
