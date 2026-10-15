/**
 * Helpers for showing Activity (history) rows. Pure functions, unit-tested in
 * __tests__/history.test.ts.
 *
 * History rows are written by the Android delivery code (delivery/Delivery.java
 * → storage/HistoryStore.java) and read here via NotifyMe.getHistory().
 */
import {HistoryEntry} from '../native/types';
import {fmtMin} from './schedule';

export type HistoryKind = 'incoming' | 'missed' | 'test';

/**
 * The row's kind. Rows saved by older app versions have no `kind` field; for those
 * a label of "Test" means a test send and anything else an incoming call.
 */
export function historyKind(e: HistoryEntry): HistoryKind {
  if (e.kind) return e.kind;
  return e.label === 'Test' ? 'test' : 'incoming';
}

/** True for rows produced by "Send test". */
export function isTestEntry(e: HistoryEntry): boolean {
  return historyKind(e) === 'test';
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

// Older app versions stored raw codes ("HTTP 401", "Sent") in `detail`; newer
// ones store plain language. Translate the old ones so the list reads consistently.
const LEGACY_HTTP: Record<number, string> = {
  400: "The service didn't accept the message.",
  401: 'The webhook or token was rejected.',
  403: 'Not allowed to post to this webhook.',
  404: 'Webhook not found. The link may be wrong or deleted.',
  410: 'This webhook was deleted.',
  429: 'Too many messages. Try again in a few minutes.',
};

/** Turn a stored `detail` into text fit for the screen. */
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
