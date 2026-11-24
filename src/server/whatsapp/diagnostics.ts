import "server-only";
import { db } from "../db";
import { env } from "../env";
import { getCredentials, graphFetch, MetaApiError } from "./client";

/**
 * When Meta reaches TillText but the request is rejected (missing/wrong app secret), remember why on
 * the affected numbers so Settings → WhatsApp can say so. Only a fixed message is stored, never body data.
 */
export async function noteWebhookRejection(raw: string, message: string) {
  let ids: string[] = [];
  try {
    const body = JSON.parse(raw) as { entry?: { changes?: { value?: { metadata?: { phone_number_id?: unknown } } }[] }[] };
    ids = (body.entry ?? []).flatMap((e) => (e.changes ?? []).map((c) => c.value?.metadata?.phone_number_id)).filter((x): x is string => typeof x === "string" && /^\d{5,30}$/.test(x));
  } catch {
    return;
  }
  ids = [...new Set(ids)].slice(0, 10);
  if (ids.length) await db.whatsAppAccount.updateMany({ where: { phoneNumberId: { in: ids } }, data: { lastError: message } }).catch(() => undefined);
}

export type Check = { label: string; ok: boolean; detail: string; fixed?: boolean };

/** Asks Meta about this business's connection, fixes what it safely can, and explains the rest. */
export async function diagnoseWhatsApp(restaurantId: string): Promise<Check[]> {
  const e = env();
  const acc = await db.whatsAppAccount.findUnique({ where: { restaurantId } });
  const checks: Check[] = [];
  const creds = await getCredentials(restaurantId);
  if (!acc || !creds) return [{ label: "WhatsApp credentials", ok: false, detail: "No number is connected yet." }];

  // 1. Token + number
  try {
    const info = await graphFetch<{ display_phone_number?: string; platform_type?: string; status?: string; name_status?: string; code_verification_status?: string }>(
      creds,
      `/${creds.phoneNumberId}?fields=display_phone_number,platform_type,status,name_status,code_verification_status`,
    );
    checks.push({ label: "Access token", ok: true, detail: `Works for ${info.display_phone_number ?? "this number"}.` });
    const registered = !info.platform_type || info.platform_type === "CLOUD_API";
    checks.push({ label: "Number activated", ok: registered, detail: registered ? `Ready${info.status ? ` (${info.status.toLowerCase()})` : ""}.` : `Not active on the Cloud API yet (${info.platform_type}). Press Save & verify to activate it.` });
    if (info.name_status && !["APPROVED", "AVAILABLE_WITHOUT_REVIEW"].includes(info.name_status)) {
      checks.push({ label: "Display name", ok: true, detail: `Meta is reviewing the display name (${info.name_status.toLowerCase().replace(/_/g, " ")}). Messages still work.` });
    }
  } catch (err) {
    checks.push({ label: "Access token", ok: false, detail: err instanceof MetaApiError ? err.message : "Couldn't reach Meta." });
    return checks;
  }

  // 2. Is the app subscribed to this WhatsApp account's webhooks? Fix it if not.
  if (creds.wabaId) {
    try {
      const subs = await graphFetch<{ data?: { whatsapp_business_api_data?: { id?: string; name?: string } }[] }>(creds, `/${creds.wabaId}/subscribed_apps`);
      const apps = subs.data ?? [];
      const ours = e.META_APP_ID ? apps.some((a) => a.whatsapp_business_api_data?.id === e.META_APP_ID) : apps.length > 0;
      if (ours) checks.push({ label: "Messages forwarded to TillText", ok: true, detail: "Your Meta app is subscribed to this WhatsApp account." });
      else {
        await graphFetch(creds, `/${creds.wabaId}/subscribed_apps`, { method: "POST" });
        checks.push({ label: "Messages forwarded to TillText", ok: true, fixed: true, detail: "Wasn't subscribed. Fixed it: send a new WhatsApp message to test." });
      }
    } catch (err) {
      checks.push({ label: "Messages forwarded to TillText", ok: false, detail: err instanceof MetaApiError ? err.message : "Couldn't check the subscription." });
    }
  }

  // 3. Has TillText ever received anything, and is the shared webhook configured?
  const sharedReady = Boolean(e.META_APP_SECRET && e.META_WEBHOOK_VERIFY_TOKEN);
  checks.push({
    label: "Webhook settings in Vercel",
    ok: sharedReady || Boolean(acc.appSecretEnc),
    detail: sharedReady
      ? "META_APP_SECRET and META_WEBHOOK_VERIFY_TOKEN are set (shared webhook /api/webhooks/whatsapp)."
      : acc.appSecretEnc
        ? "Using this business's own webhook address and app secret."
        : "Set META_APP_SECRET and META_WEBHOOK_VERIFY_TOKEN in Vercel and redeploy.",
  });
  checks.push({
    label: "Messages received",
    ok: Boolean(acc.lastWebhookAt),
    detail: acc.lastWebhookAt
      ? `Last one ${acc.lastWebhookAt.toISOString()}.`
      : acc.lastError
        ? acc.lastError
        : "None yet. In Meta, make sure the app is Published and the webhook field “messages” is Subscribed, then message the number from your phone.",
  });
  return checks;
}
