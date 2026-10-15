# Notify-Me (React Native) — run & install

React Native port of the native `NotifyMe/` app. Same engine (call detection + webhook
delivery) ported verbatim into native Android; the UI is React Native / TypeScript.

## Architecture
- **JS/TS (UI only):** `App.tsx`, `src/theme.ts`, `src/NotifyMe.ts`, `src/ui/widgets.tsx`.
- **Native engine (Android, `com.notifyme`):** ported 1:1 from the Java app —
  `PhoneStateReceiver` → `CallEventWorker` → `WebhookWorker`, gated by `EventGate`,
  config in `ConfigStore`, number/name via `CallLogLookup` / `ContactLookup` /
  `CallScreenService`, payloads via `PlatformFormatter` / `Alert`.
- **Bridge:** `NotifyMeModule.kt` (+ `NotifyMePackage.kt`) — the only new native code.
  Exposes config/status/history/test to JS; the caller-ID screening role (RoleManager)
  runs natively because RN can't request it from JS.

## Prereqs
- Node 20+, JDK **17**, Android SDK (platform-34, build-tools).
- This machine: `JAVA_HOME=/opt/homebrew/opt/openjdk@17`,
  `ANDROID_HOME=/opt/homebrew/share/android-commandlinetools` (set in `android/local.properties`).

## Run on a device (real phone — emulator can't take real calls)
```bash
# terminal 1 — Metro
npm start
# terminal 2 — build + install on the connected device
npm run android
```
Or build the APK directly:
```bash
cd android
JAVA_HOME=/opt/homebrew/opt/openjdk@17 ./gradlew :app:assembleDebug
# output: app/build/outputs/apk/debug/app-debug.apk
```

## First run (Android rules — same as the native app)
1. **Open the app once** after install — Android keeps a fresh app "stopped" and won't
   deliver `PHONE_STATE` until first launch (survives reboots after that).
2. Paste your webhook URL, pick the platform (Slack / Discord / Teams / Zoho Cliq / Generic), **Save**.
   For Zoho Cliq also enter the bot's webhook token (and optionally your Cliq email), and add the
   bot handler from `docs/zoho-cliq-incoming-handler.deluge` — see *Zoho Cliq Setup* in `README.md`.
3. **Send test message** → confirm it lands in your channel.
4. Turn **Notifications** on → grant phone-state / call-log / contacts (+ notifications on 13+).
5. Optionally **Enable caller ID** (screening role) so incoming alerts show the number.
6. Disable **battery optimization** for Notify-Me; on Samsung / Xiaomi / Oppo / OnePlus also
   enable **Autostart** — otherwise the OS may kill the receiver when the app is closed.

## Verify
- Test send → channel + green history row.
- Schedule outside now → call → no alert; inside now → `📞 Incoming…`.
- Force on (outside hours) fires; Pause now (inside hours) mutes.
- Real incoming call with app swiped away → still fires.
- Missed call → `📵 Missed call from …`.
