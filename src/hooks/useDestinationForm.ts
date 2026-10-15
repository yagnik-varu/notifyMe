/**
 * Draft state + validation for the Destination card (URL and, for Cliq, token
 * and email).
 *
 * WHY drafts: what the user types is kept locally and only sent to the phone's
 * storage on "Save" (or right before "Send test"). `dirty` tells whether the
 * drafts differ from what's saved.
 *
 * Validation = the shared URL rule (domain/validation.ts) + the selected
 * destination's own `validate()` (src/destinations/*). Any `error` blocks saving;
 * `warning`s are advice only.
 */
import {useCallback, useState} from 'react';
import {DestinationDefinition, DestinationForm, FormField, FormIssues} from '../destinations';
import {validateWebhookUrl} from '../domain/validation';
import {Config, NotifyMe} from '../native';

const EMPTY: DestinationForm = {url: '', cliqToken: '', cliqUser: ''};

export function useDestinationForm(saved: Config | null, destination: DestinationDefinition) {
  const [values, setValues] = useState<DestinationForm>(EMPTY);

  /** Replace all drafts with the saved values (after a full reload). */
  const reset = useCallback((conf: Config) => {
    setValues({url: conf.url, cliqToken: conf.cliqToken, cliqUser: conf.cliqUser});
  }, []);

  /** Update one draft as the user types. */
  const setField = useCallback((field: FormField, value: string) => {
    // Functional update: based on the latest state even if several updates are queued.
    setValues(prev => ({...prev, [field]: value}));
  }, []);

  // Everything below is recomputed on each render — cheap, and always in sync.
  const trimmed: DestinationForm = {
    url: values.url.trim(),
    cliqToken: values.cliqToken.trim(),
    cliqUser: values.cliqUser.trim(),
  };

  const own = destination.validate?.(trimmed) ?? {};
  const issues: FormIssues = {
    ...own,
    url: {error: validateWebhookUrl(trimmed.url), warning: own.url?.warning},
  };
  const isValid = !Object.values(issues).some(issue => issue?.error);

  const dirty =
    !!saved &&
    (trimmed.url !== saved.url ||
      trimmed.cliqUser !== saved.cliqUser ||
      trimmed.cliqToken !== saved.cliqToken);

  /** Write the drafts to the phone's storage. Fire-and-forget; call reread() after. */
  const persist = () => {
    NotifyMe.setWebhookUrl(trimmed.url);
    NotifyMe.setCliqUser(trimmed.cliqUser);
    NotifyMe.setCliqToken(trimmed.cliqToken);
  };

  return {values, trimmed, setField, reset, issues, isValid, dirty, persist};
}

export type DestinationFormState = ReturnType<typeof useDestinationForm>;
