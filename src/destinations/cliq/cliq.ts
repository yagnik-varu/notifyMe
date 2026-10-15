/**
 * Zoho Cliq — posts to a Cliq BOT's Incoming Webhook, not a channel webhook.
 *
 * Needs more than a URL, so it is the example of a "rich" destination:
 *  - a webhook token (sent as ?zapikey=<token> — added natively in CliqDestination.java)
 *  - an optional recipient email (only that person's bot chat gets the alert)
 *  - a Deluge handler pasted into the bot (docs/zoho-cliq-incoming-handler.deluge)
 *    that turns Notify-Me's JSON into a Cliq card.
 *
 * Setup guide for users: docs/10-destinations.md#zoho-cliq.
 */
import {MessagesSquare} from 'lucide-react-native';
import {validateOptionalEmail, validateWebhookUrl} from '../../domain/validation';
import {DestinationDefinition, DestinationForm, FormIssues} from '../types';
import {CliqFields} from './CliqFields';

function validateCliq(form: DestinationForm): FormIssues {
  const hasUrl = form.url.length > 0;
  return {
    url: {
      // Advice only: company domains vary, but every bot endpoint contains /bots/.
      warning:
        hasUrl && !validateWebhookUrl(form.url) && !form.url.includes('/bots/')
          ? "This doesn't look like a Cliq bot endpoint (…/api/v2/bots/<bot>/incoming)."
          : null,
    },
    cliqToken: {
      // The token may also be pasted straight into the URL as ?zapikey=…
      warning:
        hasUrl && !form.cliqToken && !form.url.includes('zapikey=')
          ? 'Needed to post to your bot. Copy it from the bot page in Cliq.'
          : null,
    },
    cliqUser: {error: validateOptionalEmail(form.cliqUser)},
  };
}

export const cliq: DestinationDefinition = {
  id: 'cliq',
  label: 'Zoho Cliq',
  color: '#0EA5E9',
  icon: MessagesSquare,
  placeholder: 'https://cliq.zoho.com/api/v2/bots/<bot>/incoming',
  urlLabel: 'Bot endpoint URL',
  urlHelper: "Shown on your bot's page in Cliq. Company domains work too.",
  testDeliveredHint: 'Open your bot chat in Zoho Cliq — the test card should be there.',
  ExtraFields: CliqFields,
  validate: validateCliq,
};
