# 5. React Native for web developers

**What you'll learn:** what carries over from React or Next.js (most of it) and what's different (no DOM, no CSS files, a different bundler, native code next to yours). Each point links to where this project uses it.

## Same as React on the web

- Components, props, JSX, `useState`, `useEffect`, `useCallback`, `useMemo`, `useRef`, and custom hooks all work exactly the same.
- TypeScript works the same.
- npm packages that don't touch the DOM (date math, validation…) work.

## Different

### No HTML elements, just a few primitives

| Web | React Native | Notes |
|---|---|---|
| `<div>` | `<View>` | Every layout box |
| `<span>`, `<p>` | `<Text>` | **All text must be inside `<Text>`**, or the app crashes |
| `<button>`, `onClick` | `<Pressable onPress>` | See [`Button.tsx`](../src/ui/Button.tsx) |
| `<input>` | `<TextInput onChangeText>` | `onChangeText` hands you the string directly; see [`Field.tsx`](../src/ui/Field.tsx) |
| `<input type=checkbox>` | `<Switch>` | See [`StatusHero.tsx`](../src/ui/StatusHero.tsx) |
| scrolling `<body>` | `<ScrollView>` | Nothing scrolls unless you wrap it in one |
| `<img>` / SVG | `<Image>` / `react-native-svg` | Icons here come from `lucide-react-native` (SVG) |

These render real Android widgets (an Android `TextView`, for example), not web elements.

### Styles are JS objects, not CSS

```tsx
const styles = StyleSheet.create({
  card: {padding: 16, borderRadius: 20, backgroundColor: '#fff'},
});
<View style={[styles.card, isActive && {borderColor: 'blue'}]} />
```

- Property names are camelCase, and numbers are density-independent pixels (dp). There's no `px` or `rem`.
- **Flexbox is the only layout system**, and `flexDirection` defaults to `column` (on the web it's `row`).
- No cascading: styles don't inherit to children (except some text styles inside nested `<Text>`).
- No `:hover` or media queries. Pressed state comes from `Pressable`'s `style={({pressed}) => …}`, and dark mode comes from `useColorScheme()`.
- `style` accepts an array, and later entries win. `false`/`null` entries are ignored, which is handy for conditionals.

This project wraps all of that in a small pattern: `useStyles(factory)` builds the StyleSheet from the current light/dark palette. See [The UI layer](06-ui-layer.md#theme).

### Shadows are platform-specific

`shadowColor`/`shadowOpacity`/`shadowRadius` only work on iOS. Android uses `elevation: 2`. That's why [`Card.tsx`](../src/ui/Card.tsx) sets both.

### Accessibility props instead of ARIA

`accessibilityRole="button"`, `accessibilityLabel`, `accessibilityState={{checked}}` and `accessibilityLiveRegion` are the equivalents of `role`, `aria-label`, `aria-checked` and `aria-live`. They're used throughout `src/ui`.

### Metro instead of webpack or Vite

**Metro** bundles your JS. `npm start` runs it, and the phone downloads the bundle from your computer during development. Saving a `.ts`/`.tsx` file hot-reloads the app, just like Next.js fast refresh.

But **changes to Android code (`android/…`) don't hot-reload**. You must rebuild and reinstall with `npm run android`.

### There is native code next to yours

A React Native app is a real Android app (`android/`) that embeds a JavaScript engine (Hermes) to run your code. When JS needs something only Android can do, such as reading the call log, it calls a **native module**. This project has one, `NotifyMe`, explained in [The native bridge](07-native-bridge.md).

### The app can be killed at any time

On the web a tab stays open. On a phone, the OS freezes or kills background apps to save battery, and **your JS stops running**. That's why everything that must happen while the app is closed (call detection, sending) is written in Android code. See [Architecture](02-architecture.md).

### Lifecycle: AppState instead of page visibility

`AppState` tells you when the app goes to the background (`'background'`) or comes back (`'active'`). The screen reloads its data when it comes back, in [`useAppForeground.ts`](../src/hooks/useAppForeground.ts), because the user may have changed a setting in Android Settings meanwhile.

### Safe areas

Phones have notches, status bars and gesture bars. `react-native-safe-area-context` reports their sizes (`useSafeAreaInsets()`), and the screen pads itself with them; see `HomeScreen.tsx`.

### Platform dialogs are imperative APIs

Some things aren't components but function calls that open a native dialog:

- `Alert.alert(title, message, buttons)`: a system alert box (used when permissions are refused).
- `DateTimePickerAndroid.open({...})`: the native clock picker (used in [`ScheduleSection.tsx`](../src/screens/home/sections/ScheduleSection.tsx)).
- `PermissionsAndroid.requestMultiple([...])`: the "Allow / Don't allow" prompts (used in [`permissions.ts`](../src/domain/permissions.ts)).
- `Linking.openSettings()`: opens this app's page in Android Settings.

### Animations run on the native side

`Animated.Value` holds a number that changes over time **without re-rendering React**. `useNativeDriver: true` hands the animation to the UI thread so it stays smooth. See the pulsing ring in [`StatusHero.tsx`](../src/ui/StatusHero.tsx).

Next: [The UI layer](06-ui-layer.md)
