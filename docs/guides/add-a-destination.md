# Guide: add a new destination

**What you'll learn:** how to teach Notify-Me to post to a new chat service. We'll walk through a hypothetical **Google Chat** destination end to end: the JS definition for the setup screen, the native class that builds the message, registering both, and tests. Then we'll cover what changes when a service needs extra fields beyond a URL (using Zoho Cliq as the model).

Background reading: [10. Destinations](../10-destinations.md) (what a destination is), [4. Call-to-alert flow](../04-call-to-alert-flow.md) (where `Delivery` uses it).

A destination always has **two halves with the same id**:

| Half | Folder | Registry |
|---|---|---|
| JS (setup screen) | [`src/destinations/`](../../src/destinations/) | `DESTINATIONS` in [`src/destinations/index.ts`](../../src/destinations/index.ts) |
| Native (sending) | [`android/.../delivery/destinations/`](../../android/app/src/main/java/com/notifyme/delivery/destinations/) | `ALL` in [`Destinations.java`](../../android/app/src/main/java/com/notifyme/delivery/destinations/Destinations.java) |

> ⚠ The id (here `"gchat"`) is saved on the phone and must be identical on both sides. Pick it once and never rename it.

---

## Part 1: a simple "paste a URL" service

Google Chat incoming webhooks accept `{"text": "..."}` at a URL like `https://chat.googleapis.com/v1/spaces/AAA/messages?key=...&token=...`.

### Step 1: JS definition

Create `src/destinations/gchat.ts`. For URL-only services, the `simpleWebhookDestination` helper ([`simple.ts`](../../src/destinations/simple.ts)) fills in the standard label, helper text and test hint:

```ts
/**
 * Google Chat — space incoming webhook.
 * Message format: android/.../delivery/destinations/GoogleChatDestination.java.
 */
import {MessageSquare} from 'lucide-react-native';
import {simpleWebhookDestination} from './simple';

export const gchat = simpleWebhookDestination({
  id: 'gchat',
  label: 'Google Chat',
  color: '#00AC47',
  icon: MessageSquare, // any icon from lucide-react-native
  placeholder: 'https://chat.googleapis.com/v1/spaces/...',
});
```

### Step 2: register it in JS

In [`src/destinations/index.ts`](../../src/destinations/index.ts), import it and add it to the array. The order of the array is the order of the tiles on screen.

```ts
import {gchat} from './gchat';

export const DESTINATIONS: readonly DestinationDefinition[] = [
  slack,
  discord,
  teams,
  cliq,
  gchat,
  generic,
];
```

The picker, the status card ("Incoming and missed calls go to Google Chat") and the test banner pick it up automatically. No screen code changes.

### Step 3: id constant (native)

Platform ids live in [`storage/ConfigStore.java`](../../android/app/src/main/java/com/notifyme/storage/ConfigStore.java). Add one next to the others:

```java
public static final String PLATFORM_GCHAT = "gchat";
```

