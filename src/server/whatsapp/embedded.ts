import "server-only";
import { randomInt } from "node:crypto";
import { db } from "../db";
import { encrypt, decryptOrNull } from "../crypto";
import { env } from "../env";
import { explainMetaError, graphFetch, MetaApiError } from "./client";

/**
 * One-click WhatsApp connection using Meta's Embedded Signup.
 *
 * The business owner clicks "Connect WhatsApp", logs into Facebook in a popup, picks or creates their
 * WhatsApp Business Account and verifies their phone number with a code. Meta then gives the browser a
 * short-lived `code` plus the WABA id and phone number id. This module finishes the job server-side:
 *   1. swaps the code for a long-lived business token,
 *   2. checks the token really controls that phone number,
 *   3. subscribes TillText's Meta app to the account's webhooks,
 *   4. registers the number on the Cloud API (with a random two-step PIN),
 *   5. saves everything encrypted.
 * Webhooks for these accounts arrive at the shared /api/webhooks/whatsapp endpoint.
 */

export type EmbeddedSignupConfig = { appId: string; configId: string; graphVersion: string };

/** Public settings the browser needs to open the signup popup, or null if the platform hasn't set it up. */
export function embeddedSignupConfig(): EmbeddedSignupConfig | null {
  const e = env();
  if (!e.META_APP_ID || !e.META_APP_SECRET || !e.META_EMBEDDED_SIGNUP_CONFIG_ID) return null;
  return { appId: e.META_APP_ID, configId: e.META_EMBEDDED_SIGNUP_CONFIG_ID, graphVersion: e.META_GRAPH_API_VERSION };
}

async function exchangeOnce(code: string, redirectUri: string | null) {
  const e = env();
  const url = new URL(`https://graph.facebook.com/${e.META_GRAPH_API_VERSION}/oauth/access_token`);
  url.searchParams.set("client_id", e.META_APP_ID!);
  url.searchParams.set("client_secret", e.META_APP_SECRET!);
  url.searchParams.set("code", code);
  if (redirectUri !== null) url.searchParams.set("redirect_uri", redirectUri);
  const res = await fetch(url, { signal: AbortSignal.timeout(15_000) }).catch(() => {
    throw new MetaApiError("Couldn't reach Facebook to finish the connection. Please try again in a moment.", 503);
  });
  const json = (await res.json().catch(() => ({}))) as { access_token?: string; expires_in?: number; error?: { message?: string; code?: number } };
  return { res, json };
}

/**
 * Swaps Meta's one-time code for an access token. Meta ties the code to the page the login ran on, and
 * depending on how the popup was opened it expects no redirect_uri or that exact page address, so we try
 * the likely variants (a code that fails a redirect check isn't used up).
 */
async function exchangeCode(code: string, pageUrl?: string | null): Promise<{ token: string; expiresAt: Date | null }> {
  const candidates: (string | null)[] = [null];
  if (pageUrl) {
    try {
      const u = new URL(pageUrl);
      const appOrigin = new URL(env().APP_URL).origin;
      if (u.origin === appOrigin) candidates.push(u.href.split("#")[0]!, `${u.origin}${u.pathname}`, `${u.origin}/`);
    } catch {
      /* ignore a malformed page URL */
    }
  }
  let last: { message?: string; code?: number } | undefined;
  let status = 400;
  for (const redirectUri of [...new Set(candidates)]) {
    const { res, json } = await exchangeOnce(code, redirectUri);
    if (res.ok && json.access_token) {
      return { token: json.access_token, expiresAt: json.expires_in ? new Date(Date.now() + json.expires_in * 1000) : null };
    }
    last = json.error;
    status = res.status || 400;
    if (!/redirect_uri/i.test(json.error?.message ?? "")) break; // a different problem: don't keep trying
  }
  const redirectProblem = /redirect_uri/i.test(last?.message ?? "");
  throw new MetaApiError(
    redirectProblem
      ? "Facebook login worked, but Meta rejected the page address. In your Meta app → Facebook Login for Business → Settings, add https://tilltext.vercel.app/dashboard/settings and https://tilltext.vercel.app/onboarding to Valid OAuth Redirect URIs, save, then press Connect again."
      : last?.message
        ? `Facebook login could not be completed: ${last.message}`
        : "Facebook login could not be completed. Please try again.",
    status,
    last?.code,
  );
}

/**
 * Gives TillText's own Admin system user access to the business's WhatsApp account, so messages can be
 * sent with TillText's permanent token. Returns true if that token can now reach the phone number.
 * Embedded Signup shares the account with TillText's business portfolio, which makes this possible.
 */
async function attachPlatformSystemUser(wabaId: string, phoneNumberId: string): Promise<boolean> {
  const token = env().META_SYSTEM_USER_TOKEN;
  if (!token) return false;
  const creds = { accessToken: token, phoneNumberId, wabaId };
  try {
    const me = await graphFetch<{ id: string }>(creds, "/me?fields=id");
    await graphFetch(creds, `/${wabaId}/assigned_users?user=${encodeURIComponent(me.id)}&tasks=${encodeURIComponent('["MANAGE"]')}`, { method: "POST" }).catch((err) => {
      // Already assigned is fine; anything else is checked by the read below.
      console.warn("[embedded] assign system user:", (err as Error).message);
    });
    await graphFetch(creds, `/${phoneNumberId}?fields=id`);
    return true;
  } catch (err) {
    console.warn("[embedded] platform token can't reach this number yet:", (err as Error).message);
    return false;
  }
}

type PhoneInfo = { display_phone_number?: string; verified_name?: string; platform_type?: string; code_verification_status?: string };

/**
 * Finds the WhatsApp account and number a business just shared, using only the token. Used when Meta's
 * window didn't pass the ids back to the page (its postMessage is sometimes lost).
 */
