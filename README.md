# NotifyMe (React Native) 📞 🔔

NotifyMe is a specialized utility that detects incoming/missed phone calls and sends real-time alerts to your preferred communication platforms via **Webhooks**. 

This project is a high-performance **React Native port** of a native Android engine. It combines a modern TypeScript UI with a robust Java/Kotlin background service to ensure call detection works even when the app is closed.

---

## 🚀 Key Features

- **Webhook Integration:** Supports Discord, Slack, Microsoft Teams, Zoho Cliq (bot incoming webhook), and Generic JSON payloads.
- **Background Call Detection:** Native Android receivers monitor phone states (`RINGING`, `IDLE`, `OFFHOOK`).
- **Call Screening:** Integrated with Android's `RoleManager` to provide caller identification.
- **Smart Scheduling:** Configure "Active Hours" to only receive notifications during specific times (e.g., during work hours).
- **History Tracking:** Local logs of all call events and their delivery status.
- **Battery Efficient:** Uses Android WorkManager for reliable, battery-aware webhook delivery.

---

## 💬 Zoho Cliq Setup

Cliq alerts go to your bot's **Incoming Webhook**: Notify-Me posts the call details, and a small Deluge handler in the bot turns them into a card in the bot chat. Works with company custom domains (e.g. `cliq.mycompany.com`).

1. **Copy the endpoint and token** from your bot (**Bots & Tools** → **Bots** → your bot):
   - Incoming webhook endpoint, e.g. `https://cliq.mycompany.com/api/v2/bots/notify/incoming`
   - Webhook token. If your bot page doesn't show one, generate it under profile → **Bots & Tools** → **Webhook Tokens**.
2. **Add the handler:** open the bot → **Edit Handlers** → **Incoming Webhook Handler**, paste [`docs/zoho-cliq-incoming-handler.deluge`](docs/zoho-cliq-incoming-handler.deluge), **Save**.
3. **In the app:** pick **Zoho Cliq**, paste the endpoint into **Webhook URL** and the token into **Webhook token** (the app adds `?zapikey=<token>` when sending). Optionally enter your **Cliq user email** so the alert goes only to you. **Save**, then **Send test message**.

To check from a computer first:
```bash
curl -i -X POST "https://cliq.mycompany.com/api/v2/bots/notify/incoming?zapikey=<token>" \
  -H "Content-Type: application/json" \
  -d '{"kind":"test","title":"✅ Test","caller":"","time":"20:00","text":"Your webhook works."}'
```

**Troubleshooting** (the app's *Recent* list shows the HTTP code on failure):
- `HTTP 401`: wrong or disabled token.
- `HTTP 404`: wrong URL or bot name.
- `2xx` but nothing in Cliq: the handler isn't saved, or isn't returning a message.
- Fails only with an email set: clear **Cliq user email** and try again.

---

## 🛠️ Tech Stack

- **Frontend:** React Native (0.86+), TypeScript, Lucide Icons.
- **State Management:** React Hooks (Context-like pattern for configuration).
- **Native Bridge:** Custom Kotlin Module (`NotifyMeModule`) to communicate between JS and Android OS.
- **Native Android:** Kotlin, Java, WorkManager API, Telephony API.

---

## 📂 Folder Structure Explanation

For a web developer (Next.js), here is how the project is organized:

```text
NotifyMeRN/
├── android/               # Native Android project (Java/Kotlin code lives here)
│   └── app/src/main/java/com/notifyme/
│       ├── NotifyMeModule.kt  # The "Bridge" (JS calls this file)
│       └── ...Workers         # Background tasks (Java/Kotlin only)
├── src/                   # React components and logic
│   ├── ui/                # UI Elements (Buttons, Cards, Inputs)
│   ├── theme.ts           # Styling constants (colors, spacing)
│   └── NotifyMe.ts        # Business logic types
├── App.tsx                # Main Entry Point (The "Root" of your app)
├── index.js               # Low-level entry point (registers the app)
└── package.json           # Dependencies and scripts
```

---

## 🏁 Getting Started

### Prerequisites
- **Node.js:** 20+
- **JDK:** 17 (Crucial for React Native 0.86)
- **Android SDK:** Platform 34 and Build Tools.

### Installation
1. **Clone the repo.**
2. **Install dependencies:**
   ```bash
   npm install
   ```
3. **Set up Environment:** Create a `android/local.properties` file and set your SDK path:
   ```text
   sdk.dir=C\:\\Users\\YourName\\AppData\\Local\\Android\\Sdk
   ```

### Running the App
1. **Start the Metro Bundler (Terminal 1):**
   ```bash
   npm start
   ```
2. **Launch on Android Device (Terminal 2):**
   ```bash
   # Ensure your phone is connected via USB and ADB is enabled
   npm run android
   ```

---

## 🔌 The Native Bridge

This app is unique because it interacts with phone hardware. 
- **The Native Side:** `NotifyMeModule.kt` handles things JavaScript can't do, like requesting "Caller ID" roles or checking "Battery Optimization" status.
- **The JS Side:** `App.tsx` calls `NativeModules.NotifyMeModule.methodName()` to get this data.

---

## ⚠️ Important Android Configuration

To ensure the app works in the background:
1. **Permissions:** Grant Phone, Call Log, and Contacts permissions on the first launch.
2. **Battery Optimization:** Set the app to **"Unrestricted"** in Android Settings so the system doesn't kill the call listener.
3. **Autostart:** (Xiaomi/Samsung) Enable "Autostart" in App Info.

---

## 📝 License
MIT
