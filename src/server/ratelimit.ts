import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { env } from "./env";
import { tooMany } from "./http";

type Window = `${number} ${"s" | "m" | "h"}`;
const limiters = new Map<string, Ratelimit>();
const memory = new Map<string, { count: number; resetAt: number }>();

function windowMs(w: Window): number {
  const [n, unit] = w.split(" ") as [string, "s" | "m" | "h"];
  return Number(n) * { s: 1000, m: 60_000, h: 3_600_000 }[unit];
}

/**
 * Sliding-window rate limit. Uses Upstash Redis when configured (shared across instances),
 * otherwise a per-instance in-memory fixed window (adequate for local dev).
 */
export async function rateLimit(bucket: string, id: string, limit: number, window: Window): Promise<boolean> {
  const e = env();
  if (e.UPSTASH_REDIS_REST_URL && e.UPSTASH_REDIS_REST_TOKEN) {
    const name = `${bucket}:${limit}:${window}`;
    let rl = limiters.get(name);
    if (!rl) {
      rl = new Ratelimit({
        redis: new Redis({ url: e.UPSTASH_REDIS_REST_URL, token: e.UPSTASH_REDIS_REST_TOKEN }),
        limiter: Ratelimit.slidingWindow(limit, window),
        prefix: `cp:rl:${bucket}`,
      });
      limiters.set(name, rl);
    }
    const { success } = await rl.limit(id);
    return success;
  }
  const k = `${bucket}:${id}`;
  const now = Date.now();
  const entry = memory.get(k);
  if (!entry || entry.resetAt < now) {
    memory.set(k, { count: 1, resetAt: now + windowMs(window) });
    if (memory.size > 10_000) for (const [key, v] of memory) if (v.resetAt < now) memory.delete(key);
    return true;
  }
  entry.count += 1;
  return entry.count <= limit;
}

export async function enforceRateLimit(bucket: string, id: string, limit: number, window: Window) {
  if (!(await rateLimit(bucket, id, limit, window))) throw tooMany();
}
