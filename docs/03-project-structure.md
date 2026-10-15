# 3. Project structure

**What you'll learn:** where everything lives. Use this page as a map. You don't need to read it top to bottom; skim it, then come back when you're looking for something.

## Top level

```text
NotifyMeRN/
├── index.js               # JS entry: registers the root component with React Native
├── app.json               # App name used by index.js ("NotifyMeRN") — must match MainActivity
├── src/                   # All TypeScript/React code (the UI)
├── android/               # The native Android app (Java/Kotlin engine + build files)
├── ios/                   # Unused React Native template (iOS can't observe calls)
├── __tests__/             # Jest tests for the JS side
├── docs/                  # You are here
├── jest.config.js         # Jest settings (which files to transpile, module mapping)
├── jest.setup.js          # Fakes for native modules so tests run on a computer
├── babel.config.js        # JS compiler preset for React Native
├── metro.config.js        # Metro = React Native's bundler (like webpack/Vite)
├── tsconfig.json          # TypeScript settings (React Native preset)
├── .eslintrc.js           # Lint rules (React Native preset)
├── .prettierrc.js         # Formatting rules
└── package.json           # npm scripts and dependencies
```

## `src/` — the UI

```text
src/
├── App.tsx                         # Root component: providers only, renders HomeScreen
│
├── native/                         # The ONLY code that talks to Android
│   ├── NotifyMeNative.ts           #   typed wrapper around NativeModules.NotifyMe
│   ├── types.ts                    #   Config, Status, HistoryEntry… (bridge data shapes)
│   └── index.ts                    #   re-exports
│
├── domain/                         # Pure logic: no React, no native calls, unit-tested
│   ├── schedule.ts                 #   time formatting, day bitmask, "next window" text
│   ├── history.ts                  #   relative times, old-format detail translation
│   ├── validation.ts               #   https-URL and email checks
│   └── permissions.ts              #   asks Android for phone/call-log/contacts access
│
├── destinations/                   # ★ One file per chat app (setup-screen side)
│   ├── types.ts                    #   DestinationDefinition interface
│   ├── simple.ts                   #   builder for "just paste a URL" destinations
│   ├── slack.ts discord.ts teams.ts generic.ts
│   ├── cliq/                       #   Zoho Cliq: needs a token + optional email
│   │   ├── cliq.ts                 #     definition + validation
│   │   └── CliqFields.tsx          #     the extra form inputs
│   └── index.ts                    #   DESTINATIONS registry + getDestination(id)
│
├── hooks/                          # Stateful logic used by the screen
│   ├── useAppData.ts               #   loads config/status/history from the phone
│   ├── useAppForeground.ts         #   reload when the app comes back to the front
│   ├── useDestinationForm.ts       #   URL/token/email drafts, validation, "dirty"
│   └── useTestSend.ts              #   "Send test" + polling history for the result
│
├── screens/home/                   # The single screen
│   ├── HomeScreen.tsx              #   the "controller": data + actions + layout
│   ├── buildHero.ts                #   decides the status card's text/color
│   ├── buildSetupSteps.ts          #   decides the setup checklist
│   └── sections/                   #   one component per card on the screen
│       ├── AppHeader.tsx  LoadErrorView.tsx
│       ├── DestinationSection.tsx  ScheduleSection.tsx
│       └── ReliabilitySection.tsx  ActivitySection.tsx
│
├── ui/                             # Reusable widgets; know nothing about calls/webhooks
│   ├── Button.tsx Card.tsx Field.tsx Pill.tsx IconBadge.tsx Banner.tsx
│   ├── StatusHero.tsx SetupChecklist.tsx PlatformPicker.tsx
│   ├── TimeTile.tsx DayChips.tsx Segmented.tsx SettingRow.tsx SectionHeader.tsx
│   ├── HistoryList.tsx GradientFill.tsx
│   ├── tone.ts                     #   "tone" → colors/icons (success, warning…)
│   ├── toast/useToast.tsx          #   bottom snackbar with optional Undo
│   ├── hooks/useReduceMotion.ts    #   respects "remove animations"
│   └── index.ts                    #   import everything from '../ui'
│
└── theme/                          # Look and feel
    ├── palette.ts                  #   light + dark color sets
    ├── tokens.ts                   #   SPACE and RADIUS scales
    ├── useStyles.ts                #   useTheme() / useStyles(factory)
    └── index.ts
```

