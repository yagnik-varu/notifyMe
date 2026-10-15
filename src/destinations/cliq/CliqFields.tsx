/**
 * The extra inputs shown under the URL when Zoho Cliq is the destination:
 * webhook token, optional recipient email, and a reminder about the bot handler.
 *
 * Rendered by DestinationSection through `cliq.ExtraFields`.
 */
import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {Palette, SPACE, useStyles} from '../../theme';
import {Field} from '../../ui';
import {ExtraFieldsProps} from '../types';

export function CliqFields({values, onChange, issues}: ExtraFieldsProps) {
  const [s] = useStyles(styles);
  return (
    <>
      <Field
        label="Webhook token"
        value={values.cliqToken}
        onChangeText={v => onChange('cliqToken', v)}
        placeholder="Paste the token from your bot"
        secret
        warning={issues.cliqToken?.warning}
        helper="Kept on this phone and sent only to Cliq."
      />
      <Field
        label="Your Cliq email (optional)"
        value={values.cliqUser}
        onChangeText={v => onChange('cliqUser', v)}
        placeholder="you@company.com"
        keyboardType="email-address"
        error={issues.cliqUser?.error}
        helper="Alerts go only to this person's chat with the bot."
      />
      <View style={s.note}>
        <Text style={s.noteText}>
          Your bot needs the Notify-Me incoming webhook handler. It's in the
          project's docs folder, ready to paste.
        </Text>
      </View>
    </>
  );
}

const styles = (c: Palette) =>
  StyleSheet.create({
    note: {
      backgroundColor: c.accentSoft,
      borderRadius: 12,
      padding: SPACE.md,
      marginBottom: SPACE.lg,
    },
    noteText: {fontSize: 13, color: c.text, lineHeight: 19},
  });
