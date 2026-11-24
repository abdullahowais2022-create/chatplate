import "server-only";
import { db } from "../db";
import { decryptOrNull } from "../crypto";
import { env } from "../env";

export type WhatsAppCredentials = { phoneNumberId: string; accessToken: string; wabaId: string | null };

export class MetaApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: number,
    public retryable = false,
  ) {
    super(message);
  }
}

/** Meta error codes that are worth retrying (throttling / transient). */
const RETRYABLE_CODES = new Set([1, 2, 4, 17, 341, 80007, 130429, 131000, 131016, 131056]);
const MAX_ATTEMPTS = 4;

const graphBase = () => `https://graph.facebook.com/${env().META_GRAPH_API_VERSION}`;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Human-readable explanations for common Meta errors, shown in the dashboard. */
export function explainMetaError(code?: number, fallback?: string): string {
  switch (code) {
    case 190:
      return "The access token is invalid or expired. Generate a new permanent (System User) token.";
    case 10:
    case 200:
      return "The token lacks permission. Grant whatsapp_business_messaging and whatsapp_business_management.";
    case 100:
      return "Invalid parameter. Check the Phone Number ID.";
    case 131047:
      return "More than 24 hours have passed since the customer's last message. Meta only allows approved templates now.";
    case 131026:
      return "Message undeliverable. The number may not be on WhatsApp.";
    case 130429:
    case 80007:
      return "Meta rate limit reached. The message will be retried.";
    case 131030:
      return "This number isn't on your test number's allowed list. In Meta: WhatsApp → Step 1. Try it out → Recipient → add the number and confirm the code.";
    case 132001:
      return "Meta's hello_world template doesn't exist on this WhatsApp account. Instead, send a WhatsApp message from your phone to the business number to test.";
    case 131058:
      return "Meta's hello_world template can't be sent from this number. Send a WhatsApp message from your phone to the business number to test instead.";
    case 133005:
      return "This number already has a two-step verification PIN. In WhatsApp Manager → Phone numbers → your number → Two-step verification, turn it off (or reset it), then press Save & verify again.";
    case 133016:
      return "Meta has temporarily limited registration attempts for this number. Wait a few hours, then press Save & verify again.";
    case 133010:
      return "The phone number is not registered on the Cloud API.";
    default:
      return fallback ?? "WhatsApp API request failed.";
  }
}

export async function graphFetch<T>(creds: WhatsAppCredentials, path: string, init: RequestInit = {}): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(`${graphBase()}${path}`, {
        ...init,
        headers: { Authorization: `Bearer ${creds.accessToken}`, "Content-Type": "application/json", ...init.headers },
        signal: AbortSignal.timeout(15_000),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: { message?: string; code?: number } } & T;
      if (res.ok) return json;
      const code = json.error?.code;
      const retryable = res.status === 429 || res.status >= 500 || (code !== undefined && RETRYABLE_CODES.has(code));
      throw new MetaApiError(explainMetaError(code, json.error?.message), res.status, code, retryable);
    } catch (err) {
      lastErr = err;
      const retryable = err instanceof MetaApiError ? err.retryable : true; // network / timeout errors
      if (!retryable || attempt === MAX_ATTEMPTS) break;
      await sleep(300 * 2 ** (attempt - 1) + Math.random() * 200);
    }
  }
  if (lastErr instanceof MetaApiError) throw lastErr;
  throw new MetaApiError(`Could not reach the WhatsApp API: ${(lastErr as Error)?.message ?? "unknown error"}`, 0, undefined, true);
}

export async function getCredentials(restaurantId: string): Promise<WhatsAppCredentials | null> {
  const acc = await db.whatsAppAccount.findUnique({ where: { restaurantId } });
  if (!acc?.phoneNumberId || !acc.accessTokenEnc) return null;
  const accessToken = decryptOrNull(acc.accessTokenEnc);
  if (!accessToken) return null;
  return { phoneNumberId: acc.phoneNumberId, accessToken, wabaId: acc.wabaId };
}

// ───────────── Outbound message shapes ─────────────

