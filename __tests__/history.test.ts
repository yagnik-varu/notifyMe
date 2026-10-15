/** Activity-row helpers (src/domain/history.ts). */
import {friendlyDetail, historyKind, relativeTime} from '../src/domain/history';

describe('friendlyDetail', () => {
  it('keeps new plain-language details as they are', () => {
    expect(friendlyDetail('Delivered to Slack', true)).toBe('Delivered to Slack');
    expect(friendlyDetail('Bot not found.', false)).toBe('Bot not found.');
  });

  it('translates details stored by older versions', () => {
    expect(friendlyDetail('Sent', true)).toBe('Delivered');
    expect(friendlyDetail('HTTP 401', false)).toBe('The webhook or token was rejected.');
    expect(friendlyDetail('HTTP 503', false)).toBe('The service is having trouble right now.');
    expect(friendlyDetail('HTTP 418', false)).toBe("The service didn't accept the message.");
    expect(friendlyDetail('Network error', false)).toBe(
      "Couldn't connect. Check your internet connection.",
    );
  });
});

describe('historyKind', () => {
  const row = {label: 'Jane', timestamp: 0, success: true, detail: ''};

  it('uses the stored kind when present', () => {
    expect(historyKind({...row, kind: 'missed'})).toBe('missed');
  });

  it('guesses for rows saved before `kind` existed', () => {
    expect(historyKind({...row, label: 'Test'})).toBe('test');
    expect(historyKind(row)).toBe('incoming');
  });
});

describe('relativeTime', () => {
  const now = new Date(2026, 9, 14, 15, 0).getTime(); // Wed 14 Oct 2026, 15:00
  const min = 60_000;

  it('recent times are relative', () => {
    expect(relativeTime(now - 20_000, now)).toBe('Just now');
    expect(relativeTime(now - 5 * min, now)).toBe('5 min ago');
  });

  it('older times show the clock', () => {
    expect(relativeTime(new Date(2026, 9, 14, 9, 5).getTime(), now)).toBe('Today, 09:05');
    expect(relativeTime(new Date(2026, 9, 13, 18, 40).getTime(), now)).toBe('Yesterday, 18:40');
  });
});
