package com.notifyme.storage;

import android.content.Context;
import android.content.SharedPreferences;

/**
 * ConfigStore — the user's saved settings (destination, on/off switch, office hours,
 * today's override).
 *
 * <p>Who calls it: everything. The JS bridge ({@code bridge/NotifyMeModule}) reads and
 * writes it when the user changes something in the UI; the background engine
 * ({@code schedule/EventGate}, {@code call/CallEventWorker}, {@code delivery/*}) reads it
 * when a call comes in.
 *
 * <p>What it calls: Android's SharedPreferences — a small key/value file private to this
 * app (think "localStorage for the native side"). Other apps can't read it on a
 * non-rooted phone, which is good enough for a personal, sideloaded app.
 *
 * <p>The activity log lives in the same file but has its own class: {@link HistoryStore}.
 *
 * <p>⚠ GOTCHA: the file name and every KEY_* string below are what is already saved on
 * users' phones. Renaming one silently "forgets" that setting after an app update.
 * The platform ids and override strings must also match the JS side
 * ({@code src/destinations/}, {@code src/native/types.ts}) exactly.
 */
public final class ConfigStore {
    /** SharedPreferences file name. Shared with {@link HistoryStore}. Never rename. */
    static final String PREFS = "notify_me_prefs";

    // Destination
    private static final String KEY_URL = "webhook_url";
    private static final String KEY_PLATFORM = "platform"; // "slack" | "discord" | "teams" | "cliq" | "generic"
    private static final String KEY_CLIQ_USER = "cliq_user"; // Cliq recipient email/ZUID; "" = none
    private static final String KEY_CLIQ_TOKEN = "cliq_token"; // Cliq webhook token, sent as ?zapikey=

    // Master on/off switch (the toggle on the big status card)
    private static final String KEY_MASTER = "master_enabled";

    // Office-hour schedule (minutes-of-day, 0..1439; days bitmask Sun=bit0..Sat=bit6)
    private static final String KEY_START = "sched_start_min";
    private static final String KEY_END = "sched_end_min";
    private static final String KEY_DAYS = "sched_days_mask";

    // "Today" override (Always on / Pause until midnight)
    private static final String KEY_OVERRIDE = "override_mode"; // NONE | FORCE_ON | PAUSE
    private static final String KEY_OVERRIDE_UNTIL = "override_until"; // epoch ms

    // Platform ids. Each one has a matching class in delivery/destinations/.
    public static final String PLATFORM_SLACK = "slack";
    public static final String PLATFORM_TEAMS = "teams";
    public static final String PLATFORM_DISCORD = "discord";
    public static final String PLATFORM_CLIQ = "cliq";
    public static final String PLATFORM_GENERIC = "generic";

    // Override modes.
    public static final String OVERRIDE_NONE = "NONE";
    public static final String OVERRIDE_FORCE_ON = "FORCE_ON";
    public static final String OVERRIDE_PAUSE = "PAUSE";

    private ConfigStore() {}

