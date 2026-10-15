/** Small uppercase heading above a card, with an optional text button on the right. */
import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {Palette, SPACE, useStyles} from '../theme';
import {Tone, toneColors} from './tone';

export function SectionHeader(props: {
  title: string;
  /** Optional right-hand action, e.g. "Clear" on Activity. */
  action?: {label: string; onPress: () => void; tone?: Tone; a11yLabel?: string};
}) {
  const [s, c] = useStyles(styles);
  return (
    <View style={s.sectionHeader}>
      <Text style={s.sectionTitle} accessibilityRole="header">
        {props.title}
      </Text>
      {props.action && (
        <Pressable
          onPress={props.action.onPress}
          style={s.sectionActionHit}
          accessibilityRole="button"
          accessibilityLabel={props.action.a11yLabel ?? props.action.label}>
          <Text
            style={[
              s.sectionAction,
              {color: toneColors(c, props.action.tone ?? 'accent').fg},
            ]}>
            {props.action.label}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = (c: Palette) =>
  StyleSheet.create({
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      minHeight: 48,
      marginTop: SPACE.xs,
      marginBottom: SPACE.xs,
      paddingLeft: SPACE.xs,
    },
    sectionTitle: {
      fontSize: 12,
      fontWeight: '800',
      color: c.muted,
      letterSpacing: 1.2,
      textTransform: 'uppercase',
    },
    // 48×48 minimum touch target (Android accessibility guideline).
    sectionActionHit: {
      minHeight: 48,
      minWidth: 48,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: SPACE.sm,
      marginRight: -SPACE.sm,
    },
    sectionAction: {fontSize: 14, fontWeight: '700'},
  });
