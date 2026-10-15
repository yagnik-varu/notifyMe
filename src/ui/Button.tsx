/**
 * The app's button. Three looks:
 *  - primary   filled brand color (main action)
 *  - secondary outlined
 *  - ghost     text only
 * `compact` makes a smaller button for use inside rows.
 */
import React from 'react';
import {ActivityIndicator, Insets, Pressable, StyleSheet, Text, View, ViewStyle} from 'react-native';
import {LucideIcon} from 'lucide-react-native';
import {Palette, RADIUS, SPACE, useStyles} from '../theme';

export function Button(props: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  icon?: LucideIcon;
  disabled?: boolean;
  /** Shows a spinner instead of the title and blocks presses. */
  loading?: boolean;
  compact?: boolean;
  style?: ViewStyle;
  /** Screen-reader label when the visible title isn't descriptive enough. */
  a11yLabel?: string;
  a11yHint?: string;
}) {
  const [s, c] = useStyles(styles);
  const variant = props.variant ?? 'primary';
  const inactive = props.disabled || props.loading;
  const fg = inactive ? c.faint : variant === 'primary' ? c.onAccent : c.accent;
  const Icon = props.icon;
  // Compact buttons draw at 40dp; the slop brings the touch area to 48dp.
  const hitSlop: Insets | undefined = props.compact
    ? {top: 4, bottom: 4, left: 4, right: 4}
    : undefined;
  return (
    <Pressable
      onPress={props.onPress}
      disabled={inactive}
      hitSlop={hitSlop}
      accessibilityRole="button"
      accessibilityLabel={props.a11yLabel ?? props.title}
      accessibilityHint={props.a11yHint}
      accessibilityState={{disabled: !!inactive, busy: !!props.loading}}
      // Android's native ink ripple on press.
      android_ripple={{color: variant === 'primary' ? c.accentPressed : c.accentSoft}}
      // Pressable accepts a function for `style`, so the look can change while pressed.
      style={({pressed}) => [
        s.btn,
        props.compact && s.btnCompact,
        variant === 'primary' && {
          backgroundColor: inactive ? c.surfaceAlt : pressed ? c.accentPressed : c.accentStrong,
        },
        variant === 'secondary' && {
          backgroundColor: pressed ? c.accentSoft : 'transparent',
          borderColor: inactive ? c.border : c.accent,
          borderWidth: 1.5,
        },
        variant === 'ghost' && {backgroundColor: pressed ? c.accentSoft : 'transparent'},
        props.style,
      ]}>
      {props.loading ? (
        <ActivityIndicator color={c.accent} size="small" />
      ) : (
        <View style={s.btnInner}>
          {Icon && <Icon color={fg} size={props.compact ? 15 : 18} strokeWidth={2.4} />}
          <Text style={[s.btnText, props.compact && s.btnTextCompact, {color: fg}]}>
            {props.title}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = (_c: Palette) =>
  StyleSheet.create({
    btn: {
      minHeight: 52,
      borderRadius: RADIUS.md,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: SPACE.lg,
      overflow: 'hidden', // keeps the ripple inside the rounded corners
    },
    btnCompact: {minHeight: 40, borderRadius: RADIUS.sm, paddingHorizontal: SPACE.md},
    btnInner: {flexDirection: 'row', alignItems: 'center', gap: 8},
    btnText: {fontSize: 16, fontWeight: '700', letterSpacing: 0.1},
    btnTextCompact: {fontSize: 14},
  });
