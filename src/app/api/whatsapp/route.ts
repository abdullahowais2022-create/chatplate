import { embeddedSignupConfig } from "@/server/whatsapp/embedded";
import { isPlatformAdmin } from "@/server/env";
import { route, ok, parseJson, clientIp, badRequest, forbidden } from "@/server/http";
import { requireApiSession } from "@/server/auth/session";
import { whatsappCredentialsSchema } from "@/lib/schemas";
import { db } from "@/server/db";
import { decryptOrNull, encrypt } from "@/server/crypto";
import { env } from "@/server/env";
import { getWhatsAppStatus } from "@/server/services/queries";
import { getPhoneNumberInfo, graphFetch, MetaApiError } from "@/server/whatsapp/client";
import { randomInt } from "node:crypto";
import { audit } from "@/server/audit";

export const GET = route(async () => {
  const s = await requireApiSession("whatsapp:manage");
  return ok(await getWhatsAppStatus(s.restaurantId, env().APP_URL, s.email));
});

/** Saves credentials (encrypted) and verifies them against the Graph API. */
export const PUT = route(async (req) => {
  const s = await requireApiSession("whatsapp:manage");
  if (embeddedSignupConfig() && !isPlatformAdmin(s.email)) throw forbidden("Use Connect with Facebook to connect WhatsApp.");
  const input = await parseJson(req, whatsappCredentialsSchema);
  const acc = await db.whatsAppAccount.findUniqueOrThrow({ where: { restaurantId: s.restaurantId } });
  const accessToken = input.accessToken ?? decryptOrNull(acc.accessTokenEnc);
  if (!accessToken) throw badRequest("An access token is required");
  if (!input.appSecret && !acc.appSecretEnc) throw badRequest("The app secret is required to verify webhook signatures");

  const conflictAcc = await db.whatsAppAccount.findFirst({ where: { phoneNumberId: input.phoneNumberId, NOT: { id: acc.id } } });
  if (conflictAcc) throw badRequest("This phone number is already connected to another business");

  let status: "PENDING_VERIFICATION" | "CONNECTED" | "ERROR" = "PENDING_VERIFICATION";
  let lastError: string | null = null;
  let display = input.displayPhoneNumber ?? acc.displayPhoneNumber;
  let pin = decryptOrNull(acc.registrationPinEnc);
  try {
    const creds = { phoneNumberId: input.phoneNumberId, accessToken, wabaId: input.wabaId };
    const info = await getPhoneNumberInfo(creds);
    display = info.display_phone_number ?? display;
    // Make sure Meta sends this account's messages to our app's webhook (safe to repeat).
    await graphFetch(creds, `/${input.wabaId}/subscribed_apps`, { method: "POST" }).catch((err) => console.warn("[whatsapp] subscribe failed", (err as Error).message));
    // A real number added in Meta's dashboard must be registered on the Cloud API before it can message.
    if (info.platform_type && info.platform_type !== "CLOUD_API") {
      pin ??= String(randomInt(0, 1_000_000)).padStart(6, "0");
      await graphFetch(creds, `/${input.phoneNumberId}/register`, { method: "POST", body: JSON.stringify({ messaging_product: "whatsapp", pin }) });
    }
    if (acc.webhookVerifiedAt) status = "CONNECTED";
  } catch (err) {
    status = "ERROR";
    lastError = err instanceof MetaApiError ? err.message : "Could not reach the WhatsApp API";
  }

  await db.whatsAppAccount.update({
    where: { id: acc.id },
    data: {
      wabaId: input.wabaId,
      phoneNumberId: input.phoneNumberId,
      displayPhoneNumber: display,
      ...(input.accessToken ? { accessTokenEnc: encrypt(input.accessToken) } : {}),
      ...(input.appSecret ? { appSecretEnc: encrypt(input.appSecret) } : {}),
      ...(pin ? { registrationPinEnc: encrypt(pin) } : {}),
      ...(input.accessToken ? { usesPlatformToken: false, tokenExpiresAt: null } : {}),
      status,
      lastError,
    },
  });
  await audit({ restaurantId: s.restaurantId, actorType: "STAFF", actorUserId: s.userId, action: "whatsapp.credentials_updated", entityType: "WhatsAppAccount", entityId: acc.id, after: { wabaId: input.wabaId, phoneNumberId: input.phoneNumberId, tokenChanged: Boolean(input.accessToken), secretChanged: Boolean(input.appSecret), status }, ip: clientIp(req) });
  return ok(await getWhatsAppStatus(s.restaurantId, env().APP_URL, s.email));
});

export const DELETE = route(async (req) => {
  const s = await requireApiSession("whatsapp:manage");
  const acc = await db.whatsAppAccount.update({
    where: { restaurantId: s.restaurantId },
    // Forget everything about the old number so nothing stale is shown.
    data: { accessTokenEnc: null, appSecretEnc: null, phoneNumberId: null, wabaId: null, displayPhoneNumber: null, status: "NOT_CONNECTED", webhookVerifiedAt: null, lastWebhookAt: null, lastTestAt: null, lastError: null, usesPlatformToken: false, tokenExpiresAt: null },
  });
  await audit({ restaurantId: s.restaurantId, actorType: "STAFF", actorUserId: s.userId, action: "whatsapp.disconnected", entityType: "WhatsAppAccount", entityId: acc.id, ip: clientIp(req) });
  return ok(await getWhatsAppStatus(s.restaurantId, env().APP_URL, s.email));
});
