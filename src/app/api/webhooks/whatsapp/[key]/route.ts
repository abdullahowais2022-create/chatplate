import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { decryptOrNull, safeEqual } from "@/server/crypto";
import { verifyMetaSignature } from "@/server/whatsapp/signature";
import { ingestWebhook } from "@/server/whatsapp/ingest";
import { rateLimit } from "@/server/ratelimit";
import { clientIp } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Without QStash, message processing runs after the response in this same invocation.
export const maxDuration = 60;

type Ctx = { params: Promise<{ key: string }> };
const MAX_BODY = 1_000_000;

/** Meta's webhook verification handshake (hub.challenge). */
export async function GET(req: Request, { params }: Ctx) {
  const { key } = await params;
  const url = new URL(req.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token") ?? "";
  const challenge = url.searchParams.get("hub.challenge") ?? "";
  const account = await db.whatsAppAccount.findUnique({ where: { webhookKey: key } });
  if (!account || mode !== "subscribe" || !safeEqual(token, account.verifyToken)) {
    return new NextResponse("Forbidden", { status: 403 });
  }
  await db.whatsAppAccount.update({
    where: { id: account.id },
    data: { webhookVerifiedAt: new Date(), ...(account.status === "NOT_CONNECTED" || account.status === "ERROR" ? {} : { status: "CONNECTED", lastError: null }) },
  });
  return new NextResponse(challenge, { status: 200, headers: { "Content-Type": "text/plain" } });
}

/** Receives messages and status updates. Verifies the signature, stores events idempotently, then queues them. */
export async function POST(req: Request, { params }: Ctx) {
  if (!(await rateLimit("webhook", clientIp(req), 1200, "1 m"))) return new NextResponse("Too many requests", { status: 429 });
  const { key } = await params;
  const account = await db.whatsAppAccount.findUnique({ where: { webhookKey: key } });
  if (!account) return new NextResponse("Not found", { status: 404 });

  const raw = await req.text();
  if (raw.length > MAX_BODY) return new NextResponse("Payload too large", { status: 413 });
  const appSecret = decryptOrNull(account.appSecretEnc);
  if (!appSecret || !verifyMetaSignature(raw, req.headers.get("x-hub-signature-256"), appSecret)) {
    console.warn("[webhook] invalid signature", { account: account.id });
    await db.whatsAppAccount.update({ where: { id: account.id }, data: { lastError: "Meta is sending messages, but they were rejected: the App secret saved in TillText doesn't match your Meta app (App settings → Basic). Paste it again and press Save & verify." } }).catch(() => undefined);
    return new NextResponse("Invalid signature", { status: 401 });
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return new NextResponse("Bad request", { status: 400 });
  }
  try {
    const result = await ingestWebhook(account, body);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    // 500 makes Meta retry later; idempotency keys make that safe.
    console.error("[webhook] ingest failed", err);
    return new NextResponse("Temporary failure", { status: 500 });
  }
}
