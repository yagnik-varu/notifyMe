/* eslint-env jest */
/**
 * Runs before every test file. Jest runs in Node, not on a phone, so anything
 * that needs real native code has to be replaced with a fake ("mock") here.
 */
import {NativeModules} from 'react-native';

// Library-provided mock: pretends the screen has zero safe-area insets.
jest.mock('react-native-safe-area-context', () =>
  require('react-native-safe-area-context/jest/mock').default,
);

// The time picker opens a native Android dialog; tests never need it.
jest.mock('@react-native-community/datetimepicker', () => ({
  DateTimePickerAndroid: {open: jest.fn(), dismiss: jest.fn()},
}));

// Fake of our own native module (android/.../bridge/NotifyMeModule.kt).
// Values mirror a fresh install: no destination, 09:00–18:00, Mon–Fri.
NativeModules.NotifyMe = {
  getConfig: jest.fn(async () => ({
    url: '',
    platform: 'slack',
    cliqUser: '',
    cliqToken: '',
    masterEnabled: false,
    startMin: 540,
    endMin: 1080,
    daysMask: 62,
    overrideMode: 'NONE',
    overrideUntil: 0,
  })),
  getStatus: jest.fn(async () => ({
    state: 'off',
    overrideActive: false,
    forced: false,
    overrideMode: 'NONE',
  })),
  getHistory: jest.fn(async () => '[]'),
  getScreening: jest.fn(async () => ({supported: true, held: false})),
  getBatteryStatus: jest.fn(async () => ({exempt: false})),
  requestBatteryExemption: jest.fn(),
  setWebhookUrl: jest.fn(),
  setPlatform: jest.fn(),
  setCliqUser: jest.fn(),
  setCliqToken: jest.fn(),
  setMasterEnabled: jest.fn(),
  setSchedule: jest.fn(),
  setDaysMask: jest.fn(),
  setOverride: jest.fn(),
  clearOverride: jest.fn(),
  clearHistory: jest.fn(),
  restoreHistory: jest.fn(),
  haptic: jest.fn(),
  sendTest: jest.fn(),
  requestScreeningRole: jest.fn(async () => 'granted'),
};
