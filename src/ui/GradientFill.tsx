/**
 * Fills its parent with a diagonal two-color gradient (used by the logo and the
 * status card).
 *
 * WHY SVG: React Native's View has no CSS `linear-gradient`. react-native-svg
 * draws one instead. The parent should set `borderRadius` + `overflow: 'hidden'`
 * so the gradient follows its rounded corners.
 */
import React, {useState} from 'react';
import {StyleSheet, View} from 'react-native';
import Svg, {Defs, LinearGradient, Rect, Stop} from 'react-native-svg';

export function GradientFill({
  colors,
  id,
}: {
  /** [top-left color, bottom-right color]. */
  colors: [string, string];
  /** Unique id for the SVG gradient definition (must differ per gradient on screen). */
  id: string;
}) {
  // ⚠ GOTCHA: sized from onLayout in real pixels. Percentage sizes ("100%") are
  // computed once and don't follow the parent when it grows later (e.g. when the
  // status card gains a row of chips), leaving an unpainted strip.
  const [size, setSize] = useState({w: 0, h: 0});
  return (
    <View
      style={StyleSheet.absoluteFill}
      importantForAccessibility="no-hide-descendants"
      onLayout={e => {
        const {width, height} = e.nativeEvent.layout;
        if (width !== size.w || height !== size.h) setSize({w: width, h: height});
      }}>
      {size.w > 0 && (
        <Svg width={size.w} height={size.h}>
          <Defs>
            <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={colors[0]} />
              <Stop offset="1" stopColor={colors[1]} />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width={size.w} height={size.h} fill={`url(#${id})`} />
        </Svg>
      )}
    </View>
  );
}
