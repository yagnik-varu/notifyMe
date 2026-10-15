/**
 * Seven round toggles S M T W T F S for choosing office days.
 * Reads/writes the days bitmask (bit 0 = Sunday) — see src/domain/schedule.ts.
 */
import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {DAY_LABELS, DAY_NAMES, isDayOn} from '../domain/schedule';
import {Palette, RADIUS, useStyles} from '../theme';

export function DayChips(props: {
  /** Days bitmask. */
  mask: number;
  /** Called with the day index (0 = Sunday) that was tapped. */
  onToggle: (day: number) => void;
}) {
  const [s, c] = useStyles(styles);
  return (
    <View style={s.daysRow} accessibilityLabel="Office days">
      {DAY_LABELS.map((label, i) => {
        const on = isDayOn(props.mask, i);
        return (
          // Full-width cell keeps a 48dp touch target; the circle is drawn inside it.
          <Pressable
            key={i}
            onPress={() => props.onToggle(i)}
            style={s.dayCell}
            accessibilityRole="checkbox"
            accessibilityLabel={DAY_NAMES[i]}
            accessibilityState={{checked: on}}>
            <View
              style={[
                s.dayChip,
                on && {backgroundColor: c.accentStrong, borderColor: c.accentStrong},
              ]}>
              <Text
                style={[s.dayChipText, on && {color: c.onAccent}]}
                maxFontSizeMultiplier={1.3}>
                {label}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = (c: Palette) =>
  StyleSheet.create({
    daysRow: {flexDirection: 'row', marginHorizontal: -2},
    dayCell: {flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center'},
    dayChip: {
      width: '88%',
      maxWidth: 44,
      aspectRatio: 1, // keeps it a circle whatever the width
      borderRadius: RADIUS.pill,
      borderWidth: 1.5,
      borderColor: c.border,
      backgroundColor: c.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dayChipText: {fontSize: 14, color: c.muted, fontWeight: '700'},
  });
