# Code conventions

**What you'll learn:** the rules that keep this codebase easy to navigate. Follow them when you add code, and the docs will stay true.

## Where code goes

### TypeScript (`src/`)

| Folder | Put here | Must not |
|---|---|---|
| `native/` | anything that touches `NativeModules` | be bypassed. No other file imports `NativeModules` |
| `domain/` | pure functions (formatting, rules, validation) | use React or call native code |
| `destinations/` | one definition per chat app | contain message-format code (that's native) |
| `hooks/` | stateful logic reused by screens | render anything |
| `screens/<name>/` | the screen "controller" plus its `sections/` and `build*.ts` helpers | contain generic widgets |
| `ui/` | generic, reusable widgets | know about calls, webhooks, or `NotifyMe` |
| `theme/` | colors, spacing, style hooks | import app code |

Imports point "downward" only. The allowed directions are listed in [Architecture → Layering rules](02-architecture.md#layering-rules-inside-src). In short, `screens` may use everything, `ui` and `domain` use almost nothing, and only `native` touches the bridge. If a `ui/` component needs app data, pass it in as a prop.

One component per file, named after the component (`Button.tsx` exports `Button`).

### Android (`com.notifyme`)

| Package | Put here |
|---|---|
| `bridge` | `@ReactMethod`s. Keep them thin: read/write `storage`, call into other packages |
| `call` | anything about detecting calls and identifying callers |
| `schedule` | "should we alert now?" Pure rules in `ScheduleRules` (no `Context`) |
| `storage` | `SharedPreferences` access. The only place that knows key names |
| `delivery` | sending: HTTP, retry decisions, history rows |
| `delivery.destinations` | one class per chat app: URL, JSON body, service-specific errors |

Prefer pure classes (plain values in, plain values out) for rules and formatting, so they can be unit-tested without a phone.

Keep a file in the language it's already in (Java or Kotlin). New files can be either; match the neighboring files.

## Comment style

Comments explain **why**, not what. The code already says what.

1. **File header.** Every file starts with a short block: what it is, who uses it, and anything surprising.
   ```ts
   /**
    * "Send test" with the result shown right under the button.
    * Used by: HomeScreen.
    */
   ```
2. **Doc comments** (JSDoc `/** */`, Javadoc, KDoc) on every exported function, component, prop type field and bridge method, when the name alone doesn't say enough.
3. **`WHY:`** for a deliberate, non-obvious choice:
   ```java
   // WHY static: Android creates a new receiver object for every broadcast…
   ```
4. **`⚠ GOTCHA:`** for a platform trap that would bite the next person:
   ```ts
   // ⚠ GOTCHA: sized from onLayout. Percentage sizes don't follow the parent…
   ```
5. **`★ EXTENSION POINT`** where new features plug in (destination registries).

Don't comment obvious lines (`i++ // increment i`).

## Values that must never change

They're stored on users' phones or shared between JS and Android:

- the SharedPreferences file name `notify_me_prefs` and every key in `ConfigStore` / `HistoryStore`
- destination ids (`slack`, `discord`, `teams`, `cliq`, `generic`)
- override strings (`NONE`, `FORCE_ON`, `PAUSE`)
- the native module name `NotifyMe` and existing `@ReactMethod` names
- the history JSON field names

To change one, write a migration: read the old key, write the new one, and delete the old one.

## Before you commit

```bash
npx tsc --noEmit && npm run lint && npm test
cd android && ./gradlew :app:testDebugUnitTest :app:assembleDebug
```

If you changed what's sent to a chat app, update the golden values in `DestinationsPayloadTest` on purpose, and say so in the commit message.
