import {NativeModules} from 'react-native';

// Platform + override constants — must match ConfigStore.java exactly.
export const PLATFORMS = [
  {value: 'slack', label: 'Slack'},
  {value: 'discord', label: 'Discord'},
  {value: 'teams', label: 'Microsoft Teams'},
  {value: 'generic', label: 'Generic'},
] as const;

export const OVERRIDE = {
  NONE: 'NONE',
  FORCE_ON: 'FORCE_ON',
  PAUSE: 'PAUSE',
} as const;

export interface Config {
  url: string;
  platform: string;
  masterEnabled: boolean;
  startMin: number;
  endMin: number;
  daysMask: number;
  overrideMode: string;
  overrideUntil: number;
}

export interface Status {
  state: 'active' | 'paused' | 'off';
  overrideActive: boolean;
  forced: boolean;
  overrideMode: string;
}

export interface Screening {
  supported: boolean;
  held: boolean;
}

export interface Battery {
  exempt: boolean;
}

export interface HistoryEntry {
  label: string;
  timestamp: number;
  success: boolean;
  detail: string;
}

type Native = {
  getConfig(): Promise<Config>;
  getStatus(): Promise<Status>;
  getHistory(): Promise<string>;
  getScreening(): Promise<Screening>;
  getBatteryStatus(): Promise<Battery>;
  requestBatteryExemption(): void;
  setWebhookUrl(url: string): void;
  setPlatform(platform: string): void;
  setMasterEnabled(enabled: boolean): void;
  setSchedule(startMin: number, endMin: number): void;
  setDaysMask(mask: number): void;
  setOverride(mode: string, untilMs: number): void;
  clearOverride(): void;
  clearHistory(): void;
  sendTest(): void;
  requestScreeningRole(): Promise<string>;
};

const Native = NativeModules.NotifyMe as Native;

const api = {
  getConfig: () => Native.getConfig(),
  getStatus: () => Native.getStatus(),
  getScreening: () => Native.getScreening(),
  getBatteryStatus: () => Native.getBatteryStatus(),
  requestBatteryExemption: () => Native.requestBatteryExemption(),
  async getHistory(): Promise<HistoryEntry[]> {
    try {
      return JSON.parse(await Native.getHistory()) as HistoryEntry[];
    } catch {
      return [];
    }
  },
  setWebhookUrl: (url: string) => Native.setWebhookUrl(url),
  setPlatform: (p: string) => Native.setPlatform(p),
  setMasterEnabled: (e: boolean) => Native.setMasterEnabled(e),
  setSchedule: (s: number, e: number) => Native.setSchedule(s, e),
  setDaysMask: (m: number) => Native.setDaysMask(m),
  setOverride: (mode: string, untilMs: number) => Native.setOverride(mode, untilMs),
  clearOverride: () => Native.clearOverride(),
  clearHistory: () => Native.clearHistory(),
  sendTest: () => Native.sendTest(),
  requestScreeningRole: () => Native.requestScreeningRole(),
};

// End-of-today epoch ms — matches MainActivity.setOverride (force/pause until 23:59:59).
export function endOfToday(): number {
  const d = new Date();
  d.setHours(23, 59, 59, 0);
  return d.getTime();
}

export default api;
