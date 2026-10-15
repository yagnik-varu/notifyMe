package com.notifyme.schedule;

import com.notifyme.storage.ConfigStore;

import java.util.Calendar;

/**
 * ScheduleRules — the pure "should an alert go out right now?" decision.
 *
 * <p>Who calls it: {@link EventGate} (which loads the values from ConfigStore) and the JVM
 * unit tests in {@code src/test/.../schedule/ScheduleRulesTest}.
 *
 * <p>WHY a separate class: it takes plain values instead of an Android {@code Context},
 * so every rule can be unit-tested on a normal computer without a phone or emulator.
 *
 * <p>Priority (first match wins):
 * <ol>
 *   <li>Override FORCE_ON, not expired → fire (ignores master switch and schedule)</li>
 *   <li>Override PAUSE, not expired → don't fire (even during office hours)</li>
 *   <li>Master switch off → don't fire</li>
 *   <li>Otherwise → fire only inside the weekly office-hours window</li>
 * </ol>
 * (The "no webhook URL" check happens before this, in EventGate.)
 */
public final class ScheduleRules {

    private ScheduleRules() {}

    /** True when an override other than NONE is set and hasn't expired yet. */
    public static boolean isOverrideActive(String mode, long untilMs, long nowMs) {
        return !ConfigStore.OVERRIDE_NONE.equals(mode) && nowMs < untilMs;
    }

    /**
     * Full decision. {@code nowMs} is converted to a local day/time with the phone's
     * time zone (Calendar.getInstance()).
     */
    public static boolean shouldFire(String overrideMode, long overrideUntil,
                                     boolean masterEnabled, int startMin, int endMin,
                                     int daysMask, long nowMs) {
        if (isOverrideActive(overrideMode, overrideUntil, nowMs)) {
            if (ConfigStore.OVERRIDE_FORCE_ON.equals(overrideMode)) return true;
            if (ConfigStore.OVERRIDE_PAUSE.equals(overrideMode)) return false;
        }
        if (!masterEnabled) return false;
        return withinSchedule(startMin, endMin, daysMask, nowMs);
    }

    /** True when {@code nowMs} (local time) falls inside the office-hours window. */
    public static boolean withinSchedule(int startMin, int endMin, int daysMask, long nowMs) {
        Calendar cal = Calendar.getInstance();
        cal.setTimeInMillis(nowMs);
        int dow = cal.get(Calendar.DAY_OF_WEEK) - 1; // 0=Sun .. 6=Sat (matches the bitmask)
        int minuteOfDay = cal.get(Calendar.HOUR_OF_DAY) * 60 + cal.get(Calendar.MINUTE);
        return withinSchedule(startMin, endMin, daysMask, dow, minuteOfDay);
    }

    /**
     * Window check on already-split values.
     *
     * @param dow         day of week, 0 = Sunday … 6 = Saturday
     * @param minuteOfDay minutes after local midnight, 0..1439
     */
    public static boolean withinSchedule(int startMin, int endMin, int daysMask,
                                         int dow, int minuteOfDay) {
        if (startMin == endMin) return false; // empty window: never fires

        if (startMin < endMin) {
            // Same-day window, e.g. 09:00–18:00. Start is inclusive, end exclusive.
            if (!isDayEnabled(daysMask, dow)) return false;
            return minuteOfDay >= startMin && minuteOfDay < endMin;
        }
        // ⚠ GOTCHA: overnight window, e.g. 22:00–06:00. The "day" is the day the window
        // STARTED on, so Friday 22:00–Saturday 06:00 is controlled by Friday's bit only.
        // The early-morning tail therefore checks the PREVIOUS day's bit.
        if (minuteOfDay >= startMin) {
            return isDayEnabled(daysMask, dow);
        } else if (minuteOfDay < endMin) {
            int prevDow = (dow + 6) % 7; // +6 mod 7 == -1 without going negative
            return isDayEnabled(daysMask, prevDow);
        }
        return false;
    }

    /** Reads bit {@code dow} of the days bitmask (bit0 = Sunday). */
    public static boolean isDayEnabled(int mask, int dow) {
        return (mask & (1 << dow)) != 0;
    }
}
