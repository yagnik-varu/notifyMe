/**
 * Shared builder for destinations that are just "paste a webhook URL" — no extra
 * fields, no special validation. Slack, Discord, Teams and Generic all use it.
 */
import type {LucideIcon} from 'lucide-react-native';
import {DestinationDefinition} from './types';

export function simpleWebhookDestination(opts: {
  id: string;
  label: string;
  color: string;
  icon: LucideIcon;
  placeholder: string;
}): DestinationDefinition {
  return {
    ...opts,
    urlLabel: 'Webhook URL',
    urlHelper: `Paste the incoming webhook link from ${opts.label}.`,
    testDeliveredHint: `Check ${opts.label} — the test message should be there.`,
  };
}
