import "server-only";
import type { NotificationType } from "@prisma/client";
import { db } from "../db";
import { bumpLive } from "../live";
import { enqueue } from "../queue";
import { sendEmail } from "../email";
import { decryptOrNull, normalizePhone } from "../crypto";
import { getCredentials, sendMessage } from "../whatsapp/client";
import { env } from "../env";

/** Creates a dashboard notification and queues optional email / WhatsApp delivery. */
export async function notify(input: { restaurantId: string; type: NotificationType; title: string; body?: string; link?: string }) {
  const n = await db.notification.create({ data: input });
  await bumpLive(input.restaurantId);
  const r = await db.restaurant.findUnique({ where: { id: input.restaurantId } });
  if (!r) return n;
  const wanted =
    (input.type === "NEW_ORDER" && r.notifyOnNewOrder) ||
    (input.type === "NEEDS_HUMAN" && r.notifyOnNeedsHuman) ||
    (input.type === "COMPLAINT" && r.notifyOnComplaint) ||
    input.type === "ORDER_CANCELLED";
  if (wanted && (r.notifyEmail || r.notifyWhatsApp)) {
    await enqueue({ type: "deliver-notification", notificationId: n.id }, { dedupeId: `notif-${n.id}` }).catch((err) =>
      console.error("[notify] enqueue failed", err),
    );
  }
  return n;
}

export async function deliverNotification(notificationId: string) {
  const n = await db.notification.findUnique({ where: { id: notificationId }, include: { restaurant: true } });
  if (!n) return;
  const r = n.restaurant;
  const link = n.link ? `${env().APP_URL.replace(/\/$/, "")}${n.link}` : "";
  const text = [n.title, n.body, link].filter(Boolean).join("\n\n");

  if (r.notifyEmail && !n.emailSentAt) {
    const staff = await db.user.findMany({
      where: { restaurantId: r.id, isActive: true, deletedAt: null, emailNotifications: true, role: { in: ["OWNER", "MANAGER"] } },
      select: { email: true },
    });
    const to = [...new Set([...r.notifyEmailAddresses, ...staff.map((s) => s.email)])];
    if (await sendEmail(to, `[${r.name}] ${n.title}`, text)) {
      await db.notification.update({ where: { id: n.id }, data: { emailSentAt: new Date() } });
    }
  }

  if (r.notifyWhatsApp && !n.whatsappSentAt) {
    const to = decryptOrNull(r.notifyWhatsAppNumberEnc);
    const creds = to ? await getCredentials(r.id) : null;
    if (to && creds) {
      // Business-initiated: only delivered if the owner messaged this number within 24h (or via an approved template).
      try {
        await sendMessage(creds, normalizePhone(to), { kind: "text", text: `🔔 ${text}` });
        await db.notification.update({ where: { id: n.id }, data: { whatsappSentAt: new Date() } });
      } catch (err) {
        console.warn("[notify] WhatsApp staff alert failed", (err as Error).message);
      }
    }
  }
}
