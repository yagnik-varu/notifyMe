/**
 * Snackbar-style message that slides up at the bottom of the screen
 * ("Destination saved", "Activity cleared · Undo").
 *
 * Usage:
 *   const [toast, showToast] = useToast();
 *   showToast('Saved');                                  // success tone
 *   showToast('Cleared', 'neutral', {label: 'Undo', onPress: undo});
 *   return <View>…{toast}</View>;                        // render the node last
 *
 * WHY a hook returning [node, show] instead of a global provider: there is one
 * screen, so the screen owns its toast. If more screens are added, move this
 * into a React context provider in src/App.tsx.
 *
 * Accessibility: the text is announced to screen readers, and how long it stays
 * respects the user's "time to take action" setting.
 */
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {AccessibilityInfo, Animated, Pressable, StyleSheet, Text} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Palette, RADIUS, SPACE, useStyles} from '../../theme';
import {useReduceMotion} from '../hooks/useReduceMotion';
import {TONE_ICON, Tone, inverseToneColor} from '../tone';

export interface ToastAction {
  label: string;
  onPress: () => void;
}

export type ShowToast = (msg: string, tone?: Tone, action?: ToastAction) => void;

export function useToast(): [React.ReactNode, ShowToast] {
  const [s, c] = useStyles(styles);
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const [msg, setMsg] = useState<{text: string; tone: Tone; action?: ToastAction} | null>(null);
  const anim = useRef(new Animated.Value(0)).current; // 0 = hidden, 1 = shown
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hide = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    Animated.timing(anim, {toValue: 0, duration: 150, useNativeDriver: true}).start(() =>
      setMsg(null),
    );
  }, [anim]);

  const show = useCallback<ShowToast>(
    async (text, tone = 'success', action) => {
      if (timer.current) clearTimeout(timer.current);
      setMsg({text, tone, action});
      AccessibilityInfo.announceForAccessibility(
        action ? `${text}. ${action.label} available.` : text,
      );
      if (reduceMotion) {
        anim.setValue(1);
      } else {
        Animated.spring(anim, {toValue: 1, useNativeDriver: true, friction: 8}).start();
      }
      // Toasts with an action stay longer (and longer still with a screen reader),
      // then Android may stretch it further per the user's accessibility timeout.
      const screenReader = await AccessibilityInfo.isScreenReaderEnabled();
      const base = action ? (screenReader ? 10000 : 5000) : 2800;
      const timeout = await AccessibilityInfo.getRecommendedTimeoutMillis(base);
      timer.current = setTimeout(hide, timeout);
    },
    [anim, hide, reduceMotion],
  );

  // Clear the pending hide timer if the screen unmounts.
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const Icon = msg ? TONE_ICON[msg.tone] : null;
  const node =
    msg && Icon ? (
      <Animated.View
        // box-none: the toast's own buttons get taps, the empty area doesn't block the screen.
        pointerEvents="box-none"
        style={[
          s.toast,
          {
            bottom: insets.bottom + SPACE.lg,
            opacity: anim,
            transform: reduceMotion
              ? []
              : [{translateY: anim.interpolate({inputRange: [0, 1], outputRange: [24, 0]})}],
          },
        ]}>
        <Icon color={inverseToneColor(c, msg.tone)} size={20} strokeWidth={2.2} />
        <Text style={s.toastText}>{msg.text}</Text>
        {msg.action && (
          <Pressable
            onPress={() => {
              msg.action?.onPress();
              hide();
            }}
            style={s.toastAction}
            accessibilityRole="button"
            accessibilityLabel={msg.action.label}>
            <Text style={[s.toastActionText, {color: c.inverseAccent}]}>{msg.action.label}</Text>
          </Pressable>
        )}
      </Animated.View>
    ) : null;

  return [node, show];
}

const styles = (c: Palette) =>
  StyleSheet.create({
    // Inverted colors (text color as background) so it stands out in both themes.
    toast: {
      position: 'absolute',
      left: SPACE.lg,
      right: SPACE.lg,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: c.text,
      borderRadius: RADIUS.md,
      minHeight: 52,
      paddingVertical: 6,
      paddingLeft: 16,
      paddingRight: 6,
      shadowColor: '#000',
      shadowOpacity: 0.25,
      shadowRadius: 16,
      shadowOffset: {width: 0, height: 6},
      elevation: 8,
    },
    toastText: {color: c.bg, fontSize: 14, fontWeight: '600', flex: 1, paddingVertical: 8},
    toastAction: {
      minHeight: 48,
      minWidth: 64,
      paddingHorizontal: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    toastActionText: {fontSize: 14, fontWeight: '800', letterSpacing: 0.3},
  });
