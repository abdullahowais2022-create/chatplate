import { route, ok, parseJson, clientIp, badRequest } from "@/server/http";
import { requireApiSession } from "@/server/auth/session";
import { whatsappCredentialsSchema } from "@/lib/schemas";
import { db } from "@/server/db";
import { decryptOrNull, encrypt } from "@/server/crypto";
import { env } from "@/server/env";
import { getWhatsAppStatus } from "@/server/services/queries";
import { getPhoneNumberInfo, MetaApiError } from "@/server/whatsapp/client";
import { audit } from "@/server/audit";

export const GET = route(async () => {
  const s = await requireApiSession("whatsapp:manage");
  return ok(await getWhatsAppStatus(s.restaurantId, env().APP_URL));
});

/** Saves credentials (encrypted) and verifies them against the Graph API. */
export const PUT = route(async (req) => {
  const s = await requireApiSession("whatsapp:manage");
  const input = await parseJson(req, whatsappCredentialsSchema);
  const acc = await db.whatsAppAccount.findUniqueOrThrow({ where: { restaurantId: s.restaurantId } });
  const accessToken = input.accessToken ?? decryptOrNull(acc.accessTokenEnc);
  if (!accessToken) throw badRequest("An access token is required");
  if (!input.appSecret && !acc.appSecretEnc) throw badRequest("The app secret is required to verify webhook signatures");

  const conflictAcc = await db.whatsAppAccount.findFirst({ where: { phoneNumberId: input.phoneNumberId, NOT: { id: acc.id } } });
  if (conflictAcc) throw badRequest("This phone number is already connected to another restaurant");

  let status: "PENDING_VERIFICATION" | "CONNECTED" | "ERROR" = "PENDING_VERIFICATION";
  let lastError: string | null = null;
  let display = input.displayPhoneNumber ?? acc.displayPhoneNumber;
  try {
    const info = await getPhoneNumberInfo({ phoneNumberId: input.phoneNumberId, accessToken, wabaId: input.wabaId });
    display = info.display_phone_number ?? display;
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
      status,
      lastError,
    },
  });
  await audit({ restaurantId: s.restaurantId, actorType: "STAFF", actorUserId: s.userId, action: "whatsapp.credentials_updated", entityType: "WhatsAppAccount", entityId: acc.id, after: { wabaId: input.wabaId, phoneNumberId: input.phoneNumberId, tokenChanged: Boolean(input.accessToken), secretChanged: Boolean(input.appSecret), status }, ip: clientIp(req) });
  return ok(await getWhatsAppStatus(s.restaurantId, env().APP_URL));
});

export const DELETE = route(async (req) => {
  const s = await requireApiSession("whatsapp:manage");
  const acc = await db.whatsAppAccount.update({
    where: { restaurantId: s.restaurantId },
    data: { accessTokenEnc: null, appSecretEnc: null, phoneNumberId: null, status: "NOT_CONNECTED", webhookVerifiedAt: null, lastError: null },
  });
  await audit({ restaurantId: s.restaurantId, actorType: "STAFF", actorUserId: s.userId, action: "whatsapp.disconnected", entityType: "WhatsAppAccount", entityId: acc.id, ip: clientIp(req) });
  return ok(await getWhatsAppStatus(s.restaurantId, env().APP_URL));
});
