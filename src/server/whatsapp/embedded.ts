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

async function exchangeCode(code: string): Promise<{ token: string; expiresAt: Date | null }> {
  const e = env();
  const url = new URL(`https://graph.facebook.com/${e.META_GRAPH_API_VERSION}/oauth/access_token`);
  url.searchParams.set("client_id", e.META_APP_ID!);
  url.searchParams.set("client_secret", e.META_APP_SECRET!);
  url.searchParams.set("code", code);
  const res = await fetch(url, { signal: AbortSignal.timeout(15_000) }).catch(() => {
    throw new MetaApiError("Couldn't reach Facebook to finish the connection. Please try again in a moment.", 503);
  });
  const json = (await res.json().catch(() => ({}))) as { access_token?: string; expires_in?: number; error?: { message?: string; code?: number } };
  if (!res.ok || !json.access_token) {
    throw new MetaApiError(json.error?.message ? `Facebook login could not be completed: ${json.error.message}` : "Facebook login could not be completed. Please try again.", res.status || 400, json.error?.code);
  }
  return { token: json.access_token, expiresAt: json.expires_in ? new Date(Date.now() + json.expires_in * 1000) : null };
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

export async function connectWithEmbeddedSignup(
  restaurantId: string,
  input: { code: string; wabaId: string; phoneNumberId: string; existingApp?: boolean },
): Promise<{ displayPhoneNumber: string | null; verifiedName: string | null; warning: string | null }> {
  if (!embeddedSignupConfig()) throw new MetaApiError("One-click WhatsApp connection isn't set up on this TillText server yet.", 400);

  const conflict = await db.whatsAppAccount.findFirst({ where: { phoneNumberId: input.phoneNumberId, NOT: { restaurantId } } });
  if (conflict) throw new MetaApiError("This phone number is already connected to another business on TillText.", 409);

  const { token: accessToken, expiresAt } = await exchangeCode(input.code);
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
