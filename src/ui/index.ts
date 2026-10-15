/**
 * Reusable, app-agnostic building blocks. Nothing in src/ui knows about calls,
 * webhooks or the native module — it only draws what it's given. Screens in
 * src/screens combine these with app data.
 *
 * Import from here: `import {Button, Card} from '../ui'`.
 */
export {Banner} from './Banner';
export {Button} from './Button';
export {Card} from './Card';
export {DayChips} from './DayChips';
export {Field} from './Field';
export {GradientFill} from './GradientFill';
export {HistoryList} from './HistoryList';
export {IconBadge} from './IconBadge';
export {Pill} from './Pill';
export {PlatformPicker} from './PlatformPicker';
export type {PlatformOption} from './PlatformPicker';
export {SectionHeader} from './SectionHeader';
export {Segmented} from './Segmented';
export {SettingRow} from './SettingRow';
export {SetupChecklist} from './SetupChecklist';
export type {SetupStep} from './SetupChecklist';
export {StatusHero} from './StatusHero';
export type {HeroChip} from './StatusHero';
export {TimeTile} from './TimeTile';
export {useReduceMotion} from './hooks/useReduceMotion';
export {useToast} from './toast/useToast';
export type {ShowToast, ToastAction} from './toast/useToast';
export {BRAND_GRADIENT, HERO_GRADIENT, TONE_ICON, toneColors} from './tone';
export type {Tone} from './tone';
