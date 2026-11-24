import "server-only";
import { NextResponse } from "next/server";
import { ZodError, type ZodTypeAny, type output } from "zod";
import { Prisma } from "@prisma/client";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code = "error",
    public details?: unknown,
  ) {
    super(message);
  }
}

export const badRequest = (msg: string, details?: unknown) => new ApiError(400, msg, "bad_request", details);
export const unauthorized = (msg = "Please sign in") => new ApiError(401, msg, "unauthorized");
export const forbidden = (msg = "You don't have permission to do that") => new ApiError(403, msg, "forbidden");
export const notFound = (msg = "Not found") => new ApiError(404, msg, "not_found");
export const conflict = (msg: string) => new ApiError(409, msg, "conflict");
export const tooMany = (msg = "Too many requests. Please slow down.") => new ApiError(429, msg, "rate_limited");

export const payloadTooLarge = (msg = "That request is too large") => new ApiError(413, msg, "payload_too_large");

/**
 * Reads and validates a JSON body. The body is size-capped *before* parsing (default 128 KB) so an
 * oversized payload can't exhaust memory during JSON parsing or schema validation.
 */
export async function parseJson<S extends ZodTypeAny>(req: Request, schema: S, opts: { maxBytes?: number } = {}): Promise<output<S>> {
  const max = opts.maxBytes ?? 128 * 1024;
  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > max) throw payloadTooLarge();
  let raw: string;
  try {
    raw = await readCapped(req, max);
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw badRequest("Could not read the request");
  }
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    throw badRequest("Request body must be valid JSON");
  }
  return schema.parse(body);
}

async function readCapped(req: Request, max: number): Promise<string> {
  if (!req.body) return "";
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) {
      await reader.cancel().catch(() => undefined);
      throw payloadTooLarge();
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString("utf8");
}

export function toErrorResponse(err: unknown) {
  if (err instanceof ApiError) {
    return NextResponse.json({ error: { code: err.code, message: err.message, details: err.details } }, { status: err.status });
  }
  if (err instanceof ZodError) {
    const message = err.issues.map((i) => (i.path.length ? `${i.path.join(".")}: ${i.message}` : i.message)).join("; ");
    return NextResponse.json({ error: { code: "validation_error", message, details: err.issues } }, { status: 422 });
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") return NextResponse.json({ error: { code: "conflict", message: "That already exists" } }, { status: 409 });
    if (err.code === "P2025") return NextResponse.json({ error: { code: "not_found", message: "Not found" } }, { status: 404 });
  }
  console.error("[api] unhandled error", err);
  return NextResponse.json({ error: { code: "internal", message: "Something went wrong. Please try again." } }, { status: 500 });
}

type Handler<C> = (req: Request, ctx: C) => Promise<Response>;

/** Wraps a route handler with uniform error handling. */
export function route<C = { params: Promise<Record<string, string>> }>(fn: Handler<C>): Handler<C> {
  return async (req, ctx) => {
    try {
      return await fn(req, ctx);
    } catch (err) {
      return toErrorResponse(err);
    }
  };
}

export const ok = <T>(data: T, init?: ResponseInit) => NextResponse.json({ data }, init);

export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  return (fwd?.split(",")[0] ?? req.headers.get("x-real-ip") ?? "unknown").trim();
}
