/**
 * Decides what the status card at the top says. Pure function: same inputs →
 * same output, no React, so the rules are easy to read in one place.
 *
 * Priority (first match wins):
 *  1. no destination       → "Let's get you set up"
 *  2. PAUSE override       → "Paused for today"
 *  3. would post right now → "Watching for calls" (or "On for the rest of today" if forced)
 *  4. switched on          → "Outside office hours" + when alerts resume
 *  5. otherwise            → "Alerts are off"
 *
 * The "right now" verdict (status.state) comes from the native side
 * (schedule/EventGate.java) so it matches exactly what a ringing call would do.
 */
import {
  BellOff,
  CalendarClock,
  Clock,
  Moon,
  Pause,
  PhoneCall,
  Plug,
  Send,
} from 'lucide-react-native';
import type {LucideIcon} from 'lucide-react-native';
import {DestinationDefinition} from '../../destinations';
import {daysSummary, fmtMin, nextWindowStart} from '../../domain/schedule';
import {Config, Status} from '../../native';
import type {HeroChip, Tone} from '../../ui';

export interface Hero {
  tone: Tone;
  icon: LucideIcon;
  title: string;
  caption: string;
  /** Show the pulsing "live" ring. */
  live: boolean;
  chips: HeroChip[];
}

export function buildHero(cfg: Config, status: Status, destination: DestinationDefinition): Hero {
  const hasDestination = cfg.url.length > 0;
  const name = destination.label;
  const chips: HeroChip[] = hasDestination
    ? [
        {icon: Send, text: name},
        {icon: Clock, text: `${fmtMin(cfg.startMin)}–${fmtMin(cfg.endMin)}`},
        {icon: CalendarClock, text: daysSummary(cfg.daysMask)},
      ]
    : [];

  if (!hasDestination) {
    return {
      tone: 'neutral',
      icon: Plug,
      title: "Let's get you set up",
      caption: 'Choose where call alerts should be posted.',
      live: false,
      chips,
    };
  }
  if (status.state === 'paused') {
    return {
      tone: 'warning',
      icon: Pause,
      title: 'Paused for today',
      caption: "Calls won't be posted until midnight.",
      live: false,
      chips,
    };
  }
  if (status.state === 'active') {
    return {
      tone: 'success',
      icon: PhoneCall,
      title: status.forced ? 'On for the rest of today' : 'Watching for calls',
      caption: status.forced
        ? `Every call goes to ${name}, office hours ignored.`
        : `Incoming and missed calls go to ${name}.`,
      live: true,
      chips,
    };
  }
  if (cfg.masterEnabled) {
    const next = nextWindowStart(cfg.startMin, cfg.endMin, cfg.daysMask);
    return {
      tone: 'accent',
      icon: Moon,
      title: 'Outside office hours',
      caption: next ? `Alerts resume ${next}.` : 'Pick office days below to start alerting.',
      live: false,
      chips,
    };
  }
  return {
    tone: 'neutral',
    icon: BellOff,
    title: 'Alerts are off',
    caption: `Turn on to post your calls to ${name}.`,
    live: false,
    chips,
  };
}
