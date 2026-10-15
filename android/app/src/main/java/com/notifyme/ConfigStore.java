package com.notifyme;

import android.content.Context;
import android.content.SharedPreferences;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * Single source of truth for config + history, stored in the app's private
 * SharedPreferences. The UI (MainActivity), the on-device receivers
 * (CallScreenService) and WebhookWorker all read/write through here.
 *
 * Private SharedPreferences is adequate for a personal sideloaded app — other apps
 * cannot read it on a non-rooted device.
 */
public final class ConfigStore {
    private static final String PREFS = "notify_me_prefs";

    // Destination
    private static final String KEY_URL = "webhook_url";
    private static final String KEY_PLATFORM = "platform"; // "slack" | "discord" | "teams" | "cliq" | "generic"
    private static final String KEY_CLIQ_USER = "cliq_user"; // Cliq recipient email/ZUID; "" = none
    private static final String KEY_CLIQ_TOKEN = "cliq_token"; // Cliq webhook token, sent as ?zapikey=

    // Master
    private static final String KEY_MASTER = "master_enabled";

    // Office-hour schedule (minutes-of-day, 0..1439; days bitmask Sun=bit0..Sat=bit6)
    private static final String KEY_START = "sched_start_min";
    private static final String KEY_END = "sched_end_min";
    private static final String KEY_DAYS = "sched_days_mask";

    // Quick override
    private static final String KEY_OVERRIDE = "override_mode"; // NONE | FORCE_ON | PAUSE
    private static final String KEY_OVERRIDE_UNTIL = "override_until"; // epoch ms

    private static final String KEY_HISTORY = "history";
    private static final int MAX_HISTORY = 50;

    public static final String PLATFORM_SLACK = "slack";
    public static final String PLATFORM_TEAMS = "teams";
    public static final String PLATFORM_DISCORD = "discord";
    public static final String PLATFORM_CLIQ = "cliq";
    public static final String PLATFORM_GENERIC = "generic";

    public static final String OVERRIDE_NONE = "NONE";
    public static final String OVERRIDE_FORCE_ON = "FORCE_ON";
    public static final String OVERRIDE_PAUSE = "PAUSE";

    private ConfigStore() {}

    private static SharedPreferences prefs(Context ctx) {
        return ctx.getApplicationContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    // ---- Destination ----

    public static String getWebhookUrl(Context ctx) {
        return prefs(ctx).getString(KEY_URL, "");
    }

    public static void setWebhookUrl(Context ctx, String url) {
        prefs(ctx).edit().putString(KEY_URL, url == null ? "" : url.trim()).apply();
    }

    public static String getPlatform(Context ctx) {
        return prefs(ctx).getString(KEY_PLATFORM, PLATFORM_SLACK);
    }

    public static void setPlatform(Context ctx, String platform) {
        prefs(ctx).edit().putString(KEY_PLATFORM, platform).apply();
    }

    public static String getCliqUser(Context ctx) {
        return prefs(ctx).getString(KEY_CLIQ_USER, "");
    }

    public static void setCliqUser(Context ctx, String user) {
        prefs(ctx).edit().putString(KEY_CLIQ_USER, user == null ? "" : user.trim()).apply();
    }

    public static String getCliqToken(Context ctx) {
        return prefs(ctx).getString(KEY_CLIQ_TOKEN, "");
    }

    public static void setCliqToken(Context ctx, String token) {
        prefs(ctx).edit().putString(KEY_CLIQ_TOKEN, token == null ? "" : token.trim()).apply();
    }

    // ---- Master + sources ----

    public static boolean isMasterEnabled(Context ctx) {
        return prefs(ctx).getBoolean(KEY_MASTER, false);
    }

    public static void setMasterEnabled(Context ctx, boolean enabled) {
        prefs(ctx).edit().putBoolean(KEY_MASTER, enabled).apply();
    }

    // ---- Schedule ----
    // Defaults: 09:00–18:00, Mon–Fri.

    public static int getStartMinute(Context ctx) {
        return prefs(ctx).getInt(KEY_START, 9 * 60);
    }

    public static int getEndMinute(Context ctx) {
        return prefs(ctx).getInt(KEY_END, 18 * 60);
    }

    public static void setSchedule(Context ctx, int startMin, int endMin) {
        prefs(ctx).edit().putInt(KEY_START, startMin).putInt(KEY_END, endMin).apply();
    }

    /** Bitmask: bit0=Sunday .. bit6=Saturday (matches Calendar.DAY_OF_WEEK - 1). */
    public static int getDaysMask(Context ctx) {
        // Default Mon..Fri => bits 1..5 => 0b0111110 = 62
        return prefs(ctx).getInt(KEY_DAYS, 62);
    }

    public static void setDaysMask(Context ctx, int mask) {
        prefs(ctx).edit().putInt(KEY_DAYS, mask).apply();
    }

    // ---- Override ----

    public static String getOverrideMode(Context ctx) {
        return prefs(ctx).getString(KEY_OVERRIDE, OVERRIDE_NONE);
    }

    public static long getOverrideUntil(Context ctx) {
        return prefs(ctx).getLong(KEY_OVERRIDE_UNTIL, 0L);
    }

    public static void setOverride(Context ctx, String mode, long untilEpochMs) {
        prefs(ctx).edit()
                .putString(KEY_OVERRIDE, mode)
                .putLong(KEY_OVERRIDE_UNTIL, untilEpochMs)
                .apply();
    }

    public static void clearOverride(Context ctx) {
        setOverride(ctx, OVERRIDE_NONE, 0L);
    }

    // ---- History ----

    public static String getHistoryJson(Context ctx) {
        return prefs(ctx).getString(KEY_HISTORY, "[]");
    }

    /** Prepend a new entry (newest first) and cap the list at MAX_HISTORY. */
    public static void appendHistory(Context ctx, String label, String kind, long timestamp,
                                     boolean success, String detail) {
        try {
            JSONArray existing = new JSONArray(getHistoryJson(ctx));
            JSONObject entry = new JSONObject();
            entry.put("label", label);
            entry.put("kind", kind);
            entry.put("timestamp", timestamp);
            entry.put("success", success);
            entry.put("detail", detail);

            JSONArray updated = new JSONArray();
            updated.put(entry);
            int keep = Math.min(existing.length(), MAX_HISTORY - 1);
            for (int i = 0; i < keep; i++) {
                updated.put(existing.get(i));
            }
            prefs(ctx).edit().putString(KEY_HISTORY, updated.toString()).apply();
        } catch (JSONException ignored) {
            // History is best-effort; never crash an event over a log write.
        }
    }

    public static void clearHistory(Context ctx) {
        prefs(ctx).edit().putString(KEY_HISTORY, "[]").apply();
    }

    /**
     * Undo for clearHistory: put the cleared entries back behind anything recorded since
     * the clear (newest stays first), capped at MAX_HISTORY.
     */
    public static void restoreHistory(Context ctx, String clearedJson) {
        try {
            JSONArray current = new JSONArray(getHistoryJson(ctx));
            JSONArray cleared = new JSONArray(clearedJson);
            JSONArray merged = new JSONArray();
            for (int i = 0; i < current.length() && merged.length() < MAX_HISTORY; i++) {
                merged.put(current.get(i));
            }
            for (int i = 0; i < cleared.length() && merged.length() < MAX_HISTORY; i++) {
                merged.put(cleared.get(i));
            }
            prefs(ctx).edit().putString(KEY_HISTORY, merged.toString()).apply();
        } catch (JSONException ignored) {
            // Best-effort, like appendHistory.
        }
    }
}
