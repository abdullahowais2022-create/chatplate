import { NextResponse } from "next/server";
import { Receiver } from "@upstash/qstash";
import { env } from "@/server/env";
import { runJob } from "@/server/jobs/run";
import type { Job } from "@/server/queue";

export const runtime = "nodejs";
export const maxDuration = 120;

/** QStash delivery endpoint. Signature-verified; a non-2xx response makes QStash retry with backoff. */
export async function POST(req: Request) {
  const e = env();
  const body = await req.text();
  if (e.QSTASH_CURRENT_SIGNING_KEY && e.QSTASH_NEXT_SIGNING_KEY) {
    const receiver = new Receiver({ currentSigningKey: e.QSTASH_CURRENT_SIGNING_KEY, nextSigningKey: e.QSTASH_NEXT_SIGNING_KEY });
    const valid = await receiver.verify({ signature: req.headers.get("upstash-signature") ?? "", body }).catch(() => false);
    if (!valid) return new NextResponse("Invalid signature", { status: 401 });
  } else if (e.NODE_ENV === "production") {
    return new NextResponse("Queue signing keys are not configured", { status: 401 });
  }
  let job: Job;
  try {
    job = JSON.parse(body) as Job;
  } catch {
    return new NextResponse("Bad request", { status: 400 });
  }
  try {
    await runJob(job);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[jobs] failed", job, err);
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}
