/**
 * Form validation rules shared by all destinations. Destination-specific rules
 * (e.g. Zoho Cliq's token check) live in that destination's `validate()` in
 * src/destinations/.
 *
 * Every function returns a message to show under the field, or null when fine.
 * Inputs are expected to be trimmed already.
 */

/**
 * Webhook URL must be a full https:// link. An empty value is allowed (it means
 * "remove the destination").
 *
 * WHY https only: Android blocks plain http:// traffic in release builds
 * ("cleartext"), so an http link would save fine but every alert would fail.
 */
export function validateWebhookUrl(url: string): string | null {
  if (url.length === 0 || /^https:\/\/\S+$/i.test(url)) return null;
  return url.toLowerCase().startsWith('http://')
    ? 'Use a secure link that starts with https://'
    : 'Enter the full link, starting with https://';
}

/** Loose email shape check (something@something.something). Empty is allowed. */
export function validateOptionalEmail(email: string): string | null {
  if (email.length === 0 || /^\S+@\S+\.\S+$/.test(email)) return null;
  return 'Enter a valid email, or leave it empty.';
}
