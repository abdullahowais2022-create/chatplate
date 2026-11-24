# Connecting a restaurant's WhatsApp Business number

TillText uses the official **Meta WhatsApp Cloud API**. Each restaurant connects its own number, Meta app and credentials. Nothing is shared between restaurants.

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
