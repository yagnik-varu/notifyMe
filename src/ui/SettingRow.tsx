/**
 * One row in a settings list: icon, title, subtitle and something on the right
 * (a Pill, a Button, a chevron). Tappable when `onPress` is given.
 */
import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {LucideIcon} from 'lucide-react-native';
import {Palette, useStyles} from '../theme';
import {IconBadge} from './IconBadge';
import {Tone} from './tone';

export function SettingRow(props: {
  icon: LucideIcon;
  tone: Tone;
  title: string;
  subtitle: string;
  right?: React.ReactNode;
  onPress?: () => void;
  /** The last row in a card draws no divider line below it. */
  last?: boolean;
}) {
  const [s, c] = useStyles(styles);
  const body = (
    <View style={[s.settingRow, !props.last && s.settingDivider]}>
      <IconBadge icon={props.icon} tone={props.tone} size={40} />
      <View style={s.flex}>
        <Text style={s.settingTitle}>{props.title}</Text>
        <Text style={s.settingSubtitle}>{props.subtitle}</Text>
      </View>
      {props.right}
    </View>
  );
  if (!props.onPress) return body;
  return (
    <Pressable
      onPress={props.onPress}
      android_ripple={{color: c.accentSoft}}
      accessibilityRole="button"
      accessibilityLabel={props.title}
      accessibilityHint={props.subtitle}>
      {body}
    </Pressable>
  );
}

const styles = (c: Palette) =>
  StyleSheet.create({
    flex: {flex: 1},
    settingRow: {flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14},
    // hairlineWidth = the thinnest line the screen can draw (1 physical pixel).
    settingDivider: {borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border},
    settingTitle: {fontSize: 15, fontWeight: '600', color: c.text},
    settingSubtitle: {fontSize: 13, color: c.muted, marginTop: 2, lineHeight: 18},
  });
