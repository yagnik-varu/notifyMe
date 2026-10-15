package com.notifyme.bridge

import android.app.Activity
import android.app.role.RoleManager
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import android.view.HapticFeedbackConstants
import androidx.work.Constraints
import androidx.work.Data
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequest
import androidx.work.WorkManager
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.BaseActivityEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.notifyme.delivery.TestWebhookWorker
import com.notifyme.schedule.EventGate
import com.notifyme.schedule.ScheduleRules
import com.notifyme.storage.ConfigStore
import com.notifyme.storage.HistoryStore

/**
 * NotifyMeModule — the ONE bridge between the React Native UI (JavaScript) and the
 * native Android engine. Accessed from JS as `NativeModules.NotifyMe`; the typed JS
 * wrapper is `src/native/NotifyMeNative.ts`.
 *
 * Who calls it: only JavaScript. Every `@ReactMethod` below becomes a JS function with
 * the same name. What it calls: [ConfigStore] / [HistoryStore] (settings + activity),
 * [EventGate] (live status), WorkManager (test send) and a few Android system screens.
 *
 * The UI never duplicates engine logic: it reads/writes through here and the engine
 * (receivers, workers) reads the same stores.
 *
 * How the bridge works, in short:
 * - Methods with a trailing [Promise] parameter return a JS Promise; call
 *   `promise.resolve(value)` once. Others are fire-and-forget (return void to JS).
 * - Values crossing the bridge must be simple: String, Boolean, Int, Double, or
 *   maps/arrays built with [Arguments.createMap] / createArray.
 * - Methods run on a React Native background thread, not the UI thread.
 *
 * ⚠ GOTCHA: method names and argument types are a contract with
 * `src/native/NotifyMeNative.ts`. Renaming one here without updating JS fails at run
 * time (undefined is not a function), not at build time.
 */
class NotifyMeModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    /** The pending JS promise from [requestScreeningRole], resolved in [activityListener]. */
    private var rolePromise: Promise? = null

    // WHY: asking for the screening role opens a system dialog via startActivityForResult.
    // Its answer arrives later, in onActivityResult, not as a return value. So we keep the
    // JS promise in a field and resolve it when the result comes back here.
    private val activityListener = object : BaseActivityEventListener() {
        override fun onActivityResult(
            activity: Activity, requestCode: Int, resultCode: Int, data: Intent?
        ) {
            if (requestCode == REQ_ROLE) {
                rolePromise?.resolve(if (resultCode == Activity.RESULT_OK) "granted" else "denied")
                rolePromise = null
            }
        }
    }

    init {
        reactContext.addActivityEventListener(activityListener)
    }

    /** The name JS uses: `NativeModules.NotifyMe`. Never change it. */
    override fun getName() = "NotifyMe"

    // ---- Reads ----

    /** All saved settings in one object (shape = `Config` in src/native/types.ts). */
    @ReactMethod
    fun getConfig(promise: Promise) {
        val ctx = reactContext
        val map = Arguments.createMap().apply {
            putString("url", ConfigStore.getWebhookUrl(ctx))
            putString("platform", ConfigStore.getPlatform(ctx))
            putString("cliqUser", ConfigStore.getCliqUser(ctx))
            putString("cliqToken", ConfigStore.getCliqToken(ctx))
            putBoolean("masterEnabled", ConfigStore.isMasterEnabled(ctx))
            putInt("startMin", ConfigStore.getStartMinute(ctx))
            putInt("endMin", ConfigStore.getEndMinute(ctx))
            putInt("daysMask", ConfigStore.getDaysMask(ctx))
            putString("overrideMode", ConfigStore.getOverrideMode(ctx))
            // WHY putDouble: JS has a single number type (a 64-bit double); the bridge has
            // no Long. Epoch millis fit in a double without losing precision.
            putDouble("overrideUntil", ConfigStore.getOverrideUntil(ctx).toDouble())
        }
        promise.resolve(map)
    }

    /**
     * Live status for the big status card: "paused" (amber) > "active" (green) > "off".
     * Shape = `Status` in src/native/types.ts.
     */
    @ReactMethod
    fun getStatus(promise: Promise) {
        val ctx = reactContext
        val active = EventGate.shouldFire(ctx)
        val mode = ConfigStore.getOverrideMode(ctx)
        val until = ConfigStore.getOverrideUntil(ctx)
        val overrideActive = ScheduleRules.isOverrideActive(mode, until, System.currentTimeMillis())
        val paused = overrideActive && ConfigStore.OVERRIDE_PAUSE == mode
        val state = when {
            paused -> "paused"
            active -> "active"
            else -> "off"
        }
        val map = Arguments.createMap().apply {
            putString("state", state)
            putBoolean("overrideActive", overrideActive)
            putBoolean("forced", overrideActive && ConfigStore.OVERRIDE_FORCE_ON == mode)
            putString("overrideMode", mode)
        }
        promise.resolve(map)
    }

    /**
     * Activity history as a JSON array STRING; the JS wrapper parses it.
     *
     * WHY a string: it's already stored as JSON, and converting a list of objects to a
     * bridge WritableArray by hand would be more code for the same result.
     */
    @ReactMethod
    fun getHistory(promise: Promise) {
        promise.resolve(HistoryStore.getHistoryJson(reactContext))
    }

    /** Caller-ID screening role: `supported` (Android 10+) and `held` (granted). */
    @ReactMethod
    fun getScreening(promise: Promise) {
        val supported = Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q
        val map = Arguments.createMap().apply {
            putBoolean("supported", supported)
            putBoolean("held", isScreeningRoleHeld())
        }
        promise.resolve(map)
    }

    // ---- Writes (fire-and-forget: no Promise) ----

    /** Saves the webhook URL. */
    @ReactMethod
    fun setWebhookUrl(url: String) = ConfigStore.setWebhookUrl(reactContext, url)

    /** Saves the platform id ("slack", "discord", …). */
    @ReactMethod
    fun setPlatform(platform: String) = ConfigStore.setPlatform(reactContext, platform)

    /** Saves the Zoho Cliq recipient email. */
    @ReactMethod
    fun setCliqUser(user: String) = ConfigStore.setCliqUser(reactContext, user)

    /** Saves the Zoho Cliq webhook token. */
    @ReactMethod
    fun setCliqToken(token: String) = ConfigStore.setCliqToken(reactContext, token)

    /** Turns alerts on/off (the switch on the status card). */
    @ReactMethod
    fun setMasterEnabled(enabled: Boolean) = ConfigStore.setMasterEnabled(reactContext, enabled)

    /** Saves office hours, as minutes after midnight. */
    @ReactMethod
    fun setSchedule(startMin: Int, endMin: Int) =
        ConfigStore.setSchedule(reactContext, startMin, endMin)

    /** Saves office days (bitmask, bit0 = Sunday). */
    @ReactMethod
    fun setDaysMask(mask: Int) = ConfigStore.setDaysMask(reactContext, mask)

    /**
     * Sets "Always on" / "Pause" until a time.
     * WHY Double: JS numbers arrive as doubles (see getConfig); converted back to Long here.
     */
    @ReactMethod
    fun setOverride(mode: String, untilMs: Double) =
        ConfigStore.setOverride(reactContext, mode, untilMs.toLong())

    /** Back to following the schedule. */
    @ReactMethod
    fun clearOverride() = ConfigStore.clearOverride(reactContext)

    /** Empties the Activity list. */
    @ReactMethod
    fun clearHistory() = HistoryStore.clearHistory(reactContext)

    /** Undo for [clearHistory]: puts back the entries JS kept (a JSON array string). */
    @ReactMethod
    fun restoreHistory(json: String) = HistoryStore.restoreHistory(reactContext, json)

    /**
     * Light system haptic for UI feedback: "confirm" | "reject" | anything else = tick.
     *
     * WHY performHapticFeedback instead of the Vibrator API: it needs no VIBRATE
     * permission and respects the user's "touch feedback" setting.
     */
    @ReactMethod
    fun haptic(kind: String) {
        val view = reactContext.currentActivity?.window?.decorView ?: return
        val constant = when (kind) {
            "confirm" -> if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R)
                HapticFeedbackConstants.CONFIRM else HapticFeedbackConstants.VIRTUAL_KEY
            "reject" -> if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R)
                HapticFeedbackConstants.REJECT else HapticFeedbackConstants.LONG_PRESS
            else -> HapticFeedbackConstants.CLOCK_TICK
        }
        // WHY view.post: views may only be touched on the UI thread; bridge methods run on
        // a background thread.
        view.post { view.performHapticFeedback(constant) }
    }

    /**
     * Fire a one-off test webhook through the same WorkManager + Delivery path a real call
     * uses. Returns nothing: JS polls [getHistory] for the "Test" row to learn the result.
     */
    @ReactMethod
    fun sendTest() {
        val data = Data.Builder()
            .putString(TestWebhookWorker.KEY_TYPE, TestWebhookWorker.TYPE_TEST)
            .putLong(TestWebhookWorker.KEY_TIMESTAMP, System.currentTimeMillis())
            .build()
        val req = OneTimeWorkRequest.Builder(TestWebhookWorker::class.java)
            .setInputData(data)
            .setConstraints(
                Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build()
            )
            .build()
        WorkManager.getInstance(reactContext.applicationContext).enqueue(req)
    }

    // ---- Battery optimization exemption (keeps the process alive for PhoneStateReceiver) ----

    /** `{exempt: true}` when Android won't put the app to sleep to save battery. */
    @ReactMethod
    fun getBatteryStatus(promise: Promise) {
        val pm = reactContext.getSystemService(PowerManager::class.java)
        val exempt = pm?.isIgnoringBatteryOptimizations(reactContext.packageName) == true
        val map = Arguments.createMap().apply { putBoolean("exempt", exempt) }
        promise.resolve(map)
    }

    /**
     * Opens Android's "allow running in background" dialog. Needs the
     * REQUEST_IGNORE_BATTERY_OPTIMIZATIONS permission in the manifest.
     */
    @ReactMethod
    fun requestBatteryExemption() {
        val ctx = reactContext
        try {
            val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS)
                .setData(Uri.parse("package:" + ctx.packageName))
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            ctx.startActivity(intent)
        } catch (e: Exception) {
            // ⚠ GOTCHA: some OEMs block the direct dialog — fall back to the full list screen.
            try {
                val intent = Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS)
                    .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                ctx.startActivity(intent)
            } catch (ignored: Exception) {
            }
        }
    }

    // ---- Caller-ID screening role (native-only; no RN equivalent) ----

    /**
     * Asks the user to make this app the "caller ID & spam" app, which lets
     * CallScreenService see numbers at ring time. Resolves with
     * "granted" | "denied" | "held" (already had it) | "unsupported" (Android < 10) |
     * "unavailable" (phone doesn't offer the role).
     */
    @ReactMethod
    fun requestScreeningRole(promise: Promise) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
            promise.resolve("unsupported"); return
        }
        val activity = reactContext.currentActivity
        val rm = activity?.getSystemService(RoleManager::class.java)
        if (activity == null || rm == null || !rm.isRoleAvailable(RoleManager.ROLE_CALL_SCREENING)) {
            promise.resolve("unavailable"); return
        }
        if (rm.isRoleHeld(RoleManager.ROLE_CALL_SCREENING)) {
            promise.resolve("held"); return
        }
        // Resolved later by activityListener when the system dialog closes.
        rolePromise = promise
        activity.startActivityForResult(
            rm.createRequestRoleIntent(RoleManager.ROLE_CALL_SCREENING), REQ_ROLE
        )
    }

    private fun isScreeningRoleHeld(): Boolean {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) return false
        val rm = reactContext.getSystemService(RoleManager::class.java)
        return rm != null && rm.isRoleHeld(RoleManager.ROLE_CALL_SCREENING)
    }

    companion object {
        /** Any unique number; identifies our request when onActivityResult fires. */
        private const val REQ_ROLE = 9001
    }
}
