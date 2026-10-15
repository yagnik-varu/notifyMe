# Glossary

Terms used across the code and docs, in alphabetical order.

**adb (Android Debug Bridge).** Command-line tool to install apps on a phone, read logs (`adb logcat`) and run shell commands on it.

**Alert.** One message to post: an incoming call, a missed call, or a test. Java class [`Alert`](../android/app/src/main/java/com/notifyme/delivery/Alert.java).

**APK.** The Android app package file (like a `.zip` of the compiled app). `assembleDebug` produces one.

**Bitmask (days mask).** One integer whose bits are on/off switches. Here, bit 0 = Sunday … bit 6 = Saturday, so Mon–Fri = `0b0111110` = 62. See [Storage and data](09-storage-and-data.md).

**Bridge / native module.** The mechanism that lets JavaScript call Kotlin/Java functions. Our module is `NotifyMe`. See [The native bridge](07-native-bridge.md).

**BroadcastReceiver.** An Android class that the system calls when an event happens (here: phone state changed). It can run even when the app is closed.

**Call screening role (caller ID role).** A permission-like "role" (Android 10+) that makes Android tell our `CallScreenService` about each incoming call, including the number, the moment it rings.

**Cleartext.** Unencrypted `http://` traffic. Android blocks it by default, which is why webhook URLs must be `https://`.

**Context (Android).** An object that gives code access to app resources and system services (storage, content providers…). Most Android APIs need one.

**ContentResolver / content provider.** Android's way to query another app's or the system's data (the call log, contacts) with a SQL-like API.

**Deluge.** Zoho's scripting language. The Cliq bot runs [our small handler](zoho-cliq-incoming-handler.deluge) written in it.

**Destination.** A chat app Notify-Me can post to (Slack, Discord, Teams, Zoho Cliq, Generic). It's defined on both the JS side (`src/destinations`) and the Android side (`delivery/destinations`).

**dp (density-independent pixel).** React Native's length unit. 1dp ≈ 1 CSS px on a standard-density screen.

**Edge-to-edge.** Since Android 15, apps draw behind the status and navigation bars and must pad for them themselves.

**Gradle.** Android's build tool (like npm scripts plus a compiler). `./gradlew` is a wrapper that downloads the right Gradle version.

**Golden test.** A test that compares output to a saved "known good" value. Here: webhook JSON bodies captured from the original code.

**Hermes.** The JavaScript engine embedded in the Android app that runs our bundle.

**Hot reload / Fast Refresh.** Metro pushes changed JS to the running app without reinstalling. It doesn't apply to native code.

**Manifest (`AndroidManifest.xml`).** Declares the app's permissions and the components Android may start (activity, receiver, service).

**Metro.** React Native's JavaScript bundler and dev server (`npm start`).

**Minutes of day.** Times stored as minutes after midnight: 540 = 09:00.

**OEM.** The phone maker (Samsung, Xiaomi…). Many add aggressive battery savers that kill background apps.

**Override.** The "Today" control: `FORCE_ON` (post every call until midnight) or `PAUSE` (post none until midnight).

**Permission (runtime).** Sensitive access, such as the call log, that the user must approve in a dialog while the app runs. It must also be listed in the manifest.

**Promise (bridge).** A Kotlin method that takes a `Promise` parameter becomes an `async` function in JS; calling `promise.resolve(value)` returns the value.

**SharedPreferences.** Android's simple key-value storage, private to the app. It's where all settings and history live.

**Stopped state.** A freshly installed app that the user hasn't opened yet. Android delivers no broadcasts to it.

**Tone.** In the UI kit: the *meaning* of a color (`success`, `warning`, `danger`, `accent`, `neutral`), which maps to light or dark palette colors.

**Webhook.** A URL that accepts an HTTP POST and turns it into a chat message. Slack, Discord and others create them for a channel.

**WorkManager / Worker.** Android's library for background jobs that must run eventually, even if the app is killed or the phone reboots. It supports constraints such as "only with network" and automatic retries.

**zapikey.** The query parameter Zoho Cliq uses for the bot webhook token.
