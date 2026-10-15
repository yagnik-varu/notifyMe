/** White (dark: charcoal) rounded panel that groups related content. */
import React from 'react';
import {StyleSheet, View, ViewStyle} from 'react-native';
import {Palette, RADIUS, SPACE, useStyles} from '../theme';

export function Card({children, style}: {children: React.ReactNode; style?: ViewStyle}) {
  const [s] = useStyles(styles);
  return <View style={[s.card, style]}>{children}</View>;
}

const styles = (c: Palette) =>
  StyleSheet.create({
    card: {
      backgroundColor: c.surface,
      borderRadius: RADIUS.lg,
      borderWidth: 1,
      borderColor: c.border,
      padding: SPACE.lg + 2,
      marginBottom: SPACE.lg,
      // iOS draws shadow* props; Android only understands `elevation`.
      shadowColor: c.shadow,
      shadowOpacity: 0.08,
      shadowRadius: 18,
      shadowOffset: {width: 0, height: 6},
      elevation: 2,
    },
  });
