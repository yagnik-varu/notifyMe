/** Full-screen fallback shown when the settings couldn't be read from the native side. */
import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {TriangleAlert} from 'lucide-react-native';
import {Palette, SPACE, useStyles} from '../../../theme';
import {Button, IconBadge} from '../../../ui';

export function LoadErrorView({onRetry, topInset}: {onRetry: () => void; topInset: number}) {
  const [s] = useStyles(styles);
  return (
    <View style={[s.screen, {paddingTop: topInset}]}>
      <IconBadge icon={TriangleAlert} tone="warning" size={64} />
      <Text style={s.loadTitle}>Couldn't load your settings</Text>
      <Text style={s.loadText}>Something went wrong starting Notify-Me.</Text>
      <Button title="Try again" onPress={onRetry} style={s.loadButton} />
    </View>
  );
}

const styles = (c: Palette) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: c.bg,
      alignItems: 'center',
      justifyContent: 'center',
      padding: SPACE.xl,
    },
    loadTitle: {fontSize: 18, fontWeight: '700', color: c.text, marginTop: SPACE.lg},
    loadText: {fontSize: 14, color: c.muted, marginTop: 6, textAlign: 'center'},
    loadButton: {marginTop: SPACE.xl, alignSelf: 'stretch'},
  });
