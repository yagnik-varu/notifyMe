package com.notifyme.schedule;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import com.notifyme.storage.ConfigStore;

import org.junit.AfterClass;
import org.junit.BeforeClass;
import org.junit.Test;

import java.util.Calendar;
import java.util.TimeZone;

/**
 * Unit tests for {@link ScheduleRules} — the "should an alert go out now?" decision.
 * Runs on your computer: {@code ./gradlew :app:testDebugUnitTest}.
 */
public class ScheduleRulesTest {

    // Day-of-week numbers used by the bitmask (bit0 = Sunday).
    private static final int SUN = 0, MON = 1, FRI = 5, SAT = 6;
    private static final int WEEKDAYS = 0b0111110; // Mon..Fri = 62
    private static final int NINE = 9 * 60, SIX_PM = 18 * 60;
    private static final int TEN_PM = 22 * 60, SIX_AM = 6 * 60;

    private static TimeZone originalTz;

    @BeforeClass
    public static void useUtc() {
        // WHY: shouldFire() turns epoch ms into local time; fix the zone so tests are stable.
        originalTz = TimeZone.getDefault();
        TimeZone.setDefault(TimeZone.getTimeZone("UTC"));
    }

    @AfterClass
    public static void restoreTz() {
        TimeZone.setDefault(originalTz);
    }

    /** Epoch ms for a given weekday + time in UTC, in the week of 2024-01-07 (a Sunday). */
    private static long at(int dow, int hour, int minute) {
        Calendar c = Calendar.getInstance(TimeZone.getTimeZone("UTC"));
        c.clear();
        c.set(2024, Calendar.JANUARY, 7 + dow, hour, minute, 0);
        return c.getTimeInMillis();
    }

    private static boolean window(int start, int end, int mask, int dow, int minute) {
        return ScheduleRules.withinSchedule(start, end, mask, dow, minute);
    }

    // ---- Same-day window ----

    @Test public void sameDay_insideOnEnabledDay() {
        assertTrue(window(NINE, SIX_PM, WEEKDAYS, MON, 12 * 60));
    }

    @Test public void sameDay_startIsInclusive_endIsExclusive() {
        assertTrue(window(NINE, SIX_PM, WEEKDAYS, MON, NINE));
        assertFalse(window(NINE, SIX_PM, WEEKDAYS, MON, SIX_PM));
        assertTrue(window(NINE, SIX_PM, WEEKDAYS, MON, SIX_PM - 1));
        assertFalse(window(NINE, SIX_PM, WEEKDAYS, MON, NINE - 1));
    }

    @Test public void sameDay_dayNotEnabled() {
        assertFalse(window(NINE, SIX_PM, WEEKDAYS, SAT, 12 * 60));
        assertFalse(window(NINE, SIX_PM, WEEKDAYS, SUN, 12 * 60));
    }

    @Test public void emptyWindow_neverFires() {
        assertFalse(window(NINE, NINE, 0b1111111, MON, NINE));
        assertFalse(window(NINE, NINE, 0b1111111, MON, 0));
    }

    // ---- Overnight window (22:00–06:00) ----

    @Test public void overnight_eveningPartUsesTodaysBit() {
        int fridayOnly = 1 << FRI;
        assertTrue(window(TEN_PM, SIX_AM, fridayOnly, FRI, 23 * 60));
        assertFalse(window(TEN_PM, SIX_AM, fridayOnly, SAT, 23 * 60));
    }

    @Test public void overnight_morningTailUsesPreviousDaysBit() {
        int fridayOnly = 1 << FRI;
        // Saturday 03:00 belongs to Friday night's window.
        assertTrue(window(TEN_PM, SIX_AM, fridayOnly, SAT, 3 * 60));
        // Friday 03:00 belongs to Thursday night's window, which is off.
        assertFalse(window(TEN_PM, SIX_AM, fridayOnly, FRI, 3 * 60));
    }

    @Test public void overnight_sundayTailWrapsToSaturday() {
        int saturdayOnly = 1 << SAT;
        assertTrue(window(TEN_PM, SIX_AM, saturdayOnly, SUN, 1 * 60));
    }

    @Test public void overnight_middayIsOutside() {
        assertFalse(window(TEN_PM, SIX_AM, 0b1111111, MON, 12 * 60));
    }

    // ---- Full decision (master switch + overrides) ----

    private static boolean decide(String mode, long until, boolean master, long now) {
        return ScheduleRules.shouldFire(mode, until, master, NINE, SIX_PM, WEEKDAYS, now);
    }

    @Test public void masterOn_insideHours_fires() {
        assertTrue(decide(ConfigStore.OVERRIDE_NONE, 0, true, at(MON, 10, 0)));
    }

    @Test public void masterOff_neverFiresWithoutOverride() {
        assertFalse(decide(ConfigStore.OVERRIDE_NONE, 0, false, at(MON, 10, 0)));
    }

    @Test public void masterOn_outsideHours_doesNotFire() {
        assertFalse(decide(ConfigStore.OVERRIDE_NONE, 0, true, at(MON, 20, 0)));
        assertFalse(decide(ConfigStore.OVERRIDE_NONE, 0, true, at(SAT, 10, 0)));
    }

    @Test public void forceOn_beatsMasterOffAndSchedule() {
        long now = at(SAT, 20, 0);
        assertTrue(decide(ConfigStore.OVERRIDE_FORCE_ON, now + 60_000, false, now));
    }

    @Test public void pause_mutesInsideHours() {
        long now = at(MON, 10, 0);
        assertFalse(decide(ConfigStore.OVERRIDE_PAUSE, now + 60_000, true, now));
    }

    @Test public void expiredOverride_isIgnored() {
        long now = at(MON, 10, 0);
        // Expired pause → schedule applies → fires.
        assertTrue(decide(ConfigStore.OVERRIDE_PAUSE, now - 1, true, now));
        // Expired force-on outside hours → schedule applies → doesn't fire.
        long night = at(MON, 22, 0);
        assertFalse(decide(ConfigStore.OVERRIDE_FORCE_ON, night - 1, true, night));
    }

    @Test public void overrideActive_requiresModeAndFutureExpiry() {
        assertTrue(ScheduleRules.isOverrideActive(ConfigStore.OVERRIDE_PAUSE, 2000, 1000));
        assertFalse(ScheduleRules.isOverrideActive(ConfigStore.OVERRIDE_PAUSE, 1000, 1000));
        assertFalse(ScheduleRules.isOverrideActive(ConfigStore.OVERRIDE_NONE, 2000, 1000));
    }
}
