/**
 * "Tone" = the meaning of a color, independent of light/dark mode.
 * Components take `tone="success"` instead of a raw color, and these helpers turn
 * it into actual colors from the active palette.
 */
import {
  CircleAlert,
  CircleCheck,
  Info,
  LucideIcon,
  TriangleAlert,
} from 'lucide-react-native';
import {Palette} from '../theme';

/** accent = brand/info, success = good, warning = attention, danger = failure, neutral = grey. */
export type Tone = 'accent' | 'success' | 'warning' | 'danger' | 'neutral';

/** Foreground (icon/text) and soft background color for a tone. */
export function toneColors(c: Palette, tone: Tone): {fg: string; bg: string} {
  switch (tone) {
    case 'success':
      return {fg: c.success, bg: c.successSoft};
    case 'warning':
      return {fg: c.warning, bg: c.warningSoft};
    case 'danger':
      return {fg: c.danger, bg: c.dangerSoft};
    case 'accent':
      return {fg: c.accent, bg: c.accentSoft};
    default:
      return {fg: c.muted, bg: c.surfaceAlt};
  }
}

/** Tone color for icons drawn on the inverted (dark-on-light / light-on-dark) toast. */
export function inverseToneColor(c: Palette, tone: Tone): string {
  switch (tone) {
    case 'success':
      return c.inverseSuccess;
    case 'warning':
      return c.inverseWarning;
    case 'danger':
      return c.inverseDanger;
    case 'accent':
      return c.inverseAccent;
    default:
      return c.faint;
  }
}

/** Icon that goes with each tone in banners and toasts. */
export const TONE_ICON: Record<Tone, LucideIcon> = {
  success: CircleCheck,
  danger: CircleAlert,
  warning: TriangleAlert,
  accent: Info,
  neutral: Info,
};

/**
 * Deep two-stop gradients for the status card. Same in light and dark mode.
 * Both stops keep white text at ≥4.5:1 contrast (WCAG AA).
 */
export const HERO_GRADIENT: Record<Tone, [string, string]> = {
  success: ['#15803D', '#0F766E'],
  warning: ['#B45309', '#92400E'],
  accent: ['#5B3FD0', '#3F2FB8'],
  danger: ['#BE123C', '#9F1239'],
  neutral: ['#4B5568', '#1F2633'],
};

/** Gradient behind the app logo. */
export const BRAND_GRADIENT: [string, string] = ['#7C5CFF', '#4A2FC4'];
