/**
 * Data shapes that cross the JS ↔ Android bridge.
 *
 * ⚠ GOTCHA: these types are a promise, not a check. TypeScript cannot see the
 * Kotlin side, so if NotifyMeModule.kt (android/.../bridge/) changes a field name,
 * nothing fails at compile time — the value just arrives as `undefined`.
 * When you change one side, change the other (see docs/07-native-bridge.md).
 */

/**
 * "Today" override modes. Strings must match ConfigStore.OVERRIDE_* in
 * android/.../storage/ConfigStore.java exactly — they are stored on the phone.
 */
export const OVERRIDE = {
  /** Follow the office-hours schedule. */
  NONE: 'NONE',
  /** Post every call until `overrideUntil`, ignoring the schedule. */
  FORCE_ON: 'FORCE_ON',
  /** Post nothing until `overrideUntil`, even during office hours. */
  PAUSE: 'PAUSE',
} as const;

/** Everything the user has configured. Returned by `NotifyMe.getConfig()`. */
export interface Config {
  /** Saved webhook / bot endpoint URL; '' when no destination is set. */
  url: string;
  /** Destination id: 'slack' | 'discord' | 'teams' | 'cliq' | 'generic'. See src/destinations. */
  platform: string;
  /** Zoho Cliq only: recipient email; '' = every bot subscriber. */
  cliqUser: string;
  /** Zoho Cliq only: webhook token, sent as ?zapikey=… */
  cliqToken: string;
  /** The big on/off switch at the top of the screen. */
  masterEnabled: boolean;
  /** Hide phone number when contact name is available. */
  hideNumber: boolean;
  /** Office hours start, in minutes since midnight (540 = 09:00). */
  startMin: number;
  /** Office hours end, in minutes since midnight. Smaller than start = overnight window. */
  endMin: number;
  /** Office days as a bitmask: bit 0 = Sunday … bit 6 = Saturday (62 = Mon–Fri). */
  daysMask: number;
  /** One of OVERRIDE.*. */
  overrideMode: string;
  /** When the override expires, epoch milliseconds. */
  overrideUntil: number;
}

/** Live "would a call be posted right now?" status. Returned by `getStatus()`. */
export interface Status {
  /** paused = PAUSE override active; active = a call would be posted now; off = otherwise. */
  state: 'active' | 'paused' | 'off';
  /** True while a FORCE_ON or PAUSE override has not expired. */
  overrideActive: boolean;
  /** True while FORCE_ON is active. */
  forced: boolean;
  overrideMode: string;
}

/** Caller-ID ("call screening" role) availability. Returned by `getScreening()`. */
export interface Screening {
  /** The phone runs Android 10+ (the role exists). */
  supported: boolean;
  /** The user has granted the role to Notify-Me. */
  held: boolean;
}

/** Battery-optimization status. Returned by `getBatteryStatus()`. */
export interface Battery {
  /** True when Android won't put the app to sleep ("Unrestricted"). */
  exempt: boolean;
}

/** One row in the Activity list. Written by the native delivery code. */
export interface HistoryEntry {
  /** Caller label ("Jane (+1555…)", "" when unknown) or "Test". */
  label: string;
  /** Absent on rows saved by older app versions — see historyKind() in domain/history.ts. */
  kind?: 'incoming' | 'missed' | 'test';
  /** When the call rang (or the test was sent), epoch ms. */
  timestamp: number;
  /** True when the destination accepted the message (HTTP 2xx). */
  success: boolean;
  /** Plain-language result: "Delivered to Slack" or the failure reason. */
  detail: string;
}

/** Result of asking for the caller-ID role. */
export type ScreeningResult = 'granted' | 'held' | 'denied' | 'unsupported' | 'unavailable';

/** Kinds of system touch feedback the native side can play. */
export type HapticKind = 'confirm' | 'reject' | 'tick';
