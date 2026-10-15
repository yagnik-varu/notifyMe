package com.notifyme;

import android.content.Context;

import java.util.Calendar;

/**
 * Single decision point for "should an event fire right now?". Both receivers
 * consult this before enqueuing any webhook. Priority:
 *
 *   1. No webhook URL configured        -> false
 *   2. Override FORCE_ON (not expired)  -> true   (ignore schedule)
 *   3. Override PAUSE    (not expired)  -> false  (mute even in office hours)
 *   4. Otherwise: master enabled AND inside the weekly office-hour window
 *
 * Expired overrides are treated as NONE (and lazily cleared).
 */
public final class EventGate {

    private EventGate() {}

    public static boolean shouldFire(Context ctx) {
        return shouldFire(ctx, System.currentTimeMillis());
    }

    /** Testable variant with an injected clock. */
    public static boolean shouldFire(Context ctx, long nowMs) {
        if (ConfigStore.getWebhookUrl(ctx).trim().isEmpty()) return false;

        String mode = ConfigStore.getOverrideMode(ctx);
        long until = ConfigStore.getOverrideUntil(ctx);
        boolean overrideActive = !ConfigStore.OVERRIDE_NONE.equals(mode) && nowMs < until;

        if (!overrideActive && !ConfigStore.OVERRIDE_NONE.equals(mode)) {
            // Override window passed — clear it so the UI reflects reality.
            ConfigStore.clearOverride(ctx);
        }

        if (overrideActive) {
            if (ConfigStore.OVERRIDE_FORCE_ON.equals(mode)) return true;
            if (ConfigStore.OVERRIDE_PAUSE.equals(mode)) return false;
        }

        if (!ConfigStore.isMasterEnabled(ctx)) return false;
        return withinSchedule(ctx, nowMs);
    }

    public static boolean withinSchedule(Context ctx, long nowMs) {
        Calendar cal = Calendar.getInstance();
        cal.setTimeInMillis(nowMs);

        int dow = cal.get(Calendar.DAY_OF_WEEK) - 1; // 0=Sun .. 6=Sat
        int minuteOfDay = cal.get(Calendar.HOUR_OF_DAY) * 60 + cal.get(Calendar.MINUTE);

        int start = ConfigStore.getStartMinute(ctx);
        int end = ConfigStore.getEndMinute(ctx);
        int daysMask = ConfigStore.getDaysMask(ctx);

        if (start == end) return false; // empty window

        if (start < end) {
            // Same-day window, e.g. 09:00–18:00.
            if (!isDayEnabled(daysMask, dow)) return false;
            return minuteOfDay >= start && minuteOfDay < end;
        } else {
            // Overnight window, e.g. 22:00–06:00. The "day" is the day the window
            // STARTED on, so the early-morning tail belongs to the previous day's bit.
            if (minuteOfDay >= start) {
                return isDayEnabled(daysMask, dow);
            } else if (minuteOfDay < end) {
                int prevDow = (dow + 6) % 7;
                return isDayEnabled(daysMask, prevDow);
            }
            return false;
        }
    }

    private static boolean isDayEnabled(int mask, int dow) {
        return (mask & (1 << dow)) != 0;
    }
}
