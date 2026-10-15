/**
 * Office-hours helpers (src/domain/schedule.ts).
 * Dates are built in local time, like the app does on the phone.
 */
import {
  daysSummary,
  fmtMin,
  isDayOn,
  nextWindowStart,
  scheduleSummary,
  toggleDay,
  windowLength,
} from '../src/domain/schedule';

// Bitmask cheat-sheet: bit 0 = Sunday … bit 6 = Saturday.
const WEEKDAYS = 0b0111110; // 62
const EVERY_DAY = 0b1111111; // 127

describe('fmtMin', () => {
  it('pads hours and minutes', () => {
    expect(fmtMin(0)).toBe('00:00');
    expect(fmtMin(540)).toBe('09:00');
    expect(fmtMin(1439)).toBe('23:59');
  });
});

describe('day bitmask', () => {
  it('reads and flips single days', () => {
    expect(isDayOn(WEEKDAYS, 1)).toBe(true); // Monday
    expect(isDayOn(WEEKDAYS, 0)).toBe(false); // Sunday
    expect(toggleDay(WEEKDAYS, 0)).toBe(EVERY_DAY - 0b1000000); // Sun–Fri
    expect(toggleDay(toggleDay(WEEKDAYS, 3), 3)).toBe(WEEKDAYS); // twice = unchanged
  });
});

describe('daysSummary', () => {
  it.each([
    [0, 'No days selected'],
    [EVERY_DAY, 'Every day'],
    [WEEKDAYS, 'Weekdays'],
    [0b1000001, 'Weekends'],
    [0b0011110, 'Mon–Thu'], // 3+ consecutive days become a range
    [0b0000110, 'Mon, Tue'], // only 2 → listed
    [0b0101010, 'Mon, Wed, Fri'],
  ])('mask %i → %s', (mask, text) => {
    expect(daysSummary(mask)).toBe(text);
  });
});

describe('windowLength', () => {
  it('handles same-day and overnight windows', () => {
    expect(windowLength(540, 1080)).toBe('9h');
    expect(windowLength(540, 1065)).toBe('8h 45m');
    expect(windowLength(600, 630)).toBe('30m');
    expect(windowLength(22 * 60, 6 * 60)).toBe('8h'); // 22:00 → 06:00
  });
});

describe('nextWindowStart', () => {
  // Wednesday 14 Oct 2026 (month is 0-based in JS: 9 = October).
  const wed = (h: number, m = 0) => new Date(2026, 9, 14, h, m);

  it('later today when before the start time', () => {
    expect(nextWindowStart(540, 1080, WEEKDAYS, wed(8))).toBe('today at 09:00');
  });

  it('tomorrow once today has started', () => {
    expect(nextWindowStart(540, 1080, WEEKDAYS, wed(10))).toBe('tomorrow at 09:00');
  });

  it('skips disabled days (Friday evening → Monday)', () => {
    const fri = new Date(2026, 9, 16, 19, 0);
    expect(nextWindowStart(540, 1080, WEEKDAYS, fri)).toBe('Mon at 09:00');
  });

  it('never when no days or an empty window', () => {
    expect(nextWindowStart(540, 1080, 0, wed(8))).toBeNull();
    expect(nextWindowStart(540, 540, WEEKDAYS, wed(8))).toBeNull();
  });
});

describe('scheduleSummary', () => {
  it('flags windows that never run', () => {
    expect(scheduleSummary(540, 540, WEEKDAYS).isProblem).toBe(true);
    expect(scheduleSummary(540, 1080, 0).isProblem).toBe(true);
  });

  it('describes normal and overnight windows', () => {
    expect(scheduleSummary(540, 1080, WEEKDAYS)).toEqual({
      text: 'Weekdays · 9h a day',
      isProblem: false,
    });
    expect(scheduleSummary(1320, 360, EVERY_DAY).text).toBe('Every day · 8h a day (overnight)');
  });
});
