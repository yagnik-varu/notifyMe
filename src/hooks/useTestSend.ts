/**
 * "Send test" with the result shown right under the button.
 *
 * ⚠ GOTCHA: NotifyMe.sendTest() returns nothing. The test is queued in Android's
 * WorkManager (the same path a real call uses) and may run seconds later, or be
 * retried if offline. So to show a result we POLL the history every 1.5 s until a
 * test row newer than our click appears — up to 16 times (~24 s). If none shows
 * up, we say "Still trying" and the row will appear in Activity later.
 *
 * Cancellation: `runId` is a counter in a ref. Each new test (or unmounting the
 * screen) bumps it; an older poll loop sees the number changed and quietly stops.
 * WHY a ref: changing it must not re-render, and the loop must read the latest
 * value — a state variable would be stale inside the running async function.
 */
import {useCallback, useEffect, useRef, useState} from 'react';
import {friendlyDetail, isTestEntry} from '../domain/history';
import {HistoryEntry, NotifyMe} from '../native';

export type TestState =
  | {phase: 'idle'}
  | {phase: 'sending'}
  | {phase: 'ok'; detail: string}
  | {phase: 'fail'; detail: string}
  /** Nothing in history yet after polling — still queued/retrying in the background. */
  | {phase: 'slow'};

const POLL_INTERVAL_MS = 1500;
const POLL_TRIES = 16;
/** Accept rows stamped slightly before the click (clock/queue jitter). */
const CLOCK_SLACK_MS = 1500;

const wait = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

/**
 * @param onHistory receives the fresh history list when the result arrives,
 *                  so the Activity list updates at the same moment.
 */
export function useTestSend(onHistory: (history: HistoryEntry[]) => void) {
  const [test, setTest] = useState<TestState>({phase: 'idle'});
  const runId = useRef(0);

  // On unmount, cancel any poll in flight.
  useEffect(() => {
    const run = runId;
    return () => {
      run.current++;
    };
  }, []);

  const start = useCallback(async () => {
    const id = ++runId.current;
    const since = Date.now() - CLOCK_SLACK_MS;
    setTest({phase: 'sending'});
    NotifyMe.sendTest();
    for (let i = 0; i < POLL_TRIES; i++) {
      await wait(POLL_INTERVAL_MS);
      if (runId.current !== id) return; // a newer test started, or screen closed
      const hist = await NotifyMe.getHistory();
      const hit = hist.find(e => isTestEntry(e) && e.timestamp >= since);
      if (hit) {
        onHistory(hist);
        NotifyMe.haptic(hit.success ? 'confirm' : 'reject');
        setTest(
          hit.success
            ? {phase: 'ok', detail: hit.detail}
            : {phase: 'fail', detail: friendlyDetail(hit.detail, false)},
        );
        return;
      }
    }
    if (runId.current === id) setTest({phase: 'slow'});
  }, [onHistory]);

  /** Hide the result banner (e.g. after the destination changed). */
  const reset = useCallback(() => setTest({phase: 'idle'}), []);

  return {test, start, reset};
}
