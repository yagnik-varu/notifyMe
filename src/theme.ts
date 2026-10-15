import {useMemo} from 'react';
import {useColorScheme} from 'react-native';

// Violet-indigo primary, green for "watching", amber for paused/override, red for failures.
// Each palette has the same keys so components never branch on the scheme themselves.
const light = {
  bg: '#F6F4FB',
  surface: '#FFFFFF',
  surfaceAlt: '#F2EFF9',
  border: '#E7E2F1',
  text: '#16131F',
  muted: '#6B6580',
  faint: '#736D86', // ≥4.5:1 on every light surface (WCAG AA)

  accent: '#5B3FD0',
  accentStrong: '#5B3FD0', // filled controls with white text
  accentPressed: '#4A31B3',
  accentSoft: '#EEE9FD',
  onAccent: '#FFFFFF',

  success: '#15803D',
  successSoft: '#DCFCE7',
  warning: '#B45309',
  warningSoft: '#FEF3C7',
  danger: '#B91C1C',
  dangerSoft: '#FEE2E2',

  // Tone colors for things drawn on the inverted (toast) background.
  inverseSuccess: '#4ADE80',
  inverseWarning: '#FBBF24',
  inverseDanger: '#F87171',
  inverseAccent: '#A99BFA',

  trackOff: '#D6D1E0',
  shadow: '#2A1F5C',
  statusBar: 'dark-content' as 'dark-content' | 'light-content',
};

export type Palette = typeof light;

const dark: Palette = {
  bg: '#0E0C14',
  surface: '#191622',
  surfaceAlt: '#221E2E',
  border: '#2D2939',
  text: '#F3F1F8',
  muted: '#A7A1BA',
  faint: '#8A849D',

  accent: '#8C7BF7',
  accentStrong: '#6A55E8', // lavender is too light for white text; this is 5.1:1
  accentPressed: '#5A45D8',
  accentSoft: '#272144',
  onAccent: '#FFFFFF',

  success: '#4ADE80',
  successSoft: '#12301E',
  warning: '#FBBF24',
  warningSoft: '#352A10',
  danger: '#F87171',
  dangerSoft: '#3A1818',

  inverseSuccess: '#15803D',
  inverseWarning: '#B45309',
  inverseDanger: '#B91C1C',
  inverseAccent: '#5B3FD0',

  trackOff: '#3A3548',
  shadow: '#000000',
  statusBar: 'light-content',
};

export const RADIUS = {sm: 10, md: 14, lg: 20, pill: 999};
export const SPACE = {xs: 4, sm: 8, md: 12, lg: 16, xl: 24};

export function useTheme(): Palette {
  return useColorScheme() === 'dark' ? dark : light;
}

/** Build a StyleSheet from the active palette, rebuilt only when the scheme flips. */
export function useStyles<T>(factory: (c: Palette) => T): [T, Palette] {
  const c = useTheme();
  const styles = useMemo(() => factory(c), [c, factory]);
  return [styles, c];
}
