# 9. Storage and data

**What you'll learn:** everything Notify-Me saves on the phone: every key, its type and default, and who reads and writes it. You'll also learn the two compact encodings used everywhere (minutes-of-day and the days bitmask), how the "Today" override expires, and the exact shape of the Activity history.

Everything lives in one **SharedPreferences** file named `notify_me_prefs`, private to the app. SharedPreferences is the native equivalent of `localStorage` (see [8. The Android engine](08-android-engine.md#sharedpreferences-the-native-localstorage)). Two classes wrap it:

- [`storage/ConfigStore.java`](../android/app/src/main/java/com/notifyme/storage/ConfigStore.java) holds the settings.
- [`storage/HistoryStore.java`](../android/app/src/main/java/com/notifyme/storage/HistoryStore.java) holds the Activity list (same file, its own key).

JavaScript never touches the file directly. It goes through the bridge (`getConfig()`, `set…()`, `getHistory()`). See [7. The native bridge](07-native-bridge.md).

---

## All keys

| Key | Type | Default (fresh install) | Meaning | Written by (bridge method) | Read by |
|---|---|---|---|---|---|
| `webhook_url` | String | `""` | Webhook / bot endpoint URL. `""` means no destination. Stored trimmed. | `setWebhookUrl` | `EventGate`, workers, `Delivery`, `getConfig` |
| `platform` | String | `"slack"` | Destination id: `slack`, `discord`, `teams`, `cliq`, `generic`. | `setPlatform` | `Destinations.current`, `getConfig` |
| `cliq_user` | String | `""` | Zoho Cliq recipient email (sent as `userids`). `""` means every bot subscriber. | `setCliqUser` | `DestinationSettings.load`, `getConfig` |
| `cliq_token` | String | `""` | Zoho Cliq webhook token (sent as `?zapikey=`). | `setCliqToken` | `DestinationSettings.load`, `getConfig` |
| `master_enabled` | Boolean | `false` | The master on/off switch on the status card. | `setMasterEnabled` | `EventGate`, `getConfig` |
| `sched_start_min` | Int | `540` (09:00) | Office hours start, minutes after midnight. | `setSchedule` | `EventGate`, `getConfig` |
| `sched_end_min` | Int | `1080` (18:00) | Office hours end (exclusive), minutes after midnight. | `setSchedule` | `EventGate`, `getConfig` |
| `sched_days_mask` | Int | `62` (Mon–Fri) | Office days bitmask, see below. | `setDaysMask` | `EventGate`, `getConfig` |
| `override_mode` | String | `"NONE"` | `NONE`, `FORCE_ON` ("Always on") or `PAUSE`. | `setOverride`, `clearOverride`, and `EventGate` (clears expired) | `EventGate`, `getStatus`, `getConfig` |
| `override_until` | Long | `0` | When the override expires, epoch milliseconds. | `setOverride`, `clearOverride` | same |
| `history` | String (JSON array) | `"[]"` | Activity log, see below. | `HistoryStore` (after each delivery), `clearHistory`, `restoreHistory` | `getHistory` |

> ⚠ **Never rename a key or the file name.** They're already saved on users' phones. If you rename `webhook_url` to `url`, every existing install "forgets" its destination after the update, with no error. The same goes for the *values* `slack`…`generic` and `NONE` / `FORCE_ON` / `PAUSE`. They're shared with the JS side ([`src/destinations/`](../src/destinations/), [`src/native/types.ts`](../src/native/types.ts)) and have to match exactly.

---

## Time of day: minutes after midnight

Times are stored as a single integer: `hours × 60 + minutes`.

| Clock | Stored |
|---|---|
| 00:00 | 0 |
| 09:00 | 540 |
| 17:30 | 1050 |
| 23:59 | 1439 |

It's easy to compare and has no date or time-zone baggage. The phone's current local time is converted the same way when deciding. `fmtMin()` in [`src/domain/schedule.ts`](../src/domain/schedule.ts) turns it back into `"09:00"`.

The window is **start inclusive, end exclusive**. With 09:00–18:00, a call at 17:59 alerts and a call at 18:00 doesn't. If `end < start`, it's an **overnight** window (e.g. 22:00–06:00). If `start == end`, the window is empty and nothing ever fires.

---

## Office days: a 7-bit bitmask

One integer holds the whole week. Bit *n* is set when day *n* is an office day, with **bit 0 = Sunday … bit 6 = Saturday**. That numbering is the same as JavaScript's `Date.getDay()` and Java's `Calendar.DAY_OF_WEEK − 1`, so both sides agree without conversion.

```
bit:    6   5   4   3   2   1   0
day:   Sat Fri Thu Wed Tue Mon Sun
```

| Days | Binary | Decimal |
|---|---|---|
| Mon–Fri (default) | `0111110` | 62 |
| Every day | `1111111` | 127 |
| Weekends | `1000001` | 65 |
| Mon, Wed, Fri | `0101010` | 42 |
| none | `0000000` | 0 (never fires) |

Worked example: "is Wednesday on in 62?" Wednesday is day 3, so `1 << 3 = 0b0001000 = 8`, and `62 & 8 = 8`, which is non-zero, so yes. Toggling a day flips its bit with XOR: `62 ^ 8 = 54` (Wednesday off). In code: `isDayOn()` / `toggleDay()` in [`src/domain/schedule.ts`](../src/domain/schedule.ts) and `ScheduleRules.isDayEnabled()` in Java.

**Overnight windows** belong to the day they *start* on. With 22:00–06:00 and only Friday enabled, Friday 23:00 alerts and Saturday 03:00 also alerts (it's Friday's night). Friday 03:00 doesn't, because that's Thursday's night. See [`ScheduleRules.withinSchedule`](../android/app/src/main/java/com/notifyme/schedule/ScheduleRules.java).

---

## The "Today" override

`override_mode` + `override_until` implement the **Schedule / Always on / Pause** control:

- The UI sets `FORCE_ON` or `PAUSE` with `until` = today 23:59:59 (`endOfToday()` in `src/domain/schedule.ts`).
- An override counts as active only while `now < override_until` (`ScheduleRules.isOverrideActive`).
- There's no timer. Once it has expired, the next `EventGate.shouldFire()` call (a call coming in, or the UI asking for status) resets the mode to `NONE`. That's why the UI snaps back to "Schedule" the next morning.

---

## History (the Activity list)

Stored under `history` as a **JSON array string**, newest first:

```json
[
  {"label": "Jane (+15550001111)", "kind": "missed",   "timestamp": 1700000400000, "success": true,
   "detail": "Delivered to Slack"},
  {"label": "Test",                "kind": "test",     "timestamp": 1700000100000, "success": false,
   "detail": "Webhook not found. The link may be wrong or deleted."},
  {"label": "",                    "kind": "incoming", "timestamp": 1700000000000, "success": true,
   "detail": "Delivered to Slack"}
]
```

| Field | Meaning |
|---|---|
| `label` | Caller label (`"Name (number)"`, a number, or `""` if unknown). `"Test"` for test sends. |
| `kind` | `"incoming"`, `"missed"` or `"test"`. **Missing on rows written by old versions.** The UI's `historyKind()` then guesses from the label. |
| `timestamp` | When the call rang (or the test was requested), epoch ms. Not when it was delivered. |
| `success` | `true` when the service answered HTTP 2xx. |
| `detail` | Plain-language outcome: `"Delivered to <service>"` or the failure reason from `DeliveryErrors`. Old versions stored `"Sent"` or `"HTTP 401"`; `friendlyDetail()` in `src/domain/history.ts` translates those. |

Rules:

- **One row per final outcome.** While a send is being retried, nothing is written. The row appears on success, on a permanent error, or after the last retry.
- **Capped at 50 rows** (`HistoryStore.MAX_HISTORY`). Adding a row drops the oldest.
- **Clear + Undo.** `clearHistory()` sets `"[]"`. The UI keeps the cleared rows in memory and, if you tap *Undo*, sends them back with `restoreHistory(json)`. That puts them **behind** anything recorded in the meantime (newest first stays true), still capped at 50.
- Writes are best-effort. A JSON error is swallowed rather than crashing an alert over a log entry.

Why a JSON string and not a database? It's at most 50 small rows, always read all at once, and the string can be passed straight over the bridge.

---

## Backups and privacy

- The file is private to the app (`MODE_PRIVATE`). Other apps can't read it on a non-rooted phone.
- The manifest sets `android:allowBackup="false"`, so the webhook URL and token are **not** copied to Google backups or to a new phone. After reinstalling or moving to a new phone, you set up the destination again.
- The Cliq token is stored in plain text in this private file. That's acceptable for a personal, sideloaded app; a Play-Store app should use the Android Keystore.

---

Next: [10. Destinations](10-destinations.md)
