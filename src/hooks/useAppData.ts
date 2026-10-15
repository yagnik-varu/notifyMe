/**
 * Loads and holds everything the home screen shows that comes from the phone:
 * config, live status, caller-ID role, battery status and history.
 *
 * Two ways to reload:
 *  - refresh(): everything, including slow-to-change system state (caller-ID
 *    role, battery). Used on start, when returning to the app, pull-to-refresh.
 *    Returns the config so the caller can reset form drafts from it.
 *  - reread(): only config + status + history, after the user changed a
 *    setting. Doesn't touch anything the user is typing.
 *
 * WHY re-ask the native side after every write instead of trusting local state:
 * the native side owns the rules (e.g. it decides whether an override expired),
 * so reading back keeps the screen honest.
 */
import {useCallback, useState} from 'react';
import {Battery, Config, HistoryEntry, NotifyMe, Screening, Status} from '../native';

export function useAppData() {
  const [cfg, setCfg] = useState<Config | null>(null);
  const [status, setStatus] = useState<Status | null>(null);
  const [screening, setScreening] = useState<Screening | null>(null);
  const [battery, setBattery] = useState<Battery | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loadError, setLoadError] = useState(false);

  // useCallback with [] = the same function object every render, so effects that
  // depend on it don't re-run needlessly.
  const refresh = useCallback(async (): Promise<Config | null> => {
    try {
      // Promise.all fires all five bridge calls at once instead of one after another.
      const [conf, st, sc, bat, hist] = await Promise.all([
        NotifyMe.getConfig(),
        NotifyMe.getStatus(),
        NotifyMe.getScreening(),
        NotifyMe.getBatteryStatus(),
        NotifyMe.getHistory(),
      ]);
      setCfg(conf);
      setStatus(st);
      setScreening(sc);
      setBattery(bat);
      setHistory(hist);
      setLoadError(false);
      return conf;
    } catch {
      setLoadError(true);
      return null;
    }
  }, []);

  const reread = useCallback(async () => {
    const [conf, st, hist] = await Promise.all([
      NotifyMe.getConfig(),
      NotifyMe.getStatus(),
      NotifyMe.getHistory(),
    ]);
    setCfg(conf);
    setStatus(st);
    setHistory(hist);
  }, []);

  return {
    cfg,
    /** Optimistic local update, so the UI reacts before reread() returns. */
    setCfg,
    status,
    screening,
    battery,
    history,
    setHistory,
    loadError,
    refresh,
    reread,
  };
}
