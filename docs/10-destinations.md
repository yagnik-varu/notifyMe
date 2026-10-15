# 10. Destinations (where alerts are posted)

**What you'll learn:** what each supported chat service needs from the user and the exact JSON Notify-Me POSTs to it for an incoming call, a missed call and a test. You'll also find the full Zoho Cliq setup (bot handler, token, curl check, troubleshooting) and what every error message means.

A **destination** has two halves with the **same id**:

| Half | Where | Responsible for |
|---|---|---|
| JS definition | [`src/destinations/`](../src/destinations/) (registry in `index.ts`) | The setup screen: label, icon, color, URL placeholder and hints, extra fields, validation. |
| Native class | [`android/.../delivery/destinations/`](../android/app/src/main/java/com/notifyme/delivery/destinations/) (registry in `Destinations.java`) | Sending: final URL, JSON body, service-specific error wording. |

Sending is native because it has to work while the app is closed. To add a service, see [guides/add-a-destination.md](guides/add-a-destination.md).

Every request is an HTTP **POST** with `Content-Type: application/json; charset=utf-8` and a 15-second timeout ([`WebhookClient.java`](../android/app/src/main/java/com/notifyme/delivery/WebhookClient.java)).

In the examples below the caller is `Jane (+15550001111)` and the call came in at 22:13. When the number couldn't be found, the caller is shown as `number unavailable`. These are the same values the golden tests in [`DestinationsPayloadTest.java`](../android/app/src/test/java/com/notifyme/delivery/destinations/DestinationsPayloadTest.java) check.

---

## Slack, Microsoft Teams, Generic: plain text

Classes: [`SlackDestination`](../android/app/src/main/java/com/notifyme/delivery/destinations/SlackDestination.java), [`TeamsDestination`](../android/app/src/main/java/com/notifyme/delivery/destinations/TeamsDestination.java), [`GenericDestination`](../android/app/src/main/java/com/notifyme/delivery/destinations/GenericDestination.java). All three extend [`TextOnlyDestination`](../android/app/src/main/java/com/notifyme/delivery/destinations/TextOnlyDestination.java).

| Service | What the user pastes | Example |
|---|---|---|
| Slack | An *Incoming Webhook* URL (Slack app → Incoming Webhooks) | `https://hooks.slack.com/services/T000/B000/XXXX` |
| Teams | An *Incoming Webhook* connector URL | `https://<tenant>.webhook.office.com/...` |
| Generic | Any HTTPS endpoint that accepts JSON | `https://example.com/webhook` |

The URL is used as-is. Body, one field:

```json
{"text": "📞 Incoming call from Jane (+15550001111) at 22:13"}
{"text": "📵 Missed call from number unavailable at 22:13"}
{"text": "✅ Test from Notify-Me — your webhook works."}
```

The success message in Activity says "Delivered to Slack" / "Delivered to Teams" / "Delivered to **your webhook**" (Generic).

> Teams: this matches the classic Office 365 connector. Microsoft's newer *Workflows* webhooks expect an Adaptive Card instead. To support those, override `buildBody` in `TeamsDestination`; nothing else changes.

---

## Discord: colored embed

Class: [`DiscordDestination`](../android/app/src/main/java/com/notifyme/delivery/destinations/DiscordDestination.java). The user pastes a channel webhook (Server Settings → Integrations → Webhooks), e.g. `https://discord.com/api/webhooks/...`.

Discord ignores a top-level `"text"`, so Notify-Me sends an **embed** (a card with a colored bar):

```json
{"embeds":[{"title":"📞 Incoming call","description":"From **Jane (+15550001111)**","color":3066993,"footer":{"text":"22:13"}}]}
{"embeds":[{"title":"📵 Missed call","description":"From **number unavailable**","color":15548997,"footer":{"text":"22:13"}}]}
{"embeds":[{"title":"✅ Test","description":"Your webhook works.","color":5793266,"footer":{"text":"22:13"}}]}
```

`color` is a decimal RGB value (from `Alert.color()`):

| Kind | Decimal | Hex |
|---|---|---|
| Incoming | 3066993 | `#2ECC71` green |
| Missed | 15548997 | `#ED4245` red |
| Test | 5793266 | `#5865F2` Discord blurple |

`**…**` is Discord markdown for bold.

---

## Zoho Cliq

Bot incoming webhook + a handler script. Class: [`CliqDestination`](../android/app/src/main/java/com/notifyme/delivery/destinations/CliqDestination.java). JS: [`src/destinations/cliq/`](../src/destinations/cliq/).

Cliq works differently from the others. Notify-Me posts **plain data** to a Cliq **bot's** incoming webhook. A small **Deluge** script inside the bot (the "incoming webhook handler") turns that data into a card in the bot chat. It works with company custom domains too (e.g. `cliq.mycompany.com`).

### What's sent

**URL:** the saved endpoint plus the token: `…/api/v2/bots/<bot>/incoming?zapikey=<token>`. `CliqDestination.withToken()` adds `?zapikey=` (or `&zapikey=` if the URL already has a query string) with the token URL-encoded. It leaves the URL alone if the token field is empty or the pasted URL already contains `zapikey=`.

**Body:**

