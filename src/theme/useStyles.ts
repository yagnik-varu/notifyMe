/**
 * Theme hooks: pick the palette for the phone's light/dark setting and build
 * StyleSheets from it.
 *
 * Usage pattern found in every component:
 *
 *   const styles = (c: Palette) => StyleSheet.create({box: {color: c.text}});
 *   function MyThing() {
 *     const [s, c] = useStyles(styles);   // s = styles, c = palette
 *     return <Text style={s.box} />;
 *   }
 *
 * WHY a factory function instead of a plain StyleSheet: colors depend on the
 * active scheme, so styles must be created at runtime. `useMemo` caches them, so
 * they are rebuilt only when the scheme flips — not on every render. For the
 * cache to work, define the factory at module level (outside the component).
 */
import {useMemo} from 'react';
import {useColorScheme} from 'react-native';
import {Palette, dark, light} from './palette';

/** The active palette. Re-renders the caller when the user switches dark mode. */
export function useTheme(): Palette {
  return useColorScheme() === 'dark' ? dark : light;
}

/** Build a StyleSheet from the active palette, rebuilt only when the scheme flips. */
export function useStyles<T>(factory: (c: Palette) => T): [T, Palette] {
  const c = useTheme();
  const styles = useMemo(() => factory(c), [c, factory]);
  return [styles, c];
}
