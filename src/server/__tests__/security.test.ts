import { describe, expect, it } from "vitest";
import { createHmac } from "node:crypto";
import { verifyMetaSignature } from "../whatsapp/signature";
import { menuItemSchema, profileSchema } from "@/lib/schemas";

describe("webhook signature", () => {
  const body = '{"object":"whatsapp_business_account"}';
  const good = `sha256=${createHmac("sha256", "s3cret").update(body).digest("hex")}`;
  it("accepts a valid signature and rejects a wrong one", () => {
    expect(verifyMetaSignature(body, good, "s3cret")).toBe(true);
    expect(verifyMetaSignature(body, good, "other")).toBe(false);
  });
  it("never throws on malformed signatures", () => {
    for (const h of [null, "", "sha256=", "sha256=zz", `sha256=${"z".repeat(64)}`, `sha256=${"a".repeat(63)}`, "md5=abc"]) {
      expect(() => verifyMetaSignature(body, h, "s3cret")).not.toThrow();
      expect(verifyMetaSignature(body, h, "s3cret")).toBe(false);
    }
  });
});

describe("image links", () => {
  const base = { name: "Shop", timezone: "UTC", currency: "USD" };
  it("allows uploads and https links", () => {
    expect(profileSchema.safeParse({ ...base, logoUrl: "/api/media/public/abc/def.webp" }).success).toBe(true);
    expect(profileSchema.safeParse({ ...base, logoUrl: "https://cdn.example.com/logo.png" }).success).toBe(true);
    expect(profileSchema.safeParse({ ...base, logoUrl: "" }).success).toBe(true);
  });
  it("blocks script and data links", () => {
    for (const bad of ["javascript:alert(1)", "data:text/html,<script>", "http://insecure.example/x.png", "https://x.com/\"onerror=alert(1)"]) {
      expect(profileSchema.safeParse({ ...base, logoUrl: bad }).success).toBe(false);
      expect(menuItemSchema.safeParse({ categoryId: "c", name: "x", price: 1, imageUrl: bad }).success).toBe(false);
    }
  });
});
