# Connecting a business's WhatsApp number

TillText uses the official **Meta WhatsApp Cloud API**. There are two ways for a business to connect:

- **One-click connect (recommended).** The business owner presses **Connect with Facebook** in TillText, logs in to Facebook in Meta's own window, picks or creates their WhatsApp Business account and verifies their number with an SMS code. TillText then sets up the webhook, permissions and number registration automatically. This needs a **one-time setup by whoever runs TillText** (you), described in the next section.
- **Manual connect.** The business creates its own Meta app and pastes the credentials into TillText (sections 0–6 below). Always available as a fallback.

## One-click connect: one-time setup for the TillText owner

You do this once. After it, every business that signs up connects WhatsApp by itself in about 2 minutes.

Meta only lets approved platforms ("Tech Providers") offer one-click signup, so this part includes a Meta review. Allow a few days for Meta's checks.

1. **Meta Business account.** At business.facebook.com, create (or use) the business account for TillText itself and complete **Business verification** (Settings → Security Center). Meta requires this before other businesses can connect through you.
2. **Create TillText's Meta app.** developers.facebook.com/apps → **Create app** → use case **Other** → type **Business** → attach it to the business above. Add the **WhatsApp** product.
3. **Become a Tech Provider.** In the app dashboard: WhatsApp → **Quickstart / Getting started** → follow "Become a Tech Provider" (this is where Meta asks for business verification and app review).
4. **Facebook Login for Business.** Add the product **Facebook Login for Business** → Settings:
   - Allowed domains for the JavaScript SDK: your TillText domain (e.g. `chatplate.vercel.app`).
   - Valid OAuth redirect URIs: `https://YOUR-DOMAIN/`.
   - Then **Configurations → Create configuration** → choose the **WhatsApp Embedded Signup** template, select the permissions `whatsapp_business_management` and `whatsapp_business_messaging`, and save. Copy the **Configuration ID**.
5. **App review.** Request **Advanced access** for `whatsapp_business_management` and `whatsapp_business_messaging` (App Review → Permissions and features). Meta asks for a short screen recording: record a business connecting through TillText's **Connect with Facebook** button and sending a test message.
6. **Webhook (one URL for all businesses).** WhatsApp → Configuration → Webhook → Edit:
   - Callback URL: `https://YOUR-DOMAIN/api/webhooks/whatsapp`
   - Verify token: any long random text. Put the same text in `META_WEBHOOK_VERIFY_TOKEN` (step 7). Set the variable and redeploy *before* you click **Verify and save**.
   - Subscribe to the **messages** field.
7. **Add these to Vercel** (Project → Settings → Environment Variables), then redeploy:

   | Name | Where to find it |
   |---|---|
   | `META_APP_ID` | App dashboard → App settings → Basic → App ID |
   | `META_APP_SECRET` | Same page → App secret (click Show) |
   | `META_EMBEDDED_SIGNUP_CONFIG_ID` | The Configuration ID from step 4 |
   | `META_WEBHOOK_VERIFY_TOKEN` | The random text you chose in step 6 |

Once these are set, **Settings → WhatsApp** and the onboarding wizard show the blue **Connect with Facebook** button instead of the manual form. Until Meta approves your app (steps 3 and 5), only people with a role on your Meta app (admins, developers, testers) can complete the popup, which is handy for testing.

What TillText does after the popup closes: it swaps Meta's one-time code for a long-lived business token, confirms that token really controls the chosen number, subscribes your app to that business's webhooks, registers the number on the Cloud API with a random two-step PIN, and stores the token and PIN encrypted. Webhooks for every connected business arrive at the single URL from step 6, are checked against `META_APP_SECRET`, and are routed to the right business by phone number.

---

# Manual connection

Each business can instead connect its own number, Meta app and credentials. Nothing is shared between businesses.

Allow about 30 minutes, plus Meta's review times.

## 0. Prerequisites

