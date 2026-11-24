# Security review — TillText

Reviewed: November 2026, whole codebase (API routes, auth, multi-tenancy, WhatsApp webhooks, AI pipeline, uploads, storage, headers, dependencies). Every finding below was fixed and checked with automated tests and live requests against a production build, unless it is listed under "Your to-do".

## Summary

No critical issues were found. Data isolation between businesses holds everywhere: every database read and write is limited to the signed-in user's business, and asking for another business's order, customer or chat returns "not found". Passwords are hashed with bcrypt, WhatsApp tokens and customer phone numbers are encrypted (AES-256-GCM), and WhatsApp webhooks are signature-checked.

## Fixed in this review

| # | Severity | Finding | Fix |
|---|---|---|---|
| 1 | High | Known vulnerabilities in dependencies: zod (memory exhaustion on oversized input), postcss inside Next.js, and Prisma CLI's `effect` / `deepmerge-ts`. | Upgraded zod to 4.6.7 and forced patched postcss, effect and deepmerge-ts versions. `npm audit` now reports **0 vulnerabilities**. |
| 2 | Medium | Request bodies were parsed with no size limit, so a huge JSON body could tie up memory. | Bodies are size-capped while streaming, before parsing (128 KB default; larger only for the AI photo import and playground). Over-limit requests get `413`. |
| 3 | Medium | No protection against cross-site requests beyond the `SameSite=Lax` cookie. | Every signed-in API call now checks the `Origin` header matches the site; mismatches get `403 Cross-site request blocked`. |
| 4 | Medium | Staff created with a temporary password were never made to change it. | They are sent to a "Choose your own password" page and every API call is blocked until they do. The new password must differ from the temporary one. |
| 5 | Medium | With `DEMO_MODE=true`, anyone using the shared demo login could add owners, change WhatsApp credentials or change the demo password. | The demo account can no longer manage the team, WhatsApp, or its password. |
| 6 | Medium | Anyone can sign up, so throwaway accounts could run up the OpenAI bill through the AI playground, suggestions, translation and AI setup. | Daily cap of 400 AI-tool uses per business (on top of per-minute limits). Real customer WhatsApp chats are not capped. AI label translations only run for real language codes. |
| 7 | Medium | Files are stored in the database, so one account could fill it with uploads. | 100 MB image quota per business, 10 MB maximum per stored file. Voice-note storage failures no longer stop the order from being understood. |
| 8 | Low | No Content Security Policy. | Added a CSP (scripts only from this site and Facebook's SDK, no plugins, no framing, forms only to this site) plus `Cross-Origin-Opener-Policy` and a stricter `Permissions-Policy`. |
| 9 | Low | Session cookie could in theory be planted from another subdomain. | In production the cookie is now `__Host-tt_session` (HTTPS-only, this host only). Everyone is signed out once after this update. |
| 10 | Low | Logo and product image links accepted any text (e.g. `javascript:`). | Only uploaded images or `https://` links are accepted. |
| 11 | Low | A malformed WhatsApp signature header could make the webhook throw (500) instead of rejecting it. | Signatures must be exactly 64 hex characters; anything else is rejected with `401`. |
| 12 | Low | Managers running the setup wizard received the WhatsApp webhook verify token (owner-only). | Hidden from non-owners. |

New automated tests cover the signature edge cases, image-link validation, and any-language handling (47 tests in total).

## Already in place (checked)

- Sign-in: bcrypt (cost 12), constant-time handling of unknown emails, rate limits per IP and per email, sessions stored as HMAC hashes, `HttpOnly` cookie, other sessions revoked on password change, sessions revoked when a member is deactivated or removed.
- Roles enforced on the server for every action (Owner / Manager / Staff); the UI only hides buttons.
- Webhooks: HMAC-SHA256 signature check with timing-safe comparison, idempotent processing, per-IP rate limit. Background jobs require QStash signatures in production.
- Uploads: file type checked by its actual bytes (PNG/JPEG/WebP only, no SVG), 2 MB limit, served with `nosniff` and a sandboxing CSP.
- WhatsApp media is only downloaded from Meta's own domains, so the access token never goes elsewhere.
- AI: customer text is treated as untrusted data; prices, totals, stock and hours always come from the database, never from the model. No payment data is ever requested or stored.
- No secrets in the Git repository (`.env` is ignored).

## Your to-do (needs your accounts)

1. **Keep `DEMO_MODE` off in Vercel** unless you want a public demo. Even locked down, demo visitors can edit the demo business.
2. **Add Upstash Redis** (`UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`). Without it, rate limits and the AI quota are counted separately on each Vercel server instance, so they are weaker than intended.
3. **Set a spending limit in your OpenAI account** (platform.openai.com → Limits) as a final safety net.
4. **Consider email verification for sign-ups** (needs Resend). Today anyone can register with any email address.
5. **Never change `ENCRYPTION_KEY` or `HASH_KEY`** once real data exists. Store them somewhere safe (a password manager).
6. Turn on **GitHub Dependabot alerts** (repo → Settings → Code security) so new dependency issues are reported automatically.
