/**
 * Grid of tiles for choosing the destination (Slack, Discord, …). Behaves like a
 * radio group: exactly one tile is selected.
 *
 * The list of options is passed in (from src/destinations), so this component
 * doesn't need to change when a destination is added.
 */
import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {Check, LucideIcon} from 'lucide-react-native';
import {Palette, RADIUS, SPACE, useStyles} from '../theme';
import {IconBadge} from './IconBadge';

export interface PlatformOption {
  id: string;
  label: string;
  color: string;
  icon: LucideIcon;
}

export function PlatformPicker(props: {
  options: readonly PlatformOption[];
  /** Id of the selected option. */
  value: string;
  onChange: (id: string) => void;
}) {
  const [s, c] = useStyles(styles);
  return (
    <View style={s.tiles} accessibilityRole="radiogroup" accessibilityLabel="Destination">
      {props.options.map(p => {
        const active = p.id === props.value;
        return (
          <Pressable
            key={p.id}
            onPress={() => props.onChange(p.id)}
            android_ripple={{color: c.accentSoft}}
            accessibilityRole="radio"
            accessibilityLabel={p.label}
            accessibilityState={{checked: active}}
            style={[s.tile, active && {borderColor: c.accent, backgroundColor: c.accentSoft}]}>
            <IconBadge icon={p.icon} color={p.color} size={38} />
            <Text
              style={[s.tileLabel, active && [s.tileLabelActive, {color: c.text}]]}
              numberOfLines={2}>
              {p.label}
            </Text>
            {active && (
              <View
                style={[s.tileCheck, {backgroundColor: c.accentStrong}]}
                importantForAccessibility="no-hide-descendants">
                <Check color="#FFFFFF" size={11} strokeWidth={3.4} />
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = (c: Palette) =>
  StyleSheet.create({
    tiles: {flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: SPACE.lg + 2},
    // ~3 per row; flexGrow lets a short last row stretch to fill the width.
    tile: {
      width: '31%',
      flexGrow: 1,
      alignItems: 'center',
      gap: 8,
      paddingVertical: 14,
      paddingHorizontal: 6,
      borderRadius: RADIUS.md,
      borderWidth: 1.5,
      borderColor: c.border,
      backgroundColor: c.surfaceAlt,
      overflow: 'hidden',
    },
    tileLabel: {fontSize: 13, fontWeight: '600', color: c.muted, textAlign: 'center'},
    tileLabelActive: {fontWeight: '700'},
    tileCheck: {
      position: 'absolute',
      top: 7,
      right: 7,
      width: 18,
      height: 18,
      borderRadius: 9,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
