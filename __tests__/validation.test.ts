/** Shared form rules (src/domain/validation.ts). */
import {validateOptionalEmail, validateWebhookUrl} from '../src/domain/validation';

describe('validateWebhookUrl', () => {
  it('accepts empty (= remove destination) and https links', () => {
    expect(validateWebhookUrl('')).toBeNull();
    expect(validateWebhookUrl('https://hooks.slack.com/services/T/B/x')).toBeNull();
  });

  it('explains why other values are rejected', () => {
    expect(validateWebhookUrl('http://example.com')).toBe(
      'Use a secure link that starts with https://',
    );
    expect(validateWebhookUrl('hooks.slack.com/x')).toBe(
      'Enter the full link, starting with https://',
    );
    expect(validateWebhookUrl('https://has space.com')).not.toBeNull();
  });
});

describe('validateOptionalEmail', () => {
  it('allows empty or email-shaped values', () => {
    expect(validateOptionalEmail('')).toBeNull();
    expect(validateOptionalEmail('me@company.com')).toBeNull();
    expect(validateOptionalEmail('me@company')).not.toBeNull();
  });
});
