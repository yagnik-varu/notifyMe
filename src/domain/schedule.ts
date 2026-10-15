/**
 * Office-hours helpers: formatting times, describing day selections, and
 * working out when alerts next start. Pure functions — no React, no native
 * calls — so they are easy to read and are unit-tested in __tests__/schedule.test.ts.
 *
 * Two encodings are used throughout the app (and stored on the phone):
 *
 *  - Time of day = minutes since midnight. 0 = 00:00, 540 = 09:00, 1439 = 23:59.
 *    WHY: one integer is easy to compare and store; no time-zone or date baggage.
 *
 *  - Office days = a 7-bit bitmask, bit 0 = Sunday … bit 6 = Saturday.
 *    Example: Mon–Fri = bits 1..5 = 0b0111110 = 62.
 *    WHY: one integer holds the whole week, and the bit index equals JS
 *    `Date.getDay()` and Java `Calendar.DAY_OF_WEEK - 1`, so both sides agree.
 *
 * The decision "is NOW inside office hours?" is made on the Android side
 * (schedule/ScheduleRules.java), because it must work while the app is closed.
 * This file only produces text for the screen.
 */

/** Three-letter day names indexed like the bitmask (0 = Sunday). */
export const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
/** One-letter labels for the day chips. */
export const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
/** Full names, read out by screen readers. */
export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** Bitmask for Monday–Friday. */
export const WEEKDAYS_MASK = 0b0111110;
/** Bitmask for Saturday + Sunday. */
export const WEEKENDS_MASK = 0b1000001;

// The two functions below are the only bit operations in the UI code; the
// `no-bitwise` lint rule exists to catch accidental `&` instead of `&&`, so it is
// switched off just for these deliberate uses.

/** Is `day` (0 = Sunday) switched on in `mask`? */
export function isDayOn(mask: number, day: number): boolean {
  // eslint-disable-next-line no-bitwise
  return (mask & (1 << day)) !== 0;
}

/** `mask` with `day` flipped on/off (XOR with that day's bit). */
export function toggleDay(mask: number, day: number): number {
  // eslint-disable-next-line no-bitwise
  return mask ^ (1 << day);
}

/** 540 → "09:00". */
export function fmtMin(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** "Every day", "Weekdays", "Weekends", "Mon–Thu" (3+ in a row), or "Mon, Wed, Fri". */
export function daysSummary(mask: number): string {
  const on = [0, 1, 2, 3, 4, 5, 6].filter(i => isDayOn(mask, i));
  if (on.length === 0) return 'No days selected';
  if (on.length === 7) return 'Every day';
  if (mask === WEEKDAYS_MASK) return 'Weekdays';
  if (mask === WEEKENDS_MASK) return 'Weekends';
  const contiguous = on.every((d, i) => i === 0 || d === on[i - 1] + 1);
  if (contiguous && on.length > 2) {
    return `${DAY_SHORT[on[0]]}–${DAY_SHORT[on[on.length - 1]]}`;
  }
  return on.map(d => DAY_SHORT[d]).join(', ');
}

/**
 * When the office-hours window next opens, phrased for a person:
 * "today at 09:00", "tomorrow at 09:00", "Mon at 09:00". Null when it never opens
 * (no days selected, or start === end).
 *
 * `now` is a parameter so tests can pass a fixed date.
 */
export function nextWindowStart(
  startMin: number,
  endMin: number,
  mask: number,
  now = new Date(),
): string | null {
  if (mask === 0 || startMin === endMin) return null;
  // Look at today and the next 7 days; the first enabled day whose start time is
  // still in the future wins.
  for (let offset = 0; offset <= 7; offset++) {
    const day = new Date(now);
    day.setDate(now.getDate() + offset);
    day.setHours(Math.floor(startMin / 60), startMin % 60, 0, 0);
    if (!isDayOn(mask, day.getDay()) || day <= now) continue;
    const at = `at ${fmtMin(startMin)}`;
    if (offset === 0) return `today ${at}`;
    if (offset === 1) return `tomorrow ${at}`;
    return `${DAY_SHORT[day.getDay()]} ${at}`;
  }
  return null;
}

/**
 * Length of the daily window, e.g. "8h 45m".
 * Handles overnight windows: 22:00 → 06:00 is 8h, thanks to the `+ 1440) % 1440`
 * wrap-around (1440 = minutes in a day).
 */
export function windowLength(startMin: number, endMin: number): string {
  const mins = (endMin - startMin + 1440) % 1440;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

/**
 * One-line description under the schedule controls, plus whether it describes a
 * problem (shown in the warning color).
 */
export function scheduleSummary(
  startMin: number,
  endMin: number,
  mask: number,
): {text: string; isProblem: boolean} {
  if (startMin === endMin) {
    return {
      text: 'Start and end are the same, so alerts never run. Pick different times.',
      isProblem: true,
    };
  }
  if (mask === 0) {
    return {text: 'No days selected, so alerts never run.', isProblem: true};
  }
  const overnight = endMin < startMin;
  return {
    text: `${daysSummary(mask)} · ${windowLength(startMin, endMin)} a day${
      overnight ? ' (overnight)' : ''
    }`,
    isProblem: false,
  };
}

/**
 * 23:59:59 today as epoch ms — when "Always on" / "Pause" for today expires.
 * The native side compares this against the current time on every call.
 */
export function endOfToday(): number {
  const d = new Date();
  d.setHours(23, 59, 59, 0);
  return d.getTime();
}
