/** Logo + app name at the top of the home screen. */
import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {Phone} from 'lucide-react-native';
import {Palette, SPACE, useStyles} from '../../../theme';
import {BRAND_GRADIENT, GradientFill} from '../../../ui';

export function AppHeader() {
  const [s] = useStyles(styles);
  return (
    <View style={s.header}>
      <View style={s.logo} importantForAccessibility="no-hide-descendants">
        <GradientFill colors={BRAND_GRADIENT} id="logo" />
        <Phone color="#FFFFFF" size={24} strokeWidth={2.4} />
      </View>
      <View style={s.flex}>
        <Text style={s.title} accessibilityRole="header">
          Notify-Me
        </Text>
        <Text style={s.subtitle}>Call alerts for your team chat</Text>
      </View>
    </View>
  );
}

const styles = (c: Palette) =>
  StyleSheet.create({
    flex: {flex: 1},
    header: {flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: SPACE.xl},
    logo: {
      width: 50,
      height: 50,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    title: {fontSize: 26, fontWeight: '800', color: c.text, letterSpacing: -0.5},
    subtitle: {fontSize: 14, color: c.muted, marginTop: 1},
  });
