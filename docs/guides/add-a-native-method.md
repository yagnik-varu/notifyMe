# Guide: add a native (bridge) method

**What you'll learn:** how to expose a new piece of Android functionality to the React Native UI. You'll add a `@ReactMethod` in Kotlin, type it in the TypeScript wrapper, fake it for tests, and rebuild. The worked example adds `getAppVersion()`, which returns a Promise of the installed version name (e.g. `"0.0.1"`). It's handy for showing the version in the UI.

Background reading: [7. The native bridge](../07-native-bridge.md).

You'll touch four files, always together:

1. [`android/.../bridge/NotifyMeModule.kt`](../../android/app/src/main/java/com/notifyme/bridge/NotifyMeModule.kt): the implementation
2. [`src/native/NotifyMeNative.ts`](../../src/native/NotifyMeNative.ts): the typed wrapper
3. [`src/native/types.ts`](../../src/native/types.ts): only if it returns an object shape
4. [`jest.setup.js`](../../jest.setup.js): the fake used by tests

---

## Step 1: Kotlin, add a `@ReactMethod`

In `NotifyMeModule.kt`, add a method to the class. It returns data, so its **last parameter is a `Promise`**:

```kotlin
/** Installed app version, e.g. "0.0.1" (versionName in android/app/build.gradle). */
@ReactMethod
fun getAppVersion(promise: Promise) {
    try {
        val info = reactContext.packageManager.getPackageInfo(reactContext.packageName, 0)
        promise.resolve(info.versionName ?: "")
    } catch (e: Exception) {
        // reject() makes the JS promise throw; the code string helps when debugging.
        promise.reject("E_VERSION", "Couldn't read the app version", e)
    }
}
```

Rules to remember:

- **Return data → last parameter `promise: Promise`.** Call `resolve` or `reject` **exactly once**.
- **No return value → no Promise parameter.** The method becomes fire-and-forget, like the `set…` methods.
- **Allowed types:** `String`, `Boolean`, `Int`, `Double`, `ReadableMap` / `ReadableArray` in; the same plus `WritableMap` (build with `Arguments.createMap()`) out. Use `Double` for epoch milliseconds, because JS numbers are doubles.
- Methods run on a background thread. To touch a View, use `view.post { … }` (see `haptic`). Don't do network I/O here; queue a WorkManager job instead (see `sendTest`).
- Need an Activity (a dialog, `startActivityForResult`)? Use `reactContext.currentActivity`, and for results follow the `requestScreeningRole` pattern in [7. The native bridge](../07-native-bridge.md#a-special-pattern-waiting-for-a-system-dialog-requestscreeningrole).

No registration step is needed. `NotifyMePackage` already exposes the whole module, and every `@ReactMethod` in it is picked up.

## Step 2: TypeScript, add it to the wrapper

In `src/native/NotifyMeNative.ts`, add it to the raw `NativeApi` type (the contract with Kotlin):

```ts
type NativeApi = {
  // ...existing methods
  getAppVersion(): Promise<string>;
};
```

…and to the exported `NotifyMe` object (what the app calls):

```ts
const NotifyMe = {
  // ...
  /** Installed app version, e.g. "0.0.1". */
  getAppVersion: () => Native.getAppVersion(),
};
```

If the method returns an object, describe its shape in `src/native/types.ts` (like `Battery` or `Screening`) and use that type in both places.

> ⚠ TypeScript can't see Kotlin. A typo in the name (`getAppversion`) compiles fine and fails at run time with *"undefined is not a function"*. Copy the name from the Kotlin file.

## Step 3: use it

From a hook or screen:

```ts
import {NotifyMe} from '../native';

const [version, setVersion] = useState('');
useEffect(() => {
  NotifyMe.getAppVersion().then(setVersion).catch(() => setVersion(''));
}, []);
```

## Step 4: fake it for tests

Jest runs on your computer, where there is no Android. [`jest.setup.js`](../../jest.setup.js) replaces `NativeModules.NotifyMe` with fakes. Add yours, or any screen that calls it will crash in tests:

```js
NativeModules.NotifyMe = {
  // ...
  getAppVersion: jest.fn(async () => '0.0.1'),
};
```

Then run `npm test`.

## Step 5: rebuild the app

Native code is compiled into the APK. **Metro's fast refresh only reloads JavaScript**, so after changing Kotlin or Java you must rebuild and reinstall:

```bash
npm run android
```

If you only reload JS against an old build, `NativeModules.NotifyMe.getAppVersion` is `undefined`.

---

## Checklist

- [ ] `@ReactMethod` in `NotifyMeModule.kt` (Promise last if it returns data; resolve/reject once)
- [ ] KDoc comment on the method
- [ ] `NativeApi` type + `NotifyMe` object in `NotifyMeNative.ts` (same name, same arguments)
- [ ] Return shape in `types.ts` if it's an object
- [ ] Fake in `jest.setup.js`
- [ ] `npx tsc --noEmit`, `npm test`
- [ ] `npm run android` and try it on a phone
- [ ] Row added to the method table in [7. The native bridge](../07-native-bridge.md#reference-every-bridge-method)

---

Back to: [Docs index](../README.md)
