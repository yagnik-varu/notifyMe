/**
 * Registry of every destination the app supports, in the order the picker shows them.
 *
 * ★ To add a destination: create its file, import it here, add it to the array,
 * and add the matching native class (docs/guides/add-a-destination.md).
 */
import {cliq} from './cliq/cliq';
import {discord} from './discord';
import {generic} from './generic';
import {slack} from './slack';
import {teams} from './teams';
import {DestinationDefinition} from './types';

export const DESTINATIONS: readonly DestinationDefinition[] = [
  slack,
  discord,
  teams,
  cliq,
  generic,
];

/**
 * Look up a destination by its saved id. Unknown ids fall back to the first
 * entry (Slack) for display — Slack is also what ConfigStore.getPlatform()
 * returns when nothing is saved yet.
 * (When SENDING, the native Destinations.forId() treats an unknown id as Generic,
 * which only matters if stored settings were corrupted.)
 */
export function getDestination(id: string): DestinationDefinition {
  return DESTINATIONS.find(d => d.id === id) ?? DESTINATIONS[0];
}

export type {
  DestinationDefinition,
  DestinationForm,
  ExtraFieldsProps,
  FieldIssue,
  FormField,
  FormIssues,
} from './types';