## `android/` — the native app

```text
android/
├── build.gradle                    # Project-wide Gradle settings (SDK versions)
├── settings.gradle gradle.properties gradlew(.bat) gradle/   # Gradle tooling
└── app/
    ├── build.gradle                # App module: dependencies (WorkManager, JUnit…)
    └── src/
        ├── main/
        │   ├── AndroidManifest.xml # Permissions + entry points Android can start
        │   ├── res/                # Icons, app name, theme (Android resources)
        │   └── java/com/notifyme/
        │       ├── MainApplication.kt     # App start: registers our bridge package
        │       ├── MainActivity.kt        # The window that hosts React Native
        │       ├── bridge/                # JS ↔ Android
        │       │   ├── NotifyMeModule.kt  #   every method JS can call
        │       │   └── NotifyMePackage.kt #   registers the module with React Native
        │       ├── call/                  # Noticing calls and finding the caller
        │       │   ├── PhoneStateReceiver.java  # ring/answer/hang-up events (START here)
        │       │   ├── CallEventWorker.java     # background job: look up caller, send
        │       │   ├── CallScreenService.java   # caller-ID role: number at ring time
        │       │   ├── CallLogLookup.java       # reads the system call log
        │       │   └── ContactLookup.java       # number → contact name
        │       ├── schedule/              # "Should we alert right now?"
        │       │   ├── EventGate.java     #   loads settings, asks ScheduleRules
        │       │   └── ScheduleRules.java #   the pure rules (unit-tested)
        │       ├── storage/               # Saved on the phone
        │       │   ├── ConfigStore.java   #   settings (SharedPreferences)
        │       │   └── HistoryStore.java  #   Activity history (JSON string)
        │       └── delivery/              # Sending the message
        │           ├── Alert.java               # what happened (incoming/missed/test)
        │           ├── Delivery.java            # send + retry decision + history row
        │           ├── WebhookClient.java       # the HTTP POST itself
        │           ├── DeliveryErrors.java      # retry or give up? user-facing error text
        │           ├── TestWebhookWorker.java   # background job for "Send test"
        │           └── destinations/            # ★ one class per chat app (message side)
        │               ├── Destination.java  Destinations.java  DestinationSettings.java
        │               ├── TextOnlyDestination.java  (base for Slack/Teams/Generic)
        │               └── Slack/Discord/Teams/Cliq/GenericDestination.java
        └── test/java/com/notifyme/       # JUnit tests (run on your computer)
            ├── schedule/ScheduleRulesTest.java
            ├── delivery/DeliveryErrorsTest.java
            └── delivery/destinations/DestinationsPayloadTest.java
```

Why are some files Kotlin (`.kt`) and others Java (`.java`)? The React Native template files (`MainActivity`, `MainApplication`) and the bridge are Kotlin. The engine was first written in Java for an earlier native-only version of the app and was kept as is. Both compile together and can call each other freely.

## `__tests__/` — JS tests

| File | Tests |
|---|---|
| `App.test.tsx` | The whole app renders with fake native data |
| `schedule.test.ts` | Time formatting, day bitmask, next-window text |
| `history.test.ts` | Relative times, translating old error formats |
| `validation.test.ts` | URL and email rules |
| `destinations.test.ts` | Registry ids match Android; Cliq validation |
| `buildHero.test.ts` | Status card rules |

Next: [From call to alert](04-call-to-alert-flow.md)
