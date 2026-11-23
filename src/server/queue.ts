import "server-only";
import { Client } from "@upstash/qstash";
import { after } from "next/server";
import { env } from "./env";

export type Job =
  | { type: "process-webhook-event"; eventId: string }
  | { type: "deliver-notification"; notificationId: string };

let client: Client | null = null;

/**
 * Enqueue a background job. In production this goes through Upstash QStash, which retries with
 * backoff and calls POST /api/jobs (signature-verified). Without QSTASH_TOKEN the job runs in-process
 * after the response has been sent (development only).
 */
export async function enqueue(job: Job, opts: { dedupeId?: string } = {}) {
  const e = env();
  if (e.QSTASH_TOKEN) {
    client ??= new Client({ token: e.QSTASH_TOKEN });
    await client.publishJSON({
      url: `${e.APP_URL.replace(/\/$/, "")}/api/jobs`,
      body: job,
      retries: 4,
      deduplicationId: opts.dedupeId,
    });
    return;
  }
  const run = async () => {
    const { runJob } = await import("./jobs/run");
    try {
      await runJob(job);
    } catch (err) {
      console.error("[queue] inline job failed", job, err);
    }
  };
  try {
    after(run);
  } catch {
    // Not inside a request scope (scripts/tests): run detached.
    void run();
  }
}
