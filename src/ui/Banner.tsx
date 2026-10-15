/** Inline result message inside a card (e.g. the "Test delivered" box under Send test). */
import React from 'react';
import {ActivityIndicator, StyleSheet, Text, View} from 'react-native';
import {Palette, RADIUS, SPACE, useStyles} from '../theme';
import {TONE_ICON, Tone, toneColors} from './tone';

export function Banner(props: {
  tone: Tone;
  title: string;
  message?: string;
  /** Shows a spinner instead of the tone icon. */
  loading?: boolean;
}) {
  const [s, c] = useStyles(styles);
  const {fg, bg} = toneColors(c, props.tone);
  const Icon = TONE_ICON[props.tone];
  return (
    <View
      // fg + '40' = the tone color at 25% opacity for a subtle border.
      style={[s.banner, {backgroundColor: bg, borderColor: fg + '40'}]}
      accessible
      accessibilityRole={props.tone === 'danger' ? 'alert' : undefined}
      accessibilityLiveRegion="polite"
      accessibilityLabel={props.message ? `${props.title}. ${props.message}` : props.title}>
      {props.loading ? (
        <ActivityIndicator size="small" color={fg} />
      ) : (
        <Icon color={fg} size={20} strokeWidth={2.2} />
      )}
      <View style={s.flex}>
        <Text style={[s.bannerTitle, {color: fg}]}>{props.title}</Text>
        {props.message ? <Text style={[s.bannerText, {color: c.text}]}>{props.message}</Text> : null}
      </View>
    </View>
  );
}

const styles = (_c: Palette) =>
  StyleSheet.create({
    flex: {flex: 1},
    banner: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      borderRadius: RADIUS.md,
      borderWidth: 1,
      padding: 14,
      marginTop: SPACE.lg,
    },
    bannerTitle: {fontSize: 14, fontWeight: '700'},
    bannerText: {fontSize: 13, marginTop: 3, lineHeight: 18},
  });
