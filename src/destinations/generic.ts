/**
 * Generic — any service that accepts a JSON POST like {"text": "..."}.
 * Message format: android/.../delivery/destinations/GenericDestination.java.
 */
import {Webhook} from 'lucide-react-native';
import {simpleWebhookDestination} from './simple';

export const generic = simpleWebhookDestination({
  id: 'generic',
  label: 'Generic',
  color: '#64748B',
  icon: Webhook,
  placeholder: 'https://example.com/webhook',
});
