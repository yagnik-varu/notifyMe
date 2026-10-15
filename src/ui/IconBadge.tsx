/** An icon on a rounded, softly tinted square. Decorative: hidden from screen readers. */
import React from 'react';
import {StyleSheet, View} from 'react-native';
import {LucideIcon} from 'lucide-react-native';
import {useTheme} from '../theme';
import {Tone, toneColors} from './tone';

export function IconBadge(props: {
  icon: LucideIcon;
  tone?: Tone;
  /** Edge length in dp (default 40). */
  size?: number;
  /** Overrides the tone: icon in this color, background a translucent tint of it. */
  color?: string;
}) {
  const c = useTheme();
  const size = props.size ?? 40;
  const {fg, bg} = toneColors(c, props.tone ?? 'accent');
  const Icon = props.icon;
  return (
    <View
      importantForAccessibility="no-hide-descendants"
      style={[
        s.iconBadge,
        {
          width: size,
          height: size,
          borderRadius: size * 0.3,
          // '#RRGGBB' + '24' = 8-digit hex color with ~14% opacity.
          backgroundColor: props.color ? props.color + '24' : bg,
        },
      ]}>
      <Icon color={props.color ?? fg} size={size * 0.5} strokeWidth={2.2} />
    </View>
  );
}

// Static styles: nothing here depends on the light/dark palette.
const s = StyleSheet.create({
  iconBadge: {alignItems: 'center', justifyContent: 'center'},
});
