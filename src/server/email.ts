import "server-only";
import { env } from "./env";

/** Sends an email through Resend's HTTP API. No-op (returns false) when not configured. */
export async function sendEmail(to: string[], subject: string, text: string): Promise<boolean> {
  const e = env();
  if (!e.RESEND_API_KEY || to.length === 0) return false;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${e.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: e.EMAIL_FROM, to, subject, text }),
  });
  if (!res.ok) {
    console.error("[email] send failed", res.status, await res.text().catch(() => ""));
    return false;
  }
  return true;
}