(It's a convention, not a requirement, but it keeps every stored id in one place.)

### Step 4: native class

Create `android/app/src/main/java/com/notifyme/delivery/destinations/GoogleChatDestination.java`. Because Google Chat takes a plain `{"text"}` body, it can extend `TextOnlyDestination` (package-private, so the new class must be in the same package):

```java
package com.notifyme.delivery.destinations;

import com.notifyme.storage.ConfigStore;

/**
 * Google Chat — space incoming webhook (https://chat.googleapis.com/v1/spaces/…).
 * Body: {"text": "…"} (see TextOnlyDestination).
 */
public final class GoogleChatDestination extends TextOnlyDestination {
    @Override public String id() { return ConfigStore.PLATFORM_GCHAT; }
    /** Used in "Delivered to Google Chat". */
    @Override public String displayName() { return "Google Chat"; }
}
```

If the service needs its own JSON, implement `Destination` directly instead. Here's the full shape, as a card-style variant:

```java
package com.notifyme.delivery.destinations;

import com.notifyme.delivery.Alert;
import com.notifyme.storage.ConfigStore;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

public final class GoogleChatDestination implements Destination {
    @Override public String id() { return ConfigStore.PLATFORM_GCHAT; }
    @Override public String displayName() { return "Google Chat"; }

    /** Google Chat's URL already carries its key + token, so use it as-is. */
    @Override
    public String buildUrl(String savedUrl, DestinationSettings settings) {
        return savedUrl;
    }

    @Override
    public String buildBody(Alert alert, DestinationSettings settings) throws JSONException {
        // WHY keep put() order stable: the phone's org.json sends keys in insertion order.
        JSONObject header = new JSONObject()
                .put("title", alert.title())
                .put("subtitle", alert.kind == Alert.TEST ? "Your webhook works." : alert.shownCaller());
        JSONObject card = new JSONObject().put("header", header);
        return new JSONObject()
                .put("text", alert.plainText())   // fallback for notifications
                .put("cardsV2", new JSONArray().put(new JSONObject()
                        .put("cardId", "notify-me")
                        .put("card", card)))
                .toString();
    }

    /** Return a sentence for codes you can explain better than the generic wording, else null. */
    @Override
    public String failureTextOrNull(int httpCode) {
        if (httpCode == 400) return "Google Chat couldn't read the message.";
        return null; // DeliveryErrors.genericFailureText() handles the rest
    }
}
```

What `Alert` gives you: `kind` (`INCOMING` / `MISSED` / `TEST`), `kindName()`, `caller`, `shownCaller()` (with the "number unavailable" fallback), `timeStr()` (`"HH:mm"`), `title()`, `plainText()`, `color()`. See [`Alert.java`](../../android/app/src/main/java/com/notifyme/delivery/Alert.java).

### Step 5: register it natively

In [`Destinations.java`](../../android/app/src/main/java/com/notifyme/delivery/destinations/Destinations.java), add an instance to `ALL`:

```java
private static final List<Destination> ALL = Collections.unmodifiableList(Arrays.asList(
        new SlackDestination(),
        new DiscordDestination(),
        new TeamsDestination(),
        new CliqDestination(),
        new GoogleChatDestination(),
        GENERIC
));
```

That's all on the engine side. `Delivery` finds it through `Destinations.current()` by the saved id.

### Step 6: tests

**JS:** [`__tests__/destinations.test.ts`](../../__tests__/destinations.test.ts) pins the list of ids so the two sides can't drift apart silently. Update it:

```ts
expect(DESTINATIONS.map(d => d.id)).toEqual(['slack', 'discord', 'teams', 'cliq', 'gchat', 'generic']);
```

**Native:** in [`DestinationsPayloadTest.java`](../../android/app/src/test/java/com/notifyme/delivery/destinations/DestinationsPayloadTest.java):

- add `"gchat"` to the `ids` array in `registry_knowsEveryPlatformId`,
- add a `displayName` assertion,
- add a golden body test. If it's text-only, add `"gchat"` to the loop in `textOnlyServices`. Otherwise write one like `discord()`, using the `assertBody(id, alert, settings, expectedJson)` helper.

Run them:

```bash
npm test
cd android && ./gradlew :app:testDebugUnitTest
```

### Step 7: try it on a phone

Native code changed, so rebuild the app (`npm run android`); a Metro reload is not enough. Pick *Google Chat*, paste a webhook, **Save**, **Send test**. Then add a short section to [10. Destinations](../10-destinations.md) with the URL format and a body example.

---

## Part 2: a service that needs extra fields

Some services need more than a URL. Zoho Cliq needs a token and an optional recipient email. Follow the Cliq path through each layer:

| Layer | Cliq example | What you'd add |
|---|---|---|
| Storage key | `KEY_CLIQ_TOKEN = "cliq_token"` + getter/setter in [`ConfigStore.java`](../../android/app/src/main/java/com/notifyme/storage/ConfigStore.java) | A new key (never reuse or rename existing ones). See [9. Storage](../09-storage-and-data.md). |
| Settings for destinations | `cliqToken` field in [`DestinationSettings.java`](../../android/app/src/main/java/com/notifyme/delivery/destinations/DestinationSettings.java), filled in `load(ctx)` | A field + constructor arg + `load()` line. Destinations get plain values, so they stay unit-testable. |
| Use it | `CliqDestination.buildUrl` adds `?zapikey=`, `buildBody` adds `userids` | Read `settings.yourField` in your destination. |
| Bridge setter | `@ReactMethod fun setCliqToken(token: String)` in [`NotifyMeModule.kt`](../../android/app/src/main/java/com/notifyme/bridge/NotifyMeModule.kt) | A setter, see [add-a-native-method.md](add-a-native-method.md). |
| Bridge getter | `putString("cliqToken", …)` in `getConfig` | One more key in the `getConfig` map. |
| JS types | `cliqToken` in `Config` ([`src/native/types.ts`](../../src/native/types.ts)) and `NativeApi` / `NotifyMe` in [`NotifyMeNative.ts`](../../src/native/NotifyMeNative.ts) | Field + wrapper method. |
| Form state | `DestinationForm` in [`src/destinations/types.ts`](../../src/destinations/types.ts); `EMPTY`, `reset`, `trimmed`, `dirty`, `persist` in [`src/hooks/useDestinationForm.ts`](../../src/hooks/useDestinationForm.ts) | Today these list the fields **by name** (`url`, `cliqToken`, `cliqUser`). Add yours to each. |
| Inputs on screen | [`src/destinations/cliq/CliqFields.tsx`](../../src/destinations/cliq/CliqFields.tsx), plugged in as `ExtraFields` | A component that receives `{values, onChange, issues}` and renders `Field`s. |
| Validation | `validate` in [`src/destinations/cliq/cliq.ts`](../../src/destinations/cliq/cliq.ts) | Return `{field: {error | warning}}`. An `error` blocks Save; a `warning` is advice. |
| Test mock | `NativeModules.NotifyMe` in [`jest.setup.js`](../../jest.setup.js) | Add the new setter and the `getConfig` field. |

Put a destination with extras in its own folder (`src/destinations/<id>/`) like Cliq, with the definition and its `ExtraFields` component side by side.

---

## Checklist

- [ ] Picked an id; it's identical in JS and native and will never change
- [ ] `src/destinations/<id>.ts` (or a folder with `ExtraFields`)
- [ ] Added to `DESTINATIONS` in `src/destinations/index.ts`
- [ ] `PLATFORM_<ID>` constant in `ConfigStore.java`
- [ ] `<Name>Destination.java` implementing `Destination` (or extending `TextOnlyDestination`)
- [ ] Added to `Destinations.ALL`
- [ ] `__tests__/destinations.test.ts` id list updated
- [ ] `DestinationsPayloadTest`: id list, display name, golden body
- [ ] Extra fields only: ConfigStore key, `DestinationSettings`, bridge getter/setter, `types.ts`, `NotifyMeNative.ts`, form hook, `ExtraFields`, `validate`, `jest.setup.js`
- [ ] `npm test`, `./gradlew :app:testDebugUnitTest`, `npm run android`, Send test on a phone
- [ ] Documented in `docs/10-destinations.md`

---

Back to: [Docs index](../README.md)