```json
{"kind":"incoming","title":"📞 Incoming call","caller":"Jane (+15550001111)","time":"22:13","text":"*Jane (+15550001111)* at 22:13"}
{"kind":"missed","title":"📵 Missed call","caller":"","time":"22:13","text":"*number unavailable* at 22:13"}
{"kind":"test","title":"✅ Test","caller":"","time":"22:13","text":"Your webhook works."}
```

If the user entered a Cliq email, a `"userids": "me@company.com"` field is added (trimmed) and the alert goes only to that person's chat with the bot. `text` is Cliq markdown, where bold is `*single star*`.

The handler, [`docs/zoho-cliq-incoming-handler.deluge`](zoho-cliq-incoming-handler.deluge), reads that body and returns a message with `text`, a card titled `title` (theme `modern-inline`), and `userids` when present.

### Setup

1. **Copy the endpoint and token** from your bot (**Bots & Tools** → **Bots** → your bot):
   - Incoming webhook endpoint, e.g. `https://cliq.mycompany.com/api/v2/bots/notify/incoming`
   - Webhook token. If your bot page doesn't show one, generate it under profile → **Bots & Tools** → **Webhook Tokens**.
2. **Add the handler:** open the bot → **Edit Handlers** → **Incoming Webhook Handler**, paste [`zoho-cliq-incoming-handler.deluge`](zoho-cliq-incoming-handler.deluge), **Save**.
3. **In the app:** pick **Zoho Cliq**, paste the endpoint into **Bot endpoint URL** and the token into **Webhook token**. Optionally enter **Your Cliq email** so alerts go only to you. **Save**, then **Send test**.

The app warns, without blocking, if the URL doesn't contain `/bots/` or if no token is given. A malformed email blocks saving.

To check from a computer first:

```bash
curl -i -X POST "https://cliq.mycompany.com/api/v2/bots/notify/incoming?zapikey=<token>" \
  -H "Content-Type: application/json" \
  -d '{"kind":"test","title":"✅ Test","caller":"","time":"20:00","text":"Your webhook works."}'
```

### Troubleshooting

*Send test* shows the result right under the button, and failed alerts appear in **Activity** with the reason:

- *"Cliq didn't accept the webhook token"*: copy the token again from your bot.
- *"Bot not found"*: check the endpoint URL and bot name.
- *"Cliq couldn't read the message"*: the Notify-Me handler isn't saved in your bot.
- *Test delivered* but nothing in Cliq: the handler isn't returning a message, or the email doesn't match a bot subscriber. Clear **Your Cliq email** and try again.

Errors a retry can't fix (bad token, wrong URL) are reported straight away. Network problems are retried in the background.

---

## Error messages

The reason shown in Activity and in the test banner comes from [`DeliveryErrors.java`](../android/app/src/main/java/com/notifyme/delivery/DeliveryErrors.java). A destination can override the wording through `failureTextOrNull(code)`; only Cliq does.

**"Permanent"** means a retry can't help, so the failure is recorded immediately. **"Retried"** means WorkManager tries again with backoff (up to 6 runs in total), and the message only appears if the last attempt also fails.

### HTTP status codes

| Code | Permanent? | Message (most services) | Message (Zoho Cliq) |
|---|---|---|---|
| 2xx | – (success) | "Delivered to <service>" | "Delivered to Zoho Cliq" |
| 400, 422 | yes | The service didn't accept the message. Check that the right destination is selected. | Cliq couldn't read the message. Make sure the Notify-Me handler is saved in your bot. |
| 401 | yes | The service rejected this webhook. It may have been revoked — create a new one. | Cliq didn't accept the webhook token. Copy it again from your bot. |
| 403 | yes | Not allowed to post to this webhook. | This token isn't allowed to post to that bot. |
| 404, 410 | yes | Webhook not found. The link may be wrong or deleted. | Bot not found. Check the endpoint URL and bot name. |
| 405 | yes | This link doesn't accept messages. Check the webhook URL. | (same) |
| 413 | yes | The message was too large for the service. | (same) |
| 408 | **retried** | The service didn't accept the message. | (same) |
| 429 | **retried** | Too many messages right now. Try again in a few minutes. | (same) |
| other 4xx | yes | The service didn't accept the message. | (same) |
| 5xx | **retried** | The service is having trouble right now. Try again later. | (same) |

### Network errors (no HTTP status)

| Cause | Permanent? | Message |
|---|---|---|
| `http://` link blocked by Android ("Cleartext") | yes | Plain http:// links aren't allowed. Use an https:// link. |
| Malformed URL | yes | The webhook URL isn't valid. It should start with https:// |
| DNS failure (`UnknownHostException`) | retried | Couldn't find the server. Check the URL and your internet connection. |
| Timeout (15 s) | retried | The server took too long to respond. |
| TLS/SSL problem | retried | Couldn't make a secure connection to the server. |
| Connection refused | retried | Couldn't connect. Check your internet connection. |
| Anything else | retried | Something went wrong while sending. Check your connection and try again. |

Rows saved by older app versions may contain raw texts like `HTTP 401` or `Network error`. The UI translates those with `friendlyDetail()` in [`src/domain/history.ts`](../src/domain/history.ts).

---

Next: [11. Testing and debugging](11-testing-and-debugging.md)