    /** Opens the app's private preferences file (shared with HistoryStore). */
    static SharedPreferences prefs(Context ctx) {
        // WHY: getApplicationContext() so a short-lived Activity/Receiver context is
        // never held on to.
        return ctx.getApplicationContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    // ---- Destination ----

    /** Saved webhook URL, or "" when none is set yet. */
    public static String getWebhookUrl(Context ctx) {
        return prefs(ctx).getString(KEY_URL, "");
    }

    /** Saves the webhook URL (trimmed; null becomes ""). */
    public static void setWebhookUrl(Context ctx, String url) {
        // WHY: apply() writes to disk in the background; commit() would block the caller.
        prefs(ctx).edit().putString(KEY_URL, url == null ? "" : url.trim()).apply();
    }

    /** Saved platform id (see PLATFORM_*). Defaults to Slack on a fresh install. */
    public static String getPlatform(Context ctx) {
        return prefs(ctx).getString(KEY_PLATFORM, PLATFORM_SLACK);
    }

    /** Saves the platform id. */
    public static void setPlatform(Context ctx, String platform) {
        prefs(ctx).edit().putString(KEY_PLATFORM, platform).apply();
    }

    /** Zoho Cliq only: the recipient's email (or "" to post to every bot subscriber). */
    public static String getCliqUser(Context ctx) {
        return prefs(ctx).getString(KEY_CLIQ_USER, "");
    }

    /** Saves the Cliq recipient (trimmed). */
    public static void setCliqUser(Context ctx, String user) {
        prefs(ctx).edit().putString(KEY_CLIQ_USER, user == null ? "" : user.trim()).apply();
    }

    /** Zoho Cliq only: the bot's webhook token, appended to the URL as ?zapikey=. */
    public static String getCliqToken(Context ctx) {
        return prefs(ctx).getString(KEY_CLIQ_TOKEN, "");
    }

    /** Saves the Cliq token (trimmed). */
    public static void setCliqToken(Context ctx, String token) {
        prefs(ctx).edit().putString(KEY_CLIQ_TOKEN, token == null ? "" : token.trim()).apply();
    }

    // ---- Master switch ----

    /** True when the user turned alerts on. Off on a fresh install. */
    public static boolean isMasterEnabled(Context ctx) {
        return prefs(ctx).getBoolean(KEY_MASTER, false);
    }

    /** Turns alerts on or off. */
    public static void setMasterEnabled(Context ctx, boolean enabled) {
        prefs(ctx).edit().putBoolean(KEY_MASTER, enabled).apply();
    }

    // ---- Schedule ----
    // Defaults: 09:00–18:00, Mon–Fri.

    /** Office hours start, in minutes after midnight (540 = 09:00). */
    public static int getStartMinute(Context ctx) {
        return prefs(ctx).getInt(KEY_START, 9 * 60);
    }

    /** Office hours end, in minutes after midnight (1080 = 18:00). May be < start (overnight). */
    public static int getEndMinute(Context ctx) {
        return prefs(ctx).getInt(KEY_END, 18 * 60);
    }

    /** Saves both ends of the office-hours window. */
    public static void setSchedule(Context ctx, int startMin, int endMin) {
        prefs(ctx).edit().putInt(KEY_START, startMin).putInt(KEY_END, endMin).apply();
    }

    /**
     * Office days as a bitmask: bit0 = Sunday … bit6 = Saturday (matches
     * Calendar.DAY_OF_WEEK - 1 and JS Date.getDay()).
     *
     * <p>WHY a bitmask: 7 on/off flags fit in one int, so they save and cross the JS
     * bridge as a single number. Example: Mon–Fri = bits 1..5 = 0b0111110 = 62.
     */
    public static int getDaysMask(Context ctx) {
        return prefs(ctx).getInt(KEY_DAYS, 62);
    }

    /** Saves the office-days bitmask. */
    public static void setDaysMask(Context ctx, int mask) {
        prefs(ctx).edit().putInt(KEY_DAYS, mask).apply();
    }

    // ---- Override ----

    /** Current override mode (see OVERRIDE_*). May be stale; check {@link #getOverrideUntil}. */
    public static String getOverrideMode(Context ctx) {
        return prefs(ctx).getString(KEY_OVERRIDE, OVERRIDE_NONE);
    }

    /** When the override expires, as epoch milliseconds. */
    public static long getOverrideUntil(Context ctx) {
        return prefs(ctx).getLong(KEY_OVERRIDE_UNTIL, 0L);
    }

    /** Sets an override ("Always on" / "Pause") that lasts until {@code untilEpochMs}. */
    public static void setOverride(Context ctx, String mode, long untilEpochMs) {
        prefs(ctx).edit()
                .putString(KEY_OVERRIDE, mode)
                .putLong(KEY_OVERRIDE_UNTIL, untilEpochMs)
                .apply();
    }

    /** Goes back to following the schedule. */
    public static void clearOverride(Context ctx) {
        setOverride(ctx, OVERRIDE_NONE, 0L);
    }
}
