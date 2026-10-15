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

## Checks

```bash
npx tsc --noEmit && npm run lint && npm test          # JS: types, lint, Jest
cd android && ./gradlew :app:testDebugUnitTest         # Android: JUnit
```

## Documentation

Start at **[docs/README.md](docs/README.md)**. It's a guided tour written for web developers new to React Native and Android:

- how a ringing phone becomes a chat message, step by step
- the project structure, file by file
- the JS ↔ Android bridge, the Android background engine, and what's stored on the phone
- guides: [add a destination](docs/guides/add-a-destination.md), [add a setting](docs/guides/add-a-setting.md), [add a native method](docs/guides/add-a-native-method.md)

## License

MIT
