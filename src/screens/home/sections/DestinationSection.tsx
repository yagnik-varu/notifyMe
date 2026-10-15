/**
 * "Destination" card: choose the chat app, paste its webhook URL (plus any
 * destination-specific fields), Save, and Send test.
 *
 * The field labels/hints and extra inputs come from the selected destination's
 * definition (src/destinations), so this file has no per-platform `if`s.
 */
import React from 'react';
import {LayoutChangeEvent, StyleSheet, View} from 'react-native';
import {Send} from 'lucide-react-native';
import {DESTINATIONS, DestinationDefinition} from '../../../destinations';
import {DestinationFormState} from '../../../hooks/useDestinationForm';
import {TestState} from '../../../hooks/useTestSend';
import {Palette, SPACE, useStyles} from '../../../theme';
import {Banner, Button, Card, Field, PlatformPicker, SectionHeader} from '../../../ui';

export function DestinationSection(props: {
  destination: DestinationDefinition;
  form: DestinationFormState;
  /** A destination URL is saved (not just typed). */
  hasSaved: boolean;
  test: TestState;
  onPlatform: (id: string) => void;
  onSave: () => void;
  onTest: () => void;
  /** Reports this section's position so other parts can scroll to it. */
  onLayout: (e: LayoutChangeEvent) => void;
}) {
  const [s] = useStyles(styles);
  const {destination: d, form} = props;
  const Extra = d.ExtraFields;
  return (
    <View onLayout={props.onLayout}>
      <SectionHeader title="Destination" />
      <Card>
        <PlatformPicker options={DESTINATIONS} value={d.id} onChange={props.onPlatform} />
        <Field
          label={d.urlLabel}
          value={form.values.url}
          onChangeText={v => form.setField('url', v)}
          placeholder={d.placeholder}
          keyboardType="url"
          multiline
          error={form.issues.url?.error}
          warning={form.issues.url?.warning}
          helper={d.urlHelper}
        />
        {Extra && <Extra values={form.values} onChange={form.setField} issues={form.issues} />}
        <View style={s.buttonRow}>
          <Button
            title={form.dirty ? 'Save changes' : props.hasSaved ? '✓ Saved' : 'Save'}
            onPress={props.onSave}
            disabled={!form.dirty || !form.isValid}
            style={s.flex}
          />
          <Button
            title="Send test"
            icon={Send}
            variant="secondary"
            onPress={props.onTest}
            loading={props.test.phase === 'sending'}
            disabled={!form.trimmed.url}
            style={s.flex}
          />
        </View>
        <TestBanner test={props.test} destination={d} />
      </Card>
    </View>
  );
}

/** The result box under the buttons, one look per test phase. */
function TestBanner({test, destination}: {test: TestState; destination: DestinationDefinition}) {
  switch (test.phase) {
    case 'sending':
      return (
        <Banner tone="accent" loading title="Sending test message…" message={`To ${destination.label}`} />
      );
    case 'ok':
      return <Banner tone="success" title="Test delivered" message={destination.testDeliveredHint} />;
    case 'fail':
      return <Banner tone="danger" title="Test didn't go through" message={test.detail} />;
    case 'slow':
      return (
        <Banner
          tone="warning"
          title="Still trying"
          message="No answer yet. Notify-Me keeps retrying in the background — check Activity below."
        />
      );
    default:
      return null;
  }
}

const styles = (_c: Palette) =>
  StyleSheet.create({
    flex: {flex: 1},
    buttonRow: {flexDirection: 'row', gap: SPACE.md},
  });
