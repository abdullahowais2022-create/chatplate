import { describe, expect, it } from "vitest";
import { createHmac } from "node:crypto";
import { verifyMetaSignature } from "../signature";
import { normalizeWebhook } from "../payload";

const SECRET = "0123456789abcdef0123456789abcdef";
const sign = (body: string, secret = SECRET) => `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;

const payload = {
  object: "whatsapp_business_account",
  entry: [
    {
      id: "WABA",
      changes: [
        {
          field: "messages",
          value: {
            metadata: { phone_number_id: "111", display_phone_number: "15550000000" },
            contacts: [{ wa_id: "447700900123", profile: { name: "Wendy" } }],
            messages: [
              { from: "447700900123", id: "wamid.A", timestamp: "1700000000", type: "text", text: { body: "2 pizzas" } },
              { from: "447700900123", id: "wamid.B", timestamp: "1700000001", type: "audio", audio: { id: "media1", mime_type: "audio/ogg; codecs=opus", voice: true } },
              { from: "447700900123", id: "wamid.C", timestamp: "1700000002", type: "interactive", interactive: { type: "button_reply", button_reply: { id: "cp:confirm", title: "Confirm" } } },
            ],
            statuses: [{ id: "wamid.OUT", status: "delivered", timestamp: "1700000003", recipient_id: "447700900123" }],
          },
        },
      ],
    },
  ],
};

describe("webhook signature", () => {
  const body = JSON.stringify(payload);
  it("accepts a valid signature", () => expect(verifyMetaSignature(body, sign(body), SECRET)).toBe(true));
  it("rejects a tampered body", () => expect(verifyMetaSignature(body.replace("2 pizzas", "20 pizzas"), sign(body), SECRET)).toBe(false));
  it("rejects the wrong secret", () => expect(verifyMetaSignature(body, sign(body, "f".repeat(32)), SECRET)).toBe(false));
  it("rejects missing or malformed headers", () => {
    expect(verifyMetaSignature(body, null, SECRET)).toBe(false);
    expect(verifyMetaSignature(body, "sha1=abc", SECRET)).toBe(false);
    expect(verifyMetaSignature(body, "sha256=zz", SECRET)).toBe(false);
  });
});

describe("webhook normalisation", () => {
  it("flattens messages and statuses into idempotent events", () => {
    const events = normalizeWebhook(payload);
    expect(events.map((e) => e.externalId)).toEqual(["msg:wamid.A", "msg:wamid.B", "msg:wamid.C", "status:wamid.OUT:delivered"]);
    const first = events[0]!;
    expect(first.kind === "message" && first.profileName).toBe("Wendy");
  });
  it("ignores unrelated objects and malformed payloads", () => {
    expect(normalizeWebhook({ object: "page", entry: [] })).toEqual([]);
    expect(normalizeWebhook({ nonsense: true })).toEqual([]);
    expect(normalizeWebhook(null)).toEqual([]);
  });
});
