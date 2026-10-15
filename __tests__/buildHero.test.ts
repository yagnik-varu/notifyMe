/** Status-card rules (src/screens/home/buildHero.ts). */
import {getDestination} from '../src/destinations';
import {Config, Status} from '../src/native/types';
import {buildHero} from '../src/screens/home/buildHero';

const cfg: Config = {
  url: 'https://hooks.slack.com/services/x',
  platform: 'slack',
  cliqUser: '',
  cliqToken: '',
  masterEnabled: true,
  startMin: 540,
  endMin: 1080,
  daysMask: 62,
  overrideMode: 'NONE',
  overrideUntil: 0,
};
const off: Status = {state: 'off', overrideActive: false, forced: false, overrideMode: 'NONE'};
const slack = getDestination('slack');

it('asks for setup when there is no destination', () => {
  expect(buildHero({...cfg, url: ''}, off, slack).title).toBe("Let's get you set up");
});

it('pause beats everything else', () => {
  const paused: Status = {...off, state: 'paused', overrideActive: true};
  expect(buildHero(cfg, paused, slack).title).toBe('Paused for today');
});

it('watching when a call would be posted now', () => {
  const hero = buildHero(cfg, {...off, state: 'active'}, slack);
  expect(hero.title).toBe('Watching for calls');
  expect(hero.live).toBe(true);
  expect(hero.caption).toContain('Slack');
});

it('forced on says so', () => {
  const forced: Status = {...off, state: 'active', overrideActive: true, forced: true};
  expect(buildHero(cfg, forced, slack).title).toBe('On for the rest of today');
});

it('outside hours vs switched off', () => {
  expect(buildHero(cfg, off, slack).title).toBe('Outside office hours');
  expect(buildHero({...cfg, masterEnabled: false}, off, slack).title).toBe('Alerts are off');
});
