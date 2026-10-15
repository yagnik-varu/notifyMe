/**
 * Spacing and corner-radius scales shared by every screen and component.
 *
 * WHY a fixed scale: using SPACE.lg everywhere instead of random numbers (15, 17…)
 * keeps the layout visually consistent and makes global tweaks a one-line change.
 * Values are in density-independent pixels (dp), React Native's unit.
 */

export const RADIUS = {sm: 10, md: 14, lg: 20, pill: 999};
export const SPACE = {xs: 4, sm: 8, md: 12, lg: 16, xl: 24};
