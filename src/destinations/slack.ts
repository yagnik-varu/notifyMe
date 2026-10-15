/**
 * Slack — Incoming Webhook (https://api.slack.com/messaging/webhooks).
 * Message format: android/.../delivery/destinations/SlackDestination.java.
 */
import {Hash} from 'lucide-react-native';
import {simpleWebhookDestination} from './simple';

export const slack = simpleWebhookDestination({
  id: 'slack',
  label: 'Slack',
  color: '#E01E5A',
  icon: Hash,
  placeholder: 'https://hooks.slack.com/services/...',
});