export type ReplyButton = { id: string; title: string };

export type OutboundContent =
  | { kind: "text"; text: string }
  | { kind: "buttons"; text: string; buttons: ReplyButton[]; footer?: string }
  | { kind: "location_request"; text: string };

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

export function toGraphPayload(to: string, content: OutboundContent) {
  const base = { messaging_product: "whatsapp", recipient_type: "individual", to };
  switch (content.kind) {
    case "text":
      return { ...base, type: "text", text: { body: clip(content.text, 4096), preview_url: false } };
    case "buttons":
      return {
        ...base,
        type: "interactive",
        interactive: {
          type: "button",
          body: { text: clip(content.text, 1024) },
          ...(content.footer ? { footer: { text: clip(content.footer, 60) } } : {}),
          action: {
            buttons: content.buttons.slice(0, 3).map((b) => ({ type: "reply", reply: { id: b.id, title: clip(b.title, 20) } })),
          },
        },
      };
    case "location_request":
      return {
        ...base,
        type: "interactive",
        interactive: { type: "location_request_message", body: { text: clip(content.text, 1024) }, action: { name: "send_location" } },
      };
  }
}

export async function sendMessage(creds: WhatsAppCredentials, to: string, content: OutboundContent) {
  const res = await graphFetch<{ messages?: { id: string }[] }>(creds, `/${creds.phoneNumberId}/messages`, {
    method: "POST",
    body: JSON.stringify(toGraphPayload(to, content)),
  });
  const id = res.messages?.[0]?.id;
  if (!id) throw new MetaApiError("WhatsApp did not return a message id", 500);
  return id;
}

/** Marks an inbound message as read (blue ticks) and shows a typing indicator. Best effort. */
export async function markRead(creds: WhatsAppCredentials, waMessageId: string) {
  await graphFetch(creds, `/${creds.phoneNumberId}/messages`, {
    method: "POST",
    body: JSON.stringify({ messaging_product: "whatsapp", status: "read", message_id: waMessageId, typing_indicator: { type: "text" } }),
  }).catch((err) => console.warn("[whatsapp] markRead failed", (err as Error).message));
}

const MAX_MEDIA_BYTES = 16 * 1024 * 1024;

/** Two-step media download: resolve the media URL, then fetch it with the bearer token. */
export async function downloadMedia(creds: WhatsAppCredentials, mediaId: string) {
  const meta = await graphFetch<{ url: string; mime_type: string; file_size?: number }>(creds, `/${encodeURIComponent(mediaId)}`);
  if (meta.file_size && meta.file_size > MAX_MEDIA_BYTES) throw new MetaApiError("Media file is too large", 413);
  const url = new URL(meta.url);
  if (!url.hostname.endsWith(".fbsbx.com") && !url.hostname.endsWith(".facebook.com") && !url.hostname.endsWith(".whatsapp.net")) {
    throw new MetaApiError("Unexpected media host", 400);
  }
  let lastErr: unknown;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(meta.url, { headers: { Authorization: `Bearer ${creds.accessToken}` }, signal: AbortSignal.timeout(30_000) });
      if (!res.ok) throw new MetaApiError(`Media download failed (${res.status})`, res.status, undefined, res.status >= 500);
      const data = Buffer.from(await res.arrayBuffer());
      if (data.length > MAX_MEDIA_BYTES) throw new MetaApiError("Media file is too large", 413);
      return { data, mimeType: meta.mime_type };
    } catch (err) {
      lastErr = err;
      if (err instanceof MetaApiError && !err.retryable) break;
      await sleep(500 * attempt);
    }
  }
  throw lastErr;
}

/** Used by the connection test: reads the phone number's display name and status. */
export async function getPhoneNumberInfo(creds: WhatsAppCredentials) {
  return graphFetch<{ display_phone_number?: string; verified_name?: string; quality_rating?: string; platform_type?: string; id: string }>(
    creds,
    `/${creds.phoneNumberId}?fields=display_phone_number,verified_name,quality_rating,platform_type`,
  );
}
