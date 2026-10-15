package com.notifyme

import android.app.Activity
import android.app.role.RoleManager
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
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

/**
 * The single bridge between the React Native UI and the native v1.5 engine. The UI never
 * duplicates engine logic — it reads/writes config through ConfigStore and asks EventGate
 * for the live status, exactly like the original MainActivity did. The only piece RN can't
 * do from JS is the caller-ID screening role (RoleManager), so it's exposed here.
 *
 * Accessed from JS as NativeModules.NotifyMe.
 */
class NotifyMeModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private var rolePromise: Promise? = null

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

    override fun getName() = "NotifyMe"

    // ---- Reads ----

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
            putDouble("overrideUntil", ConfigStore.getOverrideUntil(ctx).toDouble())
        }
        promise.resolve(map)
    }

    /** Live status, mirroring MainActivity.updateStatus: paused (amber) > active (green) > off. */
    @ReactMethod
    fun getStatus(promise: Promise) {
        val ctx = reactContext
        val active = EventGate.shouldFire(ctx)
        val mode = ConfigStore.getOverrideMode(ctx)
        val until = ConfigStore.getOverrideUntil(ctx)
        val overrideActive = ConfigStore.OVERRIDE_NONE != mode && System.currentTimeMillis() < until
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

    @ReactMethod
    fun getHistory(promise: Promise) {
        // JSON string; the JS wrapper parses it.
        promise.resolve(ConfigStore.getHistoryJson(reactContext))
    }

    @ReactMethod
    fun getScreening(promise: Promise) {
        val supported = Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q
        val map = Arguments.createMap().apply {
            putBoolean("supported", supported)
            putBoolean("held", isScreeningRoleHeld())
        }
        promise.resolve(map)
    }

    // ---- Writes ----

    @ReactMethod
    fun setWebhookUrl(url: String) = ConfigStore.setWebhookUrl(reactContext, url)

    @ReactMethod
    fun setPlatform(platform: String) = ConfigStore.setPlatform(reactContext, platform)

    @ReactMethod
    fun setCliqUser(user: String) = ConfigStore.setCliqUser(reactContext, user)

    @ReactMethod
    fun setCliqToken(token: String) = ConfigStore.setCliqToken(reactContext, token)

    @ReactMethod
    fun setMasterEnabled(enabled: Boolean) = ConfigStore.setMasterEnabled(reactContext, enabled)

    @ReactMethod
    fun setSchedule(startMin: Int, endMin: Int) =
        ConfigStore.setSchedule(reactContext, startMin, endMin)

    @ReactMethod
    fun setDaysMask(mask: Int) = ConfigStore.setDaysMask(reactContext, mask)

    @ReactMethod
    fun setOverride(mode: String, untilMs: Double) =
        ConfigStore.setOverride(reactContext, mode, untilMs.toLong())

    @ReactMethod
    fun clearOverride() = ConfigStore.clearOverride(reactContext)

    @ReactMethod
    fun clearHistory() = ConfigStore.clearHistory(reactContext)

    /** Fire a one-off test webhook through the same WorkManager path a real call uses. */
    @ReactMethod
    fun sendTest() {
        val data = Data.Builder()
            .putString(WebhookWorker.KEY_TYPE, WebhookWorker.TYPE_TEST)
            .putLong(WebhookWorker.KEY_TIMESTAMP, System.currentTimeMillis())
            .build()
        val req = OneTimeWorkRequest.Builder(WebhookWorker::class.java)
            .setInputData(data)
            .setConstraints(
                Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build()
            )
            .build()
        WorkManager.getInstance(reactContext.applicationContext).enqueue(req)
    }

    // ---- Battery optimization exemption (keeps the process alive for PhoneStateReceiver) ----

    @ReactMethod
    fun getBatteryStatus(promise: Promise) {
        val pm = reactContext.getSystemService(PowerManager::class.java)
        val exempt = pm?.isIgnoringBatteryOptimizations(reactContext.packageName) == true
        val map = Arguments.createMap().apply { putBoolean("exempt", exempt) }
        promise.resolve(map)
    }

    @ReactMethod
    fun requestBatteryExemption() {
        val ctx = reactContext
        try {
            val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS)
                .setData(Uri.parse("package:" + ctx.packageName))
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            ctx.startActivity(intent)
        } catch (e: Exception) {
            // Some OEMs block the direct dialog — fall back to the full list screen.
            try {
                val intent = Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS)
                    .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                ctx.startActivity(intent)
            } catch (ignored: Exception) {
            }
        }
    }

    // ---- Caller-ID screening role (native-only; no RN equivalent) ----

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
        private const val REQ_ROLE = 9001
    }
}
