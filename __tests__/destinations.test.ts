/** Destination registry (src/destinations). */
import {DESTINATIONS, getDestination} from '../src/destinations';

const form = (over: Partial<{url: string; cliqToken: string; cliqUser: string}> = {}) => ({
  url: '',
  cliqToken: '',
  cliqUser: '',
  ...over,
});

describe('registry', () => {
  it('matches the ids the Android side knows', () => {
    // Must equal the ids registered in
    // android/app/src/main/java/com/notifyme/delivery/destinations/Destinations.java.
    expect(DESTINATIONS.map(d => d.id)).toEqual(['slack', 'discord', 'teams', 'cliq', 'generic']);
  });

  it('falls back to Slack for unknown ids (like the native default)', () => {
    expect(getDestination('nope').id).toBe('slack');
    expect(getDestination('teams').label).toBe('Teams');
  });
});

describe('Zoho Cliq validation', () => {
  const cliq = getDestination('cliq');
  const validate = cliq.validate!;

  it('asks for a token unless it is already in the URL', () => {
    const url = 'https://cliq.zoho.com/api/v2/bots/notify/incoming';
    expect(validate(form({url})).cliqToken?.warning).toBeTruthy();
    expect(validate(form({url, cliqToken: 'abc'})).cliqToken?.warning).toBeNull();
    expect(validate(form({url: url + '?zapikey=abc'})).cliqToken?.warning).toBeNull();
  });

  it('warns when the URL is not a bot endpoint', () => {
    expect(validate(form({url: 'https://cliq.zoho.com/x'})).url?.warning).toBeTruthy();
  });

  it('rejects a malformed recipient email', () => {
    expect(validate(form({cliqUser: 'not-an-email'})).cliqUser?.error).toBeTruthy();
    expect(validate(form({cliqUser: 'me@company.com'})).cliqUser?.error).toBeNull();
  });

  it('simple destinations have no extra rules or fields', () => {
    const slack = getDestination('slack');
    expect(slack.validate).toBeUndefined();
    expect(slack.ExtraFields).toBeUndefined();
  });
});
