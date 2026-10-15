/**
 * Discord — channel webhook (Server Settings → Integrations → Webhooks).
 * Message format (colored embed): android/.../delivery/destinations/DiscordDestination.java.
 */
import {MessageCircle} from 'lucide-react-native';
import {simpleWebhookDestination} from './simple';

export const discord = simpleWebhookDestination({
  id: 'discord',
  label: 'Discord',
  color: '#5865F2',
  icon: MessageCircle,
  placeholder: 'https://discord.com/api/webhooks/...',
});