async function discoverSharedNumber(accessToken: string): Promise<{ wabaId: string; phoneNumberId: string }> {
  const e = env();
  const url = new URL(`https://graph.facebook.com/${e.META_GRAPH_API_VERSION}/debug_token`);
  url.searchParams.set("input_token", accessToken);
  url.searchParams.set("access_token", `${e.META_APP_ID}|${e.META_APP_SECRET}`);
  const res = await fetch(url, { signal: AbortSignal.timeout(15_000) }).catch(() => null);
  const json = (await res?.json().catch(() => null)) as { data?: { granular_scopes?: { scope: string; target_ids?: string[] }[] } } | null;
  const wabaIds = [...new Set((json?.data?.granular_scopes ?? []).filter((g) => g.scope === "whatsapp_business_management" || g.scope === "whatsapp_business_messaging").flatMap((g) => g.target_ids ?? []))];
  if (!wabaIds.length) throw new MetaApiError("Facebook login worked, but no WhatsApp Business account was shared. In Meta's window, choose or create a WhatsApp Business account and add your number, then press Finish.", 400);

  type Num = { id: string; display_phone_number?: string; last_onboarded_time?: string };
  const candidates: { wabaId: string; num: Num }[] = [];
  for (const wabaId of wabaIds.slice(0, 5)) {
    const list = await graphFetch<{ data?: Num[] }>({ accessToken, phoneNumberId: "", wabaId }, `/${wabaId}/phone_numbers?fields=id,display_phone_number,last_onboarded_time`).catch(() => null);
    for (const num of list?.data ?? []) candidates.push({ wabaId, num });
  }
  if (!candidates.length) throw new MetaApiError("Your WhatsApp Business account was shared, but it has no phone number yet. Run Connect with Facebook again and add your number in Meta's window.", 400);
  candidates.sort((a, b) => (b.num.last_onboarded_time ?? "").localeCompare(a.num.last_onboarded_time ?? ""));
  return { wabaId: candidates[0]!.wabaId, phoneNumberId: candidates[0]!.num.id };
}

export async function connectWithEmbeddedSignup(
  restaurantId: string,
  request: { code: string; wabaId?: string | null; phoneNumberId?: string | null; existingApp?: boolean; pageUrl?: string | null },
): Promise<{ displayPhoneNumber: string | null; verifiedName: string | null; warning: string | null }> {
  if (!embeddedSignupConfig()) throw new MetaApiError("One-click WhatsApp connection isn't set up on this TillText server yet.", 400);

  const { token: accessToken, expiresAt } = await exchangeCode(request.code, request.pageUrl);
  const ids = request.wabaId && request.phoneNumberId ? { wabaId: request.wabaId, phoneNumberId: request.phoneNumberId } : await discoverSharedNumber(accessToken);
  const input = { ...ids, existingApp: request.existingApp };

  const conflict = await db.whatsAppAccount.findFirst({ where: { phoneNumberId: input.phoneNumberId, NOT: { restaurantId } } });
  if (conflict) throw new MetaApiError("This phone number is already connected to another business on TillText.", 409);

  const creds = { accessToken, phoneNumberId: input.phoneNumberId, wabaId: input.wabaId };

  // Proves the token controls this number (ids from the browser are otherwise untrusted).
  const info = await graphFetch<PhoneInfo>(creds, `/${input.phoneNumberId}?fields=display_phone_number,verified_name,platform_type,code_verification_status`);

  // Receive this account's messages on TillText's app webhook.
  await graphFetch(creds, `/${input.wabaId}/subscribed_apps`, { method: "POST" });

  // Register the number for the Cloud API. Already-registered numbers report CLOUD_API and are fine.
  // Numbers that stay on the WhatsApp Business app (coexistence) are already registered by Meta.
  const existing = await db.whatsAppAccount.findUnique({ where: { restaurantId }, select: { registrationPinEnc: true } });
  const pin = decryptOrNull(existing?.registrationPinEnc) ?? String(randomInt(0, 1_000_000)).padStart(6, "0");
  let warning: string | null = null;
  if (!input.existingApp) {
    try {
      await graphFetch(creds, `/${input.phoneNumberId}/register`, { method: "POST", body: JSON.stringify({ messaging_product: "whatsapp", pin }) });
    } catch (err) {
      const after = await graphFetch<PhoneInfo>(creds, `/${input.phoneNumberId}?fields=platform_type`).catch(() => null);
      if (after?.platform_type !== "CLOUD_API") {
        warning = `WhatsApp is linked, but the number couldn't be activated yet: ${err instanceof MetaApiError ? err.message : explainMetaError()}. Try "Connect" again in a few minutes.`;
      }
    }
  }

  // Prefer TillText's permanent token so the connection never expires.
  const usesPlatformToken = await attachPlatformSystemUser(input.wabaId, input.phoneNumberId);

  await db.whatsAppAccount.update({
    where: { restaurantId },
    data: {
      usesPlatformToken,
      tokenExpiresAt: usesPlatformToken ? null : expiresAt,
      wabaId: input.wabaId,
      phoneNumberId: input.phoneNumberId,
      displayPhoneNumber: info.display_phone_number ?? null,
      accessTokenEnc: encrypt(accessToken),
      appSecretEnc: null, // signatures are checked with the platform app secret instead
      registrationPinEnc: encrypt(pin),
      connectionMethod: input.existingApp ? "coexistence" : "embedded",
      status: warning ? "ERROR" : "CONNECTED",
      webhookVerifiedAt: new Date(),
      lastError: warning,
    },
  });
  return { displayPhoneNumber: info.display_phone_number ?? null, verifiedName: info.verified_name ?? null, warning };
}
