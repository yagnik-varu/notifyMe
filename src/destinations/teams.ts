/**
 * Microsoft Teams — Incoming Webhook connector.
 * Message format: android/.../delivery/destinations/TeamsDestination.java.
 */
import {Users} from 'lucide-react-native';
import {simpleWebhookDestination} from './simple';

export const teams = simpleWebhookDestination({
  id: 'teams',
  label: 'Teams',
  color: '#6264A7',
  icon: Users,
  placeholder: 'https://<tenant>.webhook.office.com/...',
});
