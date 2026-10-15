# 1. What the app does

**What you'll learn:** what Notify-Me does for its user, what's on its one screen, and the rules that decide whether a call gets posted. Knowing the product first makes the code much easier to follow.

## The idea

You have a work phone. When it rings, you want your team chat to know: "📞 Incoming call from Jane (+1 555…) at 14:05", or "📵 Missed call from …" if nobody answered. Notify-Me runs on an Android phone, notices calls, and posts a message to a chat app through a **webhook** (a URL that accepts messages).

Supported chat apps ("destinations"): **Slack, Discord, Microsoft Teams, Zoho Cliq, and Generic** (any service that accepts `{"text": "..."}`).

It only works on **Android**. iOS doesn't let apps observe phone calls, so the `ios/` folder is just the unused React Native template.

## The screen, top to bottom

The app has a single screen ([`HomeScreen.tsx`](../src/screens/home/HomeScreen.tsx)) made of sections:

| Section | What it does | Code |
|---|---|---|
| Header | Logo and app name | [`AppHeader.tsx`](../src/screens/home/sections/AppHeader.tsx) |
| Status card | The current state ("Watching for calls", "Paused for today"…) and the **master on/off switch** | [`StatusHero.tsx`](../src/ui/StatusHero.tsx), [`buildHero.ts`](../src/screens/home/buildHero.ts) |
| Finish setting up | A checklist that disappears once everything's done | [`buildSetupSteps.ts`](../src/screens/home/buildSetupSteps.ts) |
| Destination | Pick the chat app, paste the webhook URL, **Save**, **Send test** | [`DestinationSection.tsx`](../src/screens/home/sections/DestinationSection.tsx) |
| Office hours | Start/end time, office days, and a "Today" override | [`ScheduleSection.tsx`](../src/screens/home/sections/ScheduleSection.tsx) |
| Reliability | Android settings that keep alerts working (caller ID, battery) | [`ReliabilitySection.tsx`](../src/screens/home/sections/ReliabilitySection.tsx) |
| Activity | History of sent and failed alerts, with Clear and Undo | [`ActivitySection.tsx`](../src/screens/home/sections/ActivitySection.tsx) |

## When does a call get posted?

The decision is made by the Android side every time the phone rings ([`ScheduleRules.java`](../android/app/src/main/java/com/notifyme/schedule/ScheduleRules.java)). The first rule that matches wins:

1. **No webhook URL saved** → never.
2. **"Today: Always on"** (until midnight) → always, even outside office hours and even with the master switch off.
3. **"Today: Pause"** (until midnight) → never, even during office hours.
4. **Master switch off** → never.
5. Otherwise → only **inside office hours** on an **office day**.

Office hours can run overnight, for example 22:00–06:00. In that case the early-morning part belongs to the day the window *started*: Friday 22:00 to Saturday 06:00 counts as Friday.

## What gets posted

| Event | Example message |
|---|---|
| Incoming call (posted when it starts ringing) | 📞 Incoming call from Jane (+15550001111) at 14:05 |
| Missed call (posted when a ringing call ends unanswered) | 📵 Missed call from Jane (+15550001111) at 14:05 |
| Send test button | ✅ Test from Notify-Me — your webhook works. |

So a missed call produces **two** messages: "incoming" when it rings, then "missed" when it stops. An answered call produces only the "incoming" one.

Each chat app gets the message in its own format. Discord gets a colored card, and Cliq gets a card built by a script inside the bot. See [Destinations](10-destinations.md).

## Things the user must allow

Android is strict about background apps and privacy. For alerts to work reliably the user has to:

1. **Open the app once** after installing. Until then Android won't tell it about calls.
2. **Grant permissions** for phone state, call log and contacts. The app asks when alerts are turned on.
3. Optionally **make Notify-Me the "caller ID" app** (Android 10+), so the number is known the moment the phone rings.
4. **Turn off battery optimization** for the app, and on some brands (Samsung, Xiaomi, Oppo, OnePlus) enable **Autostart**.

Why each of these is needed is explained in [The Android engine](08-android-engine.md).

Next: [Architecture](02-architecture.md)
