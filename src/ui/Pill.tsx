/** Small rounded status label with a colored dot, e.g. "● Sent", "● On". */
import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {RADIUS, useTheme} from '../theme';
import {Tone, toneColors} from './tone';

export function Pill({text, tone, a11yLabel}: {text: string; tone: Tone; a11yLabel?: string}) {
  const c = useTheme();
  const {fg, bg} = toneColors(c, tone);
  return (
    <View
      style={[s.pill, {backgroundColor: bg}]}
      accessible
      accessibilityLabel={a11yLabel ?? text}>
      <View style={[s.pillDot, {backgroundColor: fg}]} />
      {/* maxFontSizeMultiplier: grows with the user's font size, but not enough to break the row. */}
      <Text style={[s.pillText, {color: fg}]} maxFontSizeMultiplier={1.6}>
        {text}
      </Text>
    </View>
  );
}

// Static styles: nothing here depends on the light/dark palette.
const s = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.pill,
  },
  pillDot: {width: 6, height: 6, borderRadius: 3},
  pillText: {fontSize: 12, fontWeight: '700'},
});
