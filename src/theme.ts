// Theme palette — ported 1:1 from the native app's res/values/colors.xml.
// Violet-indigo primary, signal-green for "active", amber for paused/override.
export const COLORS = {
  bg: '#F5F3F9',
  card: '#FFFFFF',
  border: '#E7E2F0',
  text: '#1C1A24',
  muted: '#6E6880',

  accent: '#5B3FB0',
  accentDark: '#43308A',
  accentTint: '#ECE7F8',

  on: '#15803D',
  onTint: '#DCFCE7',

  amber: '#B45309',
  amberTint: '#FDF1D6',

  off: '#9A93A8',
  danger: '#DC2626',
  white: '#FFFFFF',
  chipOff: '#EFEBF6',
} as const;
