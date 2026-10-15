# Notify-Me (React Native)

Notify-Me is an Android app that notices incoming and missed phone calls and posts them to your team chat through a **webhook**:

> 📞 Incoming call from Jane (+15550001111) at 14:05
> 📵 Missed call from Jane (+15550001111) at 14:05

The UI is React Native + TypeScript. Call detection and delivery are native Android code, so alerts keep working when the app is closed.

## Features

- **Destinations:** Slack, Discord, Microsoft Teams, Zoho Cliq (bot incoming webhook) and Generic JSON.
- **Background call detection:** works with the app closed, after a reboot, and offline (the alert is sent once the network returns).
- **Caller names:** from the call log, Contacts, or the caller-ID role (Android 10+).
- **Office hours:** days and time window, including overnight windows, plus "Always on" / "Pause" for today.
- **Activity log:** every delivery with a plain-language reason when one fails.
- **Send test:** checks the full delivery path from inside the app.

## Quick start

Requirements: Node 22.11+, JDK 17, Android SDK (API 36), a real Android phone with USB debugging.

```bash
npm install
# tell Gradle where the SDK is:
echo "sdk.dir=C\:\\Users\\YourName\\AppData\\Local\\Android\\Sdk" > android/local.properties

npm start          # terminal 1: Metro (JS dev server)
npm run android    # terminal 2: build + install on the phone
```

Then, on the phone:

1. **Open the app once.** Android won't report calls to an app that was never opened.
2. Pick a destination, paste the webhook URL, **Save**, **Send test**.
3. Turn alerts **on** and allow phone, call log and contacts access.
4. Under **Reliability**, allow caller numbers and background running. On Samsung, Xiaomi, Oppo or OnePlus, also enable **Autostart** in the app's system settings.

Zoho Cliq needs a bot token and a small handler script. See [Destinations → Zoho Cliq](docs/10-destinations.md).

## How it works

```text
Phone rings
  └─ PhoneStateReceiver (Android)        notices RINGING / OFFHOOK / IDLE, even with the app closed
       └─ EventGate + ScheduleRules      master switch, office hours, "Today" override
            └─ CallEventWorker           background job: waits for internet, finds caller name/number
                 └─ Delivery             builds the message for the chosen destination, POSTs it,
                                         retries temporary failures, writes an Activity row
React Native screen ──bridge──► reads/writes settings and shows the Activity list
```

No JavaScript runs while handling a call. The React Native UI only edits settings and shows the results, which is why alerts work when the app is closed. Full walkthrough: [docs/04-call-to-alert-flow.md](docs/04-call-to-alert-flow.md).

## Project layout

```text
src/                         React Native UI (TypeScript)
├── screens/home/            the single screen + one file per section
├── ui/                      reusable widgets (Button, Field, Card…)
├── hooks/                   screen logic: loading data, the destination form, Send test
├── destinations/            ★ one file per chat app (setup form side)
├── domain/                  pure helpers: schedule, history, validation
├── native/                  the only code that talks to Android
└── theme/                   colors (light/dark) and spacing

android/app/src/main/java/com/notifyme/
├── bridge/                  methods JavaScript can call (NotifyMeModule)
├── call/                    call detection and caller lookup
├── schedule/                "should we alert right now?"
├── storage/                 settings and history on the phone
└── delivery/                HTTP send, retries, error messages
    └── destinations/        ★ one class per chat app (message format side)

__tests__/                   Jest tests (JS)
android/app/src/test/        JUnit tests (Android)
docs/                        developer guide
```

Every file starts with a comment saying what it is and who uses it. Non-obvious choices are marked `WHY:` and platform traps `⚠ GOTCHA:`. Folder-by-folder detail: [docs/03-project-structure.md](docs/03-project-structure.md).

## Extending

| To add… | Touch | Guide |
|---|---|---|
| A chat app (e.g. Google Chat) | one file in `src/destinations/` + one class in `delivery/destinations/` | [add a destination](docs/guides/add-a-destination.md) |
| A setting | `ConfigStore` → bridge → `src/native` → a screen section | [add a setting](docs/guides/add-a-setting.md) |
| A JS → Android call | `NotifyMeModule.kt` + `src/native/NotifyMeNative.ts` | [add a native method](docs/guides/add-a-native-method.md) |

## Checks

```bash
npx tsc --noEmit && npm run lint && npm test          # JS: types, lint, Jest
cd android && ./gradlew :app:testDebugUnitTest         # Android: JUnit
```

To install a standalone build on a connected phone (no Metro needed) while keeping the app's saved settings:

```bash
cd android && ./gradlew :app:assembleRelease
adb install -r app/build/outputs/apk/release/app-release.apk
```

The release build is signed with the debug keystore (`android/app/debug.keystore`). That's fine for sideloading, but publishing to Play Store needs your own key; see the [React Native signing guide](https://reactnative.dev/docs/signed-apk-android).

## Documentation

Start at **[docs/README.md](docs/README.md)**. It's a guided tour written for web developers new to React Native and Android:

- how a ringing phone becomes a chat message, step by step
- the project structure, file by file
- the JS ↔ Android bridge, the Android background engine, and what's stored on the phone
- guides: [add a destination](docs/guides/add-a-destination.md), [add a setting](docs/guides/add-a-setting.md), [add a native method](docs/guides/add-a-native-method.md)

## License

MIT
