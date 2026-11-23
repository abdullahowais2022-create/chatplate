"use client";

export class ApiClientError extends Error {
  constructor(message: string, public status: number, public code?: string) {
    super(message);
  }
}

/** Typed fetch wrapper for our REST API. Throws ApiClientError with a user-friendly message. */
export async function api<T = unknown>(path: string, opts: { method?: string; body?: unknown; form?: FormData } = {}): Promise<T> {
  const res = await fetch(path, {
    method: opts.method ?? (opts.body || opts.form ? "POST" : "GET"),
    headers: opts.form ? undefined : { "Content-Type": "application/json" },
    body: opts.form ?? (opts.body !== undefined ? JSON.stringify(opts.body) : undefined),
    credentials: "same-origin",
  });
  if (res.status === 401 && typeof window !== "undefined" && !path.startsWith("/api/auth")) {
    window.location.href = "/login";
  }
  const json = (await res.json().catch(() => null)) as { data?: T; error?: { message: string; code?: string } } | null;
  if (!res.ok) throw new ApiClientError(json?.error?.message ?? `Request failed (${res.status})`, res.status, json?.error?.code);
  return json?.data as T;
}
