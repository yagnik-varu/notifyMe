# Notify-Me developer guide

This folder explains how Notify-Me works, from "the phone rings" to "a message appears in Slack". It's written for someone who knows React or Next.js but is new to React Native and Android.

## Reading order

Read these in order the first time. Each one ends with a link to the next.

| # | Doc | What it covers |
|---|-----|----------------|
| 1 | [What the app does](01-what-the-app-does.md) | Features and the one screen, from a user's point of view |
| 2 | [Architecture](02-architecture.md) | The three layers (JS UI, bridge, Android engine) and why they're split that way |
| 3 | [Project structure](03-project-structure.md) | Every folder and file, and what it's for |
| 4 | [From call to alert](04-call-to-alert-flow.md) | Step by step, what happens when the phone rings |
| 5 | [React Native for web developers](05-react-native-for-web-devs.md) | What's different from React on the web |
| 6 | [The UI layer](06-ui-layer.md) | Screens, sections, hooks, theme and components |
| 7 | [The native bridge](07-native-bridge.md) | How JavaScript calls Kotlin, and every bridge method |
| 8 | [The Android engine](08-android-engine.md) | Receivers, WorkManager, call screening, permissions |
| 9 | [Storage and data](09-storage-and-data.md) | What's saved on the phone, and in what format |
| 10 | [Destinations](10-destinations.md) | Slack, Discord, Teams, Zoho Cliq and Generic: setup and message formats |
| 11 | [Testing and debugging](11-testing-and-debugging.md) | Running tests, installing on a phone, reading logs |

## Guides (do a specific task)

- [Add a destination](guides/add-a-destination.md), for example Google Chat
- [Add a setting](guides/add-a-setting.md), saved on the phone and shown in the UI
- [Add a native method](guides/add-a-native-method.md), a new JS → Android call

## Reference

- [Glossary](glossary.md): Webhook, WorkManager, bitmask, Metro, Hermes and other terms
- [Code conventions](CONTRIBUTING-CODE.md): folder rules and comment style
- [`zoho-cliq-incoming-handler.deluge`](zoho-cliq-incoming-handler.deluge): the script to paste into a Zoho Cliq bot

## Fast path: "I just want to find X"

| I want to change… | Look in |
|---|---|
| Text or layout on the screen | [`src/screens/home/sections/`](../src/screens/home/sections) |
| A reusable widget (button, field…) | [`src/ui/`](../src/ui) |
| Colors, spacing | [`src/theme/`](../src/theme) |
| What a Slack/Discord/… message looks like | [`android/.../delivery/destinations/`](../android/app/src/main/java/com/notifyme/delivery/destinations) |
| When alerts are allowed (office hours) | [`android/.../schedule/ScheduleRules.java`](../android/app/src/main/java/com/notifyme/schedule/ScheduleRules.java) |
| How a call is detected | [`android/.../call/PhoneStateReceiver.java`](../android/app/src/main/java/com/notifyme/call/PhoneStateReceiver.java) |
| Error messages for failed sends | [`android/.../delivery/DeliveryErrors.java`](../android/app/src/main/java/com/notifyme/delivery/DeliveryErrors.java) |

Next: [What the app does](01-what-the-app-does.md)
