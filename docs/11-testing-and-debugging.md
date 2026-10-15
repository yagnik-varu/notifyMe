# 11. Testing and debugging

**What you'll learn:** how to run the automated tests, build and install the app on a phone, check that call alerts really work, and look inside the app when something goes wrong.

## Prerequisites

- **Node.js** 22.11+ (see `engines` in `package.json`)
- **JDK 17**. Set `JAVA_HOME` to it.
- **Android SDK** with the platform and build-tools for SDK 36. Point Gradle at it in `android/local.properties`:
  ```text
  sdk.dir=C\:\\Users\\YourName\\AppData\\Local\\Android\\Sdk
  ```
- **adb** on your `PATH` (it's in the SDK's `platform-tools`), and a phone with **USB debugging** on.

Use a **real phone**. An emulator can't receive real phone calls (only simulated ones), and call-log behavior differs between phone brands.

```bash
npm install
```

## Automated tests

### JavaScript (Jest)

```bash
npm test               # all tests in __tests__/
npx jest schedule      # only files matching "schedule"
npx tsc --noEmit       # type-check
npm run lint           # ESLint
```

Jest runs in Node on your computer, not on a phone. Anything native is replaced with a fake in [`jest.setup.js`](../jest.setup.js), including the whole `NotifyMe` module, which returns a fresh-install config. When you add a bridge method, add it there too.

### Android (JUnit)

```bash
cd android
./gradlew :app:testDebugUnitTest       # on Windows PowerShell: .\gradlew ...
```

Reports: `android/app/build/reports/tests/testDebugUnitTest/index.html`.

| Test | Proves |
|---|---|
| `ScheduleRulesTest` | office hours, overnight windows, overrides, master switch |
| `DestinationsPayloadTest` | every destination × alert kind produces exactly the expected JSON ("golden" values captured from the original code) |
| `DeliveryErrorsTest` | which HTTP codes are retried vs. given up on, and the error text |

These run on your computer's Java, where Android classes are empty stubs. That's why the pure rules were split into classes that don't need an Android `Context` (`ScheduleRules`, the `Destination` classes), and why `build.gradle` adds the real `org.json` library for tests.

## Run the app on a phone

Two terminals:

```bash
npm start          # 1. Metro: serves the JS bundle, hot reload
npm run android    # 2. builds the Android app, installs it, launches it
```

- Editing `src/**` → saved files reload instantly.
- Editing `android/**` (Java/Kotlin, manifest, Gradle) → run `npm run android` again.

To build an APK without Metro:

```bash
cd android
./gradlew :app:assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

`-r` reinstalls and keeps the app's saved settings. That's useful for checking that an update didn't break stored data.

## Manual checklist for call alerts

After installing, open the app once (see [The Android engine](08-android-engine.md) for why), then:

1. **Destination**: pick a platform, paste a URL, **Save**.
2. **Send test** → the banner says "Test delivered" and a green row appears in Activity; the message arrives in the chat.
3. Turn alerts **on** → grant phone, call log and contacts access.
4. Set office hours **around now** → call the phone from another phone → "📞 Incoming call…" arrives.
5. Let it ring out → "📵 Missed call…" arrives too.
6. Set office hours to **exclude now** → call → nothing is posted.
7. **Today: Always on** (outside hours) → call → posted. **Today: Pause** (inside hours) → call → not posted.
8. **Swipe the app away** from recent apps → call again → still posted.
9. Turn on airplane mode, call is missed, turn it off → the alert arrives late, but it arrives (WorkManager waited for the network).

## Looking inside

### Logs

```bash
adb logcat --pid=$(adb shell pidof -s com.notifyme)   # only this app's process
adb logcat *:E                                        # all errors (crashes show here)
adb logcat -s ReactNativeJS                           # console.log from JS
```

The app doesn't log much on purpose: phone numbers are personal data. To trace a problem, add a temporary `android.util.Log.d("NotifyMe", "...")` in Java, or `console.log` in TS, and remove it afterwards.

### Saved settings and history

Debug builds let you read the app's private files:

```bash
adb shell run-as com.notifyme cat shared_prefs/notify_me_prefs.xml
```

You'll see every key from [Storage and data](09-storage-and-data.md), including the `history` JSON.

### Background jobs

```bash
adb shell dumpsys jobscheduler | grep -A3 com.notifyme
```

WorkManager schedules work through Android's JobScheduler. This shows queued jobs and their constraints, for example a job waiting for network.

### Permissions and the caller-ID role

```bash
adb shell dumpsys package com.notifyme | grep -E "READ_(PHONE_STATE|CALL_LOG|CONTACTS)"
adb shell cmd role get-role-holders android.app.role.CALL_SCREENING
```

### Common problems

| Symptom | Likely cause | Fix |
|---|---|---|
| Nothing posted after install | App never opened (Android's "stopped state") | Open the app once |
| Works with app open, not when closed | Battery optimization / OEM killer | Reliability → Background running → Allow; enable Autostart on Xiaomi/Samsung/Oppo |
| "number unavailable" in alerts | No caller-ID role, and the call log is written late by the phone | Reliability → Caller numbers → Allow |
| Test says "Still trying" | No internet, or the server is slow; WorkManager keeps retrying | Check Activity later; check the URL |
| Changes to Java/Kotlin don't show up | Metro only reloads JS | `npm run android` |
| `npm test` fails with "Preset … not found" | `node_modules` out of date | `npm install` |

Next: back to the [docs index](README.md), or try a guide: [Add a destination](guides/add-a-destination.md)
