/**
 * The ONLY file that talks to the Android side.
 *
 * How it works: Android code annotated with @ReactMethod in
 * android/app/src/main/java/com/notifyme/bridge/NotifyMeModule.kt is exposed by
 * React Native as `NativeModules.NotifyMe`. This file wraps that untyped object in
 * a typed `NotifyMe` API so the rest of the app gets autocomplete and type checks.
 *
 * Rules of the bridge worth knowing:
 *  - Every call is asynchronous. Methods that return data return a Promise;
 *    "set…" methods return nothing and are fire-and-forget (the write happens a
 *    moment later on the native side).
 *  - Only simple values cross: strings, numbers, booleans, plain objects/arrays.
 *  - Numbers are always doubles in JS — that's why epoch-ms values arrive in
 *    Kotlin as `Double` and get converted with `.toLong()`.
 *
 * Used by: hooks in src/hooks and screen code in src/screens.
 * To add a method: docs/guides/add-a-native-method.md.
 */
import {NativeModules} from 'react-native';
import {
  Battery,
  Config,
  HapticKind,
  HistoryEntry,
  Screening,
  ScreeningResult,
  Status,
} from './types';

/** Raw shape of NativeModules.NotifyMe — mirrors the @ReactMethod list in NotifyMeModule.kt. */
type NativeApi = {
  getConfig(): Promise<Config>;
  getStatus(): Promise<Status>;
  getHistory(): Promise<string>;
  getScreening(): Promise<Screening>;
  getBatteryStatus(): Promise<Battery>;
  requestBatteryExemption(): void;
  setWebhookUrl(url: string): void;
  setPlatform(platform: string): void;
  setCliqUser(user: string): void;
  setCliqToken(token: string): void;
  setMasterEnabled(enabled: boolean): void;
  setHideNumber(enabled: boolean): void;
  setSchedule(startMin: number, endMin: number): void;
  setDaysMask(mask: number): void;
  setOverride(mode: string, untilMs: number): void;
  clearOverride(): void;
  clearHistory(): void;
  restoreHistory(json: string): void;
  haptic(kind: string): void;
  sendTest(): void;
  requestScreeningRole(): Promise<string>;
};

// The name "NotifyMe" comes from getName() in NotifyMeModule.kt.
const Native = NativeModules.NotifyMe as NativeApi;

const NotifyMe = {
  // ---- Reads ----

  /** All saved settings. */
  getConfig: () => Native.getConfig(),
  /** Whether a call would be posted right now, and why. */
  getStatus: () => Native.getStatus(),
  /** Caller-ID role support and whether it's granted. */
  getScreening: () => Native.getScreening(),
  /** Whether the app is exempt from battery optimization. */
  getBatteryStatus: () => Native.getBatteryStatus(),

  /**
   * Activity history, newest first (max 50).
   * WHY a JSON string on the wire: the native side already stores history as a
   * JSON string, so it hands it over as-is instead of converting each row into a
   * bridge map. A corrupt value degrades to an empty list rather than crashing.
   */
  async getHistory(): Promise<HistoryEntry[]> {
    try {
      return JSON.parse(await Native.getHistory()) as HistoryEntry[];
    } catch {
      return [];
    }
  },

  // ---- Writes (fire-and-forget) ----

  setWebhookUrl: (url: string) => Native.setWebhookUrl(url),
  setPlatform: (p: string) => Native.setPlatform(p),
  setCliqUser: (u: string) => Native.setCliqUser(u),
  setCliqToken: (t: string) => Native.setCliqToken(t),
  setMasterEnabled: (e: boolean) => Native.setMasterEnabled(e),
  setHideNumber: (e: boolean) => Native.setHideNumber(e),
  /** Office hours in minutes since midnight. */
  setSchedule: (s: number, e: number) => Native.setSchedule(s, e),
  /** Office days bitmask (bit 0 = Sunday). */
  setDaysMask: (m: number) => Native.setDaysMask(m),
  /** Start a FORCE_ON / PAUSE override that ends at `untilMs` (epoch ms). */
  setOverride: (mode: string, untilMs: number) => Native.setOverride(mode, untilMs),
  /** Go back to following the schedule. */
  clearOverride: () => Native.clearOverride(),
  clearHistory: () => Native.clearHistory(),
  /** Undo for clearHistory: puts the given rows back behind anything newer. */
  restoreHistory: (entries: HistoryEntry[]) => Native.restoreHistory(JSON.stringify(entries)),

  // ---- Actions ----

  /** Opens Android's "allow running in background" dialog. */
  requestBatteryExemption: () => Native.requestBatteryExemption(),
  /**
   * System touch feedback. No-op if unavailable.
   * WHY `?.`: keeps the UI working against an older native build without this method.
   */
  haptic: (kind: HapticKind) => Native.haptic?.(kind),
  /**
   * Queue a test message through the same delivery path a real call uses.
   * The result is NOT returned — it shows up later as a history row with kind 'test'
   * (useTestSend polls for it).
   */
  sendTest: () => Native.sendTest(),
  /** Shows Android's "set as caller ID app" dialog. Resolves when the user answers. */
  requestScreeningRole: () => Native.requestScreeningRole() as Promise<ScreeningResult>,
};

export default NotifyMe;
