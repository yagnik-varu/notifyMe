/**
 * The big colored card at the top: current state ("Watching for calls"), the
 * master on/off switch, and summary chips (destination, hours, days).
 *
 * What to show is decided by buildHero() in src/screens/home/buildHero.ts;
 * this component only draws it.
 */
import React, {useEffect, useRef} from 'react';
import {Animated, StyleSheet, Switch, Text, View} from 'react-native';
import {LucideIcon} from 'lucide-react-native';
import {Palette, RADIUS, SPACE, useStyles} from '../theme';
import {GradientFill} from './GradientFill';
import {useReduceMotion} from './hooks/useReduceMotion';
import {HERO_GRADIENT, Tone} from './tone';

export interface HeroChip {
  icon: LucideIcon;
  text: string;
}

export function StatusHero(props: {
  tone: Tone;
  icon: LucideIcon;
  title: string;
  caption: string;
  /** Position of the master switch. */
  enabled: boolean;
  onToggle: (v: boolean) => void;
  /** True while calls are actively being watched — shows the pulsing ring. */
  live: boolean;
  chips: HeroChip[];
}) {
  const [s] = useStyles(styles);
  const reduceMotion = useReduceMotion();
  // Animated.Value is a number the animation system updates WITHOUT re-rendering
  // React. useRef keeps the same instance across renders.
  const pulse = useRef(new Animated.Value(0)).current;
  const Icon = props.icon;
  const animate = props.live && !reduceMotion;

  // Soft ring that breathes while calls are being watched (static when motion is reduced).
  useEffect(() => {
    if (!animate) {
      pulse.stopAnimation();
      pulse.setValue(0);
      return;
    }
    const loop = Animated.loop(
      // useNativeDriver: the animation runs on the UI thread, smooth even if JS is busy.
      Animated.timing(pulse, {toValue: 1, duration: 2000, useNativeDriver: true}),
    );
    loop.start();
    return () => loop.stop();
  }, [animate, pulse]);

  return (
    <View style={s.hero}>
      <GradientFill colors={HERO_GRADIENT[props.tone]} id={`hero-${props.tone}`} />
      <View style={s.heroGlow} />
      <View style={s.heroTop}>
        <View style={s.heroIconWrap} importantForAccessibility="no-hide-descendants">
          {props.live && (
            <Animated.View
              style={[
                s.heroRing,
                animate
                  ? {
                      // interpolate maps pulse 0→1 to fade 0.6→0 and grow 1→1.7×.
                      opacity: pulse.interpolate({inputRange: [0, 1], outputRange: [0.6, 0]}),
                      transform: [
                        {scale: pulse.interpolate({inputRange: [0, 1], outputRange: [1, 1.7]})},
                      ],
                    }
                  : s.heroRingStatic,
              ]}
            />
          )}
          <View style={s.heroIcon}>
            <Icon color="#FFFFFF" size={24} strokeWidth={2.2} />
          </View>
        </View>
        <View
          style={s.flex}
          accessible
          accessibilityRole="summary"
          // Screen readers re-read the status when it changes.
          accessibilityLiveRegion="polite">
          <Text style={s.heroTitle}>{props.title}</Text>
          <Text style={s.heroCaption}>{props.caption}</Text>
        </View>
        <Switch
          value={props.enabled}
          onValueChange={props.onToggle}
          trackColor={{true: 'rgba(255,255,255,0.5)', false: 'rgba(255,255,255,0.22)'}}
          thumbColor="#FFFFFF"
          accessibilityLabel="Call alerts"
          accessibilityHint={props.enabled ? 'Turns call alerts off' : 'Turns call alerts on'}
        />
      </View>
      {props.chips.length > 0 && (
        <View style={s.heroChips}>
          {props.chips.map(chip => {
            const ChipIcon = chip.icon;
            return (
              <View key={chip.text} style={s.heroChip} accessible accessibilityLabel={chip.text}>
                <ChipIcon color="#FFFFFF" size={14} strokeWidth={2.4} />
                <Text style={s.heroChipText} maxFontSizeMultiplier={1.6}>
                  {chip.text}
                </Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

// Colors are fixed white-on-gradient here, so the palette isn't used.
const styles = (_c: Palette) =>
  StyleSheet.create({
    flex: {flex: 1},
    hero: {
      borderRadius: RADIUS.lg + 6,
      padding: SPACE.lg + 4,
      marginBottom: SPACE.lg,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOpacity: 0.18,
      shadowRadius: 20,
      shadowOffset: {width: 0, height: 10},
      elevation: 6,
    },
    heroGlow: {
      position: 'absolute',
      width: 220,
      height: 220,
      borderRadius: 110,
      right: -70,
      top: -90,
      backgroundColor: 'rgba(255,255,255,0.06)',
    },
    heroTop: {flexDirection: 'row', alignItems: 'center', gap: 14},
    heroIconWrap: {width: 52, height: 52, alignItems: 'center', justifyContent: 'center'},
    heroRing: {
      position: 'absolute',
      width: 52,
      height: 52,
      borderRadius: 26,
      borderWidth: 2,
      borderColor: '#FFFFFF',
    },
    heroRingStatic: {opacity: 0.35, transform: [{scale: 1.15}]},
    heroIcon: {
      width: 52,
      height: 52,
      borderRadius: 26,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255,255,255,0.18)',
    },
    heroTitle: {fontSize: 21, fontWeight: '800', letterSpacing: -0.4, color: '#FFFFFF'},
    heroCaption: {fontSize: 14, marginTop: 3, lineHeight: 19, color: '#FFFFFF'},
    heroChips: {flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: SPACE.lg + 2},
    heroChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: RADIUS.pill,
      backgroundColor: 'rgba(0,0,0,0.2)',
    },
    heroChipText: {
      fontSize: 13,
      fontWeight: '600',
      color: '#FFFFFF',
      // Equal-width digits so "09:00–18:00" doesn't jiggle.
      fontVariant: ['tabular-nums'],
    },
  });
