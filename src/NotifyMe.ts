import {NativeModules} from 'react-native';

// Platform + override constants — must match ConfigStore.java exactly.
// color tints the destination tile; placeholder is the example URL shown when empty.
export const PLATFORMS = [
  {
    value: 'slack',
    label: 'Slack',
    color: '#E01E5A',
    placeholder: 'https://hooks.slack.com/services/...',
  },
  {
    value: 'discord',
    label: 'Discord',
    color: '#5865F2',
    placeholder: 'https://discord.com/api/webhooks/...',
  },
  {
    value: 'teams',
    label: 'Teams',
    color: '#6264A7',
    placeholder: 'https://<tenant>.webhook.office.com/...',
  },
  {
    value: 'cliq',
    label: 'Zoho Cliq',
    color: '#0EA5E9',
    placeholder: 'https://cliq.zoho.com/api/v2/bots/<bot>/incoming',
  },
  {
    value: 'generic',
    label: 'Generic',
    color: '#64748B',
    placeholder: 'https://example.com/webhook',
  },
] as const;

export type PlatformInfo = (typeof PLATFORMS)[number];

export function platformInfo(value: string): PlatformInfo {
  return PLATFORMS.find(p => p.value === value) ?? PLATFORMS[0];
}

export const OVERRIDE = {
  NONE: 'NONE',
  FORCE_ON: 'FORCE_ON',
  PAUSE: 'PAUSE',
} as const;

export interface Config {
  url: string;
  platform: string;
  cliqUser: string;
  cliqToken: string;
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
  kind?: 'incoming' | 'missed' | 'test'; // absent on entries saved before this field existed
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
  setCliqUser(user: string): void;
  setCliqToken(token: string): void;
  setMasterEnabled(enabled: boolean): void;
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
  setCliqUser: (u: string) => Native.setCliqUser(u),
  setCliqToken: (t: string) => Native.setCliqToken(t),
  setMasterEnabled: (e: boolean) => Native.setMasterEnabled(e),
  setSchedule: (s: number, e: number) => Native.setSchedule(s, e),
  setDaysMask: (m: number) => Native.setDaysMask(m),
  setOverride: (mode: string, untilMs: number) => Native.setOverride(mode, untilMs),
  clearOverride: () => Native.clearOverride(),
  clearHistory: () => Native.clearHistory(),
  restoreHistory: (entries: HistoryEntry[]) => Native.restoreHistory(JSON.stringify(entries)),
  /** System touch feedback: 'confirm' | 'reject' | 'tick'. No-op if unavailable. */
  haptic: (kind: 'confirm' | 'reject' | 'tick') => Native.haptic?.(kind),
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