- A **Meta Business account** (business.facebook.com). Verifying the business raises messaging limits and is needed for production.
- A phone number that can receive an SMS or call and is **not** registered on the regular WhatsApp or WhatsApp Business app. To move a number off the app, delete the WhatsApp account on that phone first.
- TillText deployed on a **public HTTPS URL**, with `APP_URL` set to it. For local development, use a tunnel such as `cloudflared tunnel --url http://localhost:3000` or `ngrok http 3000`, and set `APP_URL` to the tunnel URL.

## 1. Create a Meta app

1. Go to https://developers.facebook.com/apps → **Create app** → choose **Business** (or "Other → Business").
2. Add the **WhatsApp** product, and select or create your Business portfolio.
3. Under **App settings → Basic**, copy the **App secret**. TillText uses it to verify that webhooks really come from Meta.

## 2. Add the phone number

1. Go to **WhatsApp → API Setup → Add phone number**. Enter the display name and category, then verify the number by SMS or voice call.
2. From **API Setup**, copy:
   - **Phone number ID**
   - **WhatsApp Business Account ID**

The temporary token on this page expires after 24 hours, so don't use it in production.

## 3. Create a permanent access token

1. Go to **Business Settings → Users → System users → Add**, with the Admin role.
2. **Assign assets:** add your Meta app and your WhatsApp account, with full control.
3. Click **Generate new token**, select the app, set the expiry to **Never**, and grant these permissions:
   - `whatsapp_business_messaging`
   - `whatsapp_business_management`
4. Copy the token. Meta only shows it once.

## 4. Enter the credentials in TillText

In **Settings → WhatsApp** (or onboarding step 6):

1. Enter the **WhatsApp Business Account ID**, **Phone Number ID**, **permanent access token** and **App secret**.
2. Click **Save & verify**. TillText calls the Graph API to check the number and token. The token and secret are encrypted before they're stored and are never shown again.

## 5. Configure the webhook

1. In TillText, copy the **Callback URL** (`https://your-app/api/webhooks/whatsapp/<key>`) and the **Verify token**.
2. In the Meta app, go to **WhatsApp → Configuration → Webhook → Edit**, paste both values, and click **Verify and save**. Meta calls the URL, and TillText answers the challenge and marks the webhook as verified.
3. Under **Webhook fields**, click **Manage** and **subscribe to `messages`**. This one field delivers incoming messages *and* sent/delivered/read/failed statuses.
4. If your app is in Development mode, only numbers listed as testers can message it. Switch the app to **Live** when you're ready.

The status in TillText changes to **Connected** once the webhook is verified and credentials are saved, or as soon as the first event arrives.

## 6. Test it

1. In **Settings → WhatsApp → Send a test message**, enter your personal number. TillText sends Meta's pre-approved `hello_world` template.
2. From your phone, message the business number something like "Hi! 2 large pepperoni pizzas for pickup". Watch the conversation appear in **Live inbox** and the order in **Orders** after you tap **Confirm**.

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| Meta says "The callback URL or verify token couldn't be validated" | The URL isn't public HTTPS, `APP_URL` is wrong, or the verify token was copied wrongly. Rotate it and paste again. |
| Messages arrive in Meta but not in TillText | You didn't subscribe to the `messages` field; the app secret is wrong (the server log shows `invalid signature` and returns 401); or the phone number ID belongs to another app. |
| `(#190) access token expired` | You used the temporary token. Create a System User token (step 3). |
| Replies show **Failed: more than 24 hours…** | WhatsApp only allows free-form replies within 24h of the customer's last message. Ask the customer to message again, or set up approved templates. |
| Voice notes show "Transcription failed" | Check `OPENAI_API_KEY`. Notes over 16 MB are rejected. |
| Customer messages get no reply | Check that **AI assistant replies automatically** is on in Business settings → AI, that the conversation isn't in *Staff handling* mode, and that the customer isn't tagged **Blocked**. |

## How TillText uses the API

- `POST /{phone-number-id}/messages`: text, interactive reply buttons (≤3) and location-request messages, retried with exponential backoff on throttling and 5xx errors.
- `POST /{phone-number-id}/messages` with `status: "read"`: marks customer messages as read and shows the typing indicator.
- `GET /{media-id}` followed by an authenticated download: voice notes, stored privately and then transcribed.
- `GET /{phone-number-id}`: credential verification.
