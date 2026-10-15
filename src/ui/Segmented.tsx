/**
 * Segmented control (a row of mutually exclusive options), e.g.
 * [Schedule | Always on | Pause]. Generic over the option value type `T`, so the
 * caller gets type-checked values back.
 */
import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {Palette, RADIUS, useStyles} from '../theme';
import {Tone, toneColors} from './tone';

export function Segmented<T extends string>(props: {
  /** Group name for screen readers. */
  label: string;
  options: {value: T; label: string; tone: Tone}[];
  value: T;
  onChange: (v: T) => void;
}) {
  const [s, c] = useStyles(styles);
  return (
    <View style={s.segmented} accessibilityRole="radiogroup" accessibilityLabel={props.label}>
      {props.options.map(o => {
        const active = o.value === props.value;
        const {fg, bg} = toneColors(c, o.tone);
        return (
          <Pressable
            key={o.value}
            onPress={() => props.onChange(o.value)}
            accessibilityRole="radio"
            accessibilityLabel={o.label}
            accessibilityState={{checked: active}}
            style={[s.segment, active && [s.segmentActive, {backgroundColor: bg}]]}>
            <Text style={[s.segmentText, active && [s.segmentTextActive, {color: fg}]]}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = (c: Palette) =>
  StyleSheet.create({
    segmented: {
      flexDirection: 'row',
      backgroundColor: c.surfaceAlt,
      borderRadius: RADIUS.md,
      padding: 4,
    },
    segment: {
      flex: 1,
      minHeight: 48,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: RADIUS.sm,
    },
    segmentActive: {
      shadowColor: c.shadow,
      shadowOpacity: 0.1,
      shadowRadius: 6,
      shadowOffset: {width: 0, height: 2},
      elevation: 1,
    },
    segmentText: {fontSize: 14, fontWeight: '600', color: c.muted},
    segmentTextActive: {fontWeight: '700'},
  });
