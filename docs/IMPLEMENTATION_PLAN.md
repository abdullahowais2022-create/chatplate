# TillText — Implementation Plan

TillText is an AI WhatsApp ordering assistant for local restaurants. Customers order
entirely inside WhatsApp; restaurant staff run everything from a dashboard.
There is **no customer-facing website and no online payment** of any kind.

## 1. Architecture

```
WhatsApp customer ──▶ Meta Cloud API ──▶ POST /api/webhooks/whatsapp/{webhookKey}
                                              │  1. verify X-Hub-Signature-256 (per-restaurant app secret)
                                              │  2. store WebhookEvent (unique on Meta id → idempotent)
                                              │  3. enqueue job (QStash, or inline in dev)
                                              ▼
                                   POST /api/jobs/process (QStash-signed)
                                              │
              ┌───────────────────────────────┼─────────────────────────────────┐
              ▼                               ▼                                 ▼
     media download + Whisper        AI pipeline (src/server/ai)          status updates
     (voice notes → transcript)      extract → validate → decide →        (sent/delivered/read/failed)
                                     compose reply
                                              │
                                              ▼
                      Postgres (Prisma) ◀── dashboard (Next.js App Router) ◀── staff
```

* **Single Next.js 15 app** (App Router, TypeScript). API route handlers form the REST API;
  server components read through the same service layer, so authorization lives in one place.
* **Postgres + Prisma 6**. Every tenant-owned row carries `restaurantId`; every query goes through
  `requireSession()` which yields the caller's `restaurantId`. No endpoint accepts a restaurant id
  from the client.
* **Queue**: Upstash QStash (HTTP based, works on Vercel). Without `QSTASH_TOKEN` the job runs in-process
  (`after()`), which is fine for local development.
* **Storage**: Supabase Storage (private bucket for voice notes, public bucket for logos/menu images);
  falls back to the local filesystem in development.
* **Realtime**: the dashboard polls a tiny `/api/live` endpoint (a per-restaurant change cursor) and
  refreshes server components when something changed. Works on any serverless host. It can be swapped for
  Pusher/Supabase Realtime later without touching pages.

## 2. The AI pipeline (core design decision)

The model is **never trusted with facts**. Each inbound message goes through:

1. **Extract** (LLM, JSON-schema structured output). Input: the live menu (ids, names in every language,
   variants, add-ons, availability), the current cart, recent history, and restaurant facts. Output:
   the required extraction JSON (intent, language, the *full updated cart*, order type, address, and so on).
2. **Validate** (deterministic code, `src/server/ai/validate.ts`). Every item must resolve to a real,
   available menu item. Variants and add-ons must belong to that item. Prices are **recomputed from the
   database**; the model's prices are discarded. Sold-out, unknown, and ambiguous items become *issues*.
   The delivery address or pin is checked against delivery zones. Scheduled times are checked against opening hours.
3. **Decide** (deterministic state machine, `src/server/ai/flow.ts`). Decides the next step: ask a
   clarifying question, ask for missing info (order type → address → name → time → payment preference if
   enabled), show the summary, create/modify/cancel the order, or hand off to a human.
4. **Compose** (LLM). It writes a short reply in the customer's language using *only* the facts the
   decision step hands it. The order summary itself (lines, prices, totals) is rendered by code with
   localized labels, so the numbers can never be hallucinated.

If `OPENAI_API_KEY` is missing (demo mode), a heuristic extractor and template replies are used, so
the playground and simulator still work.

## 3. Conversation states

`IDLE → ORDERING → AWAITING_CONFIRMATION → (order created) → IDLE`
Conversation `mode` is `AI` or `HUMAN`. In `HUMAN` mode the AI only produces *suggested* replies
for staff and never sends anything.

## 4. Build order (MVP)

1. Repo scaffold, Tailwind/shadcn UI kit, logo/brand.
2. Prisma schema + migration + seed (demo restaurant, menu, customers, conversations, orders).
3. Auth (email/password, DB sessions, roles) + tenant scoping + audit log + rate limiting + encryption.
4. WhatsApp: webhook verify/receive, signature check, idempotency, queue, send with retries,
   status tracking, media download.
5. AI pipeline: extraction, validation, flow, composer, voice transcription, i18n labels.
6. Dashboard: overview, inbox (takeover, manual reply, AI suggestions), orders (filters, status,
   assign, print), menu manager, business settings, customers, team, WhatsApp connection, notifications,
   AI playground.
7. Onboarding wizard.
8. Docs: README, WhatsApp setup, deployment, manual steps.

## 5. Product decisions (documented assumptions)

| Decision | Choice | Why |
|---|---|---|
| Webhook routing | One webhook URL per restaurant (`/api/webhooks/whatsapp/{webhookKey}`), each with its own verify token and app secret | Restaurants bring their own Meta app; there are no shared secrets across tenants |
| Prices | Always recomputed server-side | The AI must never invent prices |
| Cart edits | The model returns the *full* updated cart, and code diffs it | Handles "make it 4 instead of 3" and "remove the fries" reliably |
| Editable statuses | `NEW`, `CONFIRMED` | Once the kitchen is preparing, changes go to a human |
| Phone numbers | AES-256-GCM encrypted, plus HMAC hash for lookup | "Secure storage of customer phone numbers" |
| Credentials | Access token and app secret encrypted with `ENCRYPTION_KEY` | Never returned to the browser; the UI only shows "set / not set" |
| Staff invites | The owner creates the account with a temporary password | No email provider is required for the MVP |
| Outbound when not connected | Messages are stored as `SIMULATED` | Demo mode works with no Meta account |
| 24-hour window | Free-form sends are blocked outside it, with a clear error in the inbox | Meta policy: templates are required (documented) |
| Payments | Only a stored *preference* | Per the requirements: no payment processing at all |
