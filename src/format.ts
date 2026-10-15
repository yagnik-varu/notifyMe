// Pure display helpers — no React, so they stay easy to reason about.

const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function fmtMin(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function clock(d: Date): string {
  return fmtMin(d.getHours() * 60 + d.getMinutes());
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** "Just now", "5 min ago", "Today, 14:05", "Yesterday, 09:12", "Oct 3, 18:40". */
export function relativeTime(ts: number, now = Date.now()): string {
  const diff = now - ts;
  if (diff >= 0 && diff < 60_000) return 'Just now';
  if (diff >= 0 && diff < 60 * 60_000) return `${Math.floor(diff / 60_000)} min ago`;
  const d = new Date(ts);
  const today = new Date(now);
  const yesterday = new Date(now - 86_400_000);
  if (sameDay(d, today)) return `Today, ${clock(d)}`;
  if (sameDay(d, yesterday)) return `Yesterday, ${clock(d)}`;
  const date = d.toLocaleDateString([], {month: 'short', day: 'numeric'});
  return `${date}, ${clock(d)}`;
}

/** Compact day summary: "Every day", "Weekdays", "Weekends", "Mon–Thu", "Mon, Wed, Fri". */
export function daysSummary(mask: number): string {
  const on = [0, 1, 2, 3, 4, 5, 6].filter(i => (mask & (1 << i)) !== 0);
  if (on.length === 0) return 'No days selected';
  if (on.length === 7) return 'Every day';
  if (mask === 0b0111110) return 'Weekdays';
  if (mask === 0b1000001) return 'Weekends';
  const contiguous = on.every((d, i) => i === 0 || d === on[i - 1] + 1);
  if (contiguous && on.length > 2) {
    return `${DAY_SHORT[on[0]]}–${DAY_SHORT[on[on.length - 1]]}`;
  }
  return on.map(d => DAY_SHORT[d]).join(', ');
}

/**
 * When the office-hours window next opens, phrased for a person:
 * "today at 09:00", "tomorrow at 09:00", "Mon at 09:00". Null when it never opens.
 */
export function nextWindowStart(
  startMin: number,
  endMin: number,
  mask: number,
  now = new Date(),
): string | null {
  if (mask === 0 || startMin === endMin) return null;
  for (let offset = 0; offset <= 7; offset++) {
    const day = new Date(now);
    day.setDate(now.getDate() + offset);
    day.setHours(Math.floor(startMin / 60), startMin % 60, 0, 0);
    if ((mask & (1 << day.getDay())) === 0 || day <= now) continue;
    const at = `at ${fmtMin(startMin)}`;
    if (offset === 0) return `today ${at}`;
    if (offset === 1) return `tomorrow ${at}`;
    return `${DAY_SHORT[day.getDay()]} ${at}`;
  }
  return null;
}

/** Length of the daily window, e.g. "8h 45m". Handles overnight windows. */
export function windowLength(startMin: number, endMin: number): string {
  const mins = (endMin - startMin + 1440) % 1440;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

// Older history rows stored raw codes ("HTTP 401", "Sent"); newer ones are already
// plain language. Translate the old ones so the list reads consistently.
const LEGACY_HTTP: Record<number, string> = {
  400: "The service didn't accept the message.",
  401: 'The webhook or token was rejected.',
  403: 'Not allowed to post to this webhook.',
  404: 'Webhook not found. The link may be wrong or deleted.',
  410: 'This webhook was deleted.',
  429: 'Too many messages. Try again in a few minutes.',
};

export function friendlyDetail(detail: string, success: boolean): string {
  if (success) return detail === 'Sent' ? 'Delivered' : detail;
  const m = /^HTTP (\d{3})$/.exec(detail);
  if (m) {
    const code = Number(m[1]);
    return (
      LEGACY_HTTP[code] ??
      (code >= 500
        ? 'The service is having trouble right now.'
        : "The service didn't accept the message.")
    );
  }
  if (detail === 'Network error') return "Couldn't connect. Check your internet connection.";
  return detail;
}
