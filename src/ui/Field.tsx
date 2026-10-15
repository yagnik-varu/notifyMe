/**
 * Labeled text input with one message line underneath.
 *
 * Message priority: `error` (red, blocks saving) > `warning` (amber, advice) >
 * `helper` (grey hint). Only one is shown at a time.
 * `secret` hides the value and adds a show/hide eye button (used for tokens).
 */
import React, {useState} from 'react';
import {KeyboardTypeOptions, Pressable, StyleSheet, Text, TextInput, View} from 'react-native';
import {CircleAlert, Eye, EyeOff} from 'lucide-react-native';
import {Palette, RADIUS, SPACE, useStyles} from '../theme';

export function Field(props: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  helper?: string;
  error?: string | null;
  warning?: string | null;
  secret?: boolean;
  multiline?: boolean;
  keyboardType?: KeyboardTypeOptions;
}) {
  const [s, c] = useStyles(styles);
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const message = props.error ?? props.warning ?? props.helper;
  const messageColor = props.error ? c.danger : props.warning ? c.warning : c.muted;
  const borderColor = props.error
    ? c.danger
    : focused
    ? c.accent
    : props.warning
    ? c.warning
    : c.border;
  const RevealIcon = revealed ? EyeOff : Eye;
  return (
    <View style={s.field}>
      {/* The TextInput carries the label for screen readers, so this visual one is skipped. */}
      <Text style={s.fieldLabel} importantForAccessibility="no">
        {props.label}
      </Text>
      <View style={[s.inputWrap, {borderColor}, focused && s.inputFocused]}>
        <TextInput
          style={[s.input, props.multiline && s.inputMultiline]}
          value={props.value}
          onChangeText={props.onChangeText}
          placeholder={props.placeholder}
          placeholderTextColor={c.faint}
          // URLs, tokens and emails must not be auto-capitalized or "corrected".
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete={props.keyboardType === 'email-address' ? 'email' : 'off'}
          keyboardType={props.keyboardType}
          multiline={props.multiline}
          secureTextEntry={props.secret && !revealed}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          accessibilityLabel={props.label}
          accessibilityHint={message ?? undefined}
        />
        {props.secret && props.value.length > 0 && (
          <Pressable
            onPress={() => setRevealed(r => !r)}
            hitSlop={8}
            style={s.reveal}
            accessibilityRole="button"
            accessibilityLabel={revealed ? 'Hide token' : 'Show token'}>
            <RevealIcon color={c.muted} size={20} strokeWidth={2} />
          </Pressable>
        )}
      </View>
      {message ? (
        <View
          style={s.fieldMessageRow}
          // Screen readers announce new errors immediately, warnings when idle.
          accessibilityLiveRegion={props.error ? 'assertive' : props.warning ? 'polite' : 'none'}>
          {(props.error || props.warning) && (
            <CircleAlert
              color={messageColor}
              size={14}
              strokeWidth={2.4}
              style={s.fieldMessageIcon}
            />
          )}
          <Text style={[s.fieldMessage, {color: messageColor}]}>{message}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = (c: Palette) =>
  StyleSheet.create({
    field: {marginBottom: SPACE.lg},
    fieldLabel: {fontSize: 14, fontWeight: '600', color: c.text, marginBottom: SPACE.sm},
    inputWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1.5,
      borderRadius: RADIUS.md,
      backgroundColor: c.surfaceAlt,
    },
    inputFocused: {backgroundColor: c.surface},
    input: {
      flex: 1,
      fontSize: 15,
      color: c.text,
      paddingHorizontal: 14,
      paddingVertical: 12,
      minHeight: 52,
    },
    // Android centers multiline text vertically by default; long URLs read better from the top.
    inputMultiline: {minHeight: 68, textAlignVertical: 'top'},
    reveal: {paddingHorizontal: 14, paddingVertical: 14},
    fieldMessageRow: {flexDirection: 'row', alignItems: 'flex-start', marginTop: 7},
    fieldMessageIcon: {marginTop: 2, marginRight: 6},
    fieldMessage: {fontSize: 13, lineHeight: 18, flex: 1},
  });
