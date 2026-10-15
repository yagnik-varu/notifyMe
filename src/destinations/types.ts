/**
 * What a "destination" (a chat app Notify-Me can post to) must describe on the
 * JS side. Each destination is one file in this folder; index.ts lists them.
 *
 * ★ EXTENSION POINT. Adding a platform = one file here + one class in
 * android/.../delivery/destinations/ (which builds the actual message).
 * Full walkthrough: docs/guides/add-a-destination.md.
 *
 * This file is only about the SETUP SCREEN (label, icon, form fields, hints).
 * The message that gets sent is built natively, because sending must work while
 * the app is closed and JS isn't running.
 */
import type {ComponentType} from 'react';
import type {LucideIcon} from 'lucide-react-native';

/** The draft values of the destination form (already trimmed). */
export interface DestinationForm {
  url: string;
  cliqToken: string;
  cliqUser: string;
}

/** A form field a destination can attach a message to. */
export type FormField = keyof DestinationForm;

/**
 * A message under one field. `error` blocks saving; `warning` is advice only.
 */
export interface FieldIssue {
  error?: string | null;
  warning?: string | null;
}

/** Messages per field, returned by a destination's `validate`. */
export type FormIssues = Partial<Record<FormField, FieldIssue>>;

/** Props given to a destination's extra form fields (see `ExtraFields`). */
export interface ExtraFieldsProps {
  /** Untrimmed draft values, as typed. */
  values: DestinationForm;
  /** Update one draft value. */
  onChange: (field: FormField, value: string) => void;
  /** Messages from this destination's `validate`. */
  issues: FormIssues;
}

export interface DestinationDefinition {
  /**
   * Stable id saved on the phone. ⚠ Must equal the native Destination.id() —
   * never rename one after release, or saved settings stop matching.
   */
  id: string;
  /** Name shown on the picker tile and in messages ("Slack"). */
  label: string;
  /** Brand color used to tint the picker icon. */
  color: string;
  /** Icon on the picker tile (from lucide-react-native). */
  icon: LucideIcon;
  /** Example URL shown in the empty URL field. */
  placeholder: string;
  /** Label above the URL field. */
  urlLabel: string;
  /** Helper text under the URL field. */
  urlHelper: string;
  /** Where to look after a successful test send. */
  testDeliveredHint: string;
  /** Optional extra inputs rendered below the URL field (e.g. Cliq's token). */
  ExtraFields?: ComponentType<ExtraFieldsProps>;
  /**
   * Optional destination-specific checks on top of the shared URL check.
   * Receives TRIMMED values.
   */
  validate?: (form: DestinationForm) => FormIssues;
}
