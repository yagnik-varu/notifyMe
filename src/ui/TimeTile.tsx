/** Large tappable time display ("FROM 09:00 — Tap to change"). Opening the picker is the caller's job. */
import React from 'react';
import {Pressable, StyleSheet, Text} from 'react-native';
import {Palette, RADIUS, useStyles} from '../theme';

export function TimeTile(props: {
  /** Small caption above the time, e.g. "FROM". */
  label: string;
  /** Name read by screen readers, e.g. "Start time". */
  a11yName: string;
  /** Formatted time, e.g. "09:00". */
  value: string;
  onPress: () => void;
}) {
  const [s, c] = useStyles(styles);
  return (
    <Pressable
      onPress={props.onPress}
      android_ripple={{color: c.accentSoft}}
      style={s.timeTile}
      accessibilityRole="button"
      accessibilityLabel={`${props.a11yName}, ${props.value}`}
      accessibilityHint="Opens a time picker">
      <Text style={s.timeLabel}>{props.label}</Text>
      <Text style={s.timeValue} maxFontSizeMultiplier={1.4}>
        {props.value}
      </Text>
      <Text style={s.timeHint}>Tap to change</Text>
    </Pressable>
  );
}

const styles = (c: Palette) =>
  StyleSheet.create({
    timeTile: {
      flex: 1,
      borderRadius: RADIUS.md,
      backgroundColor: c.surfaceAlt,
      paddingVertical: 14,
      paddingHorizontal: 16,
      overflow: 'hidden',
    },
    timeLabel: {fontSize: 11, fontWeight: '800', color: c.muted, letterSpacing: 1},
    timeValue: {
      fontSize: 30,
      fontWeight: '800',
      color: c.text,
      marginTop: 2,
      letterSpacing: -0.5,
      fontVariant: ['tabular-nums'],
    },
    timeHint: {fontSize: 12, color: c.faint, marginTop: 2},
  });
