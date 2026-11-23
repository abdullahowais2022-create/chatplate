import { z } from "zod";

// Subset of the Meta webhook payload we rely on. Unknown fields pass through untouched.
const contact = z.object({ wa_id: z.string(), profile: z.object({ name: z.string().optional() }).partial().optional() }).passthrough();

const inboundMessage = z
  .object({
    from: z.string(),
    id: z.string(),
    timestamp: z.string(),
    type: z.string(),
    text: z.object({ body: z.string() }).optional(),
    audio: z.object({ id: z.string(), mime_type: z.string().optional(), voice: z.boolean().optional() }).optional(),
    image: z.object({ id: z.string(), caption: z.string().optional(), mime_type: z.string().optional() }).optional(),
    video: z.object({ id: z.string(), caption: z.string().optional() }).passthrough().optional(),
    document: z.object({ id: z.string(), caption: z.string().optional(), filename: z.string().optional() }).passthrough().optional(),
    location: z
      .object({ latitude: z.number(), longitude: z.number(), name: z.string().optional(), address: z.string().optional() })
      .optional(),
    interactive: z
      .object({
        type: z.string(),
        button_reply: z.object({ id: z.string(), title: z.string() }).optional(),
        list_reply: z.object({ id: z.string(), title: z.string() }).optional(),
      })
      .passthrough()
      .optional(),
    button: z.object({ payload: z.string().optional(), text: z.string().optional() }).optional(),
    reaction: z.object({ emoji: z.string().optional(), message_id: z.string().optional() }).passthrough().optional(),
  })
  .passthrough();

const status = z
  .object({
    id: z.string(),
    status: z.enum(["sent", "delivered", "read", "failed", "deleted", "warning"]).or(z.string()),
    timestamp: z.string(),
    recipient_id: z.string().optional(),
    errors: z.array(z.object({ code: z.number().optional(), title: z.string().optional(), message: z.string().optional() }).passthrough()).optional(),
  })
  .passthrough();

export const webhookSchema = z.object({
  object: z.string(),
  entry: z.array(
    z.object({
      id: z.string(),
      changes: z.array(
        z.object({
          field: z.string(),
          value: z
            .object({
              metadata: z.object({ phone_number_id: z.string(), display_phone_number: z.string().optional() }).optional(),
              contacts: z.array(contact).optional(),
              messages: z.array(inboundMessage).optional(),
              statuses: z.array(status).optional(),
            })
            .passthrough(),
        }),
      ),
    }),
  ),
});

export type InboundWaMessage = z.infer<typeof inboundMessage>;
export type WaStatus = z.infer<typeof status>;

export type NormalizedEvent =
  | { kind: "message"; externalId: string; phoneNumberId: string; message: InboundWaMessage; profileName: string | null }
  | { kind: "status"; externalId: string; phoneNumberId: string; status: WaStatus };

/** Flattens a webhook payload into individually idempotent events. */
export function normalizeWebhook(body: unknown): NormalizedEvent[] {
  const parsed = webhookSchema.safeParse(body);
  if (!parsed.success || parsed.data.object !== "whatsapp_business_account") return [];
  const out: NormalizedEvent[] = [];
  for (const entry of parsed.data.entry) {
    for (const change of entry.changes) {
      if (change.field !== "messages") continue;
      const v = change.value;
      const phoneNumberId = v.metadata?.phone_number_id ?? "";
      for (const m of v.messages ?? []) {
        const contactName = v.contacts?.find((c) => c.wa_id === m.from)?.profile?.name ?? null;
        out.push({ kind: "message", externalId: `msg:${m.id}`, phoneNumberId, message: m, profileName: contactName });
      }
      for (const s of v.statuses ?? []) {
        out.push({ kind: "status", externalId: `status:${s.id}:${s.status}`, phoneNumberId, status: s });
      }
    }
  }
  return out;
}
