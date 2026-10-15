import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Animated,
  Insets,
  KeyboardTypeOptions,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  ViewStyle,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Svg, {Defs, LinearGradient, Rect, Stop} from 'react-native-svg';
import {
  Check,
  CircleAlert,
  CircleCheck,
  Eye,
  EyeOff,
  FlaskConical,
  Hash,
  Inbox,
  Info,
  LucideIcon,
  MessageCircle,
  MessagesSquare,
  PhoneIncoming,
  PhoneMissed,
  TriangleAlert,
  Users,
  Webhook,
} from 'lucide-react-native';
import {Palette, RADIUS, SPACE, useStyles} from '../theme';
import {HistoryEntry, PLATFORMS} from '../NotifyMe';
import {friendlyDetail, relativeTime} from '../format';

export type Tone = 'accent' | 'success' | 'warning' | 'danger' | 'neutral';

function toneColors(c: Palette, tone: Tone): {fg: string; bg: string} {
  switch (tone) {
    case 'success':
      return {fg: c.success, bg: c.successSoft};
    case 'warning':
      return {fg: c.warning, bg: c.warningSoft};
    case 'danger':
      return {fg: c.danger, bg: c.dangerSoft};
    case 'accent':
      return {fg: c.accent, bg: c.accentSoft};
    default:
      return {fg: c.muted, bg: c.surfaceAlt};
  }
}

// Deep two-stop gradients for the status card. Both stops keep white text ≥4.5:1.
const HERO_GRADIENT: Record<Tone, [string, string]> = {
  success: ['#15803D', '#0F766E'],
  warning: ['#B45309', '#92400E'],
  accent: ['#5B3FD0', '#3F2FB8'],
  danger: ['#BE123C', '#9F1239'],
  neutral: ['#4B5568', '#1F2633'],
};

export const BRAND_GRADIENT: [string, string] = ['#7C5CFF', '#4A2FC4'];

const PLATFORM_ICON: Record<string, LucideIcon> = {
  slack: Hash,
  discord: MessageCircle,
  teams: Users,
  cliq: MessagesSquare,
  generic: Webhook,
};

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// ---- Hooks ----

/** True when the user asked the OS for less motion (incl. "Animation scale: off"). */
export function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduce);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);
    return () => sub.remove();
  }, []);
  return reduce;
}

// ---- Gradient ----

/** Fills its parent with a diagonal gradient. Parent should set borderRadius + overflow. */
export function GradientFill({colors, id}: {colors: [string, string]; id: string}) {
  // Sized from layout: percentage sizes don't follow the parent when it grows later.
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

// ---- Layout ----

export function Card({children, style}: {children: React.ReactNode; style?: ViewStyle}) {
  const [s] = useStyles(styles);
  return <View style={[s.card, style]}>{children}</View>;
}

export function SectionHeader(props: {
  title: string;
  action?: {label: string; onPress: () => void; tone?: Tone; a11yLabel?: string};
}) {
  const [s, c] = useStyles(styles);
  return (
    <View style={s.sectionHeader}>
      <Text style={s.sectionTitle} accessibilityRole="header">
        {props.title}
      </Text>
      {props.action && (
        <Pressable
          onPress={props.action.onPress}
          style={s.sectionActionHit}
          accessibilityRole="button"
          accessibilityLabel={props.action.a11yLabel ?? props.action.label}>
          <Text
            style={[
              s.sectionAction,
              {color: toneColors(c, props.action.tone ?? 'accent').fg},
            ]}>
            {props.action.label}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

// ---- Atoms ----

export function IconBadge(props: {
  icon: LucideIcon;
  tone?: Tone;
  size?: number;
  color?: string; // overrides the tone (icon color; background is a tint of it)
}) {
  const [s, c] = useStyles(styles);
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
          backgroundColor: props.color ? props.color + '24' : bg,
        },
      ]}>
      <Icon color={props.color ?? fg} size={size * 0.5} strokeWidth={2.2} />
    </View>
  );
}

export function Pill({text, tone, a11yLabel}: {text: string; tone: Tone; a11yLabel?: string}) {
  const [s, c] = useStyles(styles);
  const {fg, bg} = toneColors(c, tone);
  return (
    <View
      style={[s.pill, {backgroundColor: bg}]}
      accessible
      accessibilityLabel={a11yLabel ?? text}>
      <View style={[s.pillDot, {backgroundColor: fg}]} />
      <Text style={[s.pillText, {color: fg}]} maxFontSizeMultiplier={1.6}>
        {text}
      </Text>
    </View>
  );
}

export function Button(props: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  icon?: LucideIcon;
  disabled?: boolean;
  loading?: boolean;
  compact?: boolean;
  style?: ViewStyle;
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
      android_ripple={{color: variant === 'primary' ? c.accentPressed : c.accentSoft}}
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

export function Field(props: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  helper?: string;
  error?: string | null;
  warning?: string | null;
  secret?: boolean;
  multiline?: boolean;
  keyboardType?: KeyboardTypeOptions;
}) {
  const [s, c] = useStyles(styles);
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const message = props.error ?? props.warning ?? props.helper;
  const messageColor = props.error ? c.danger : props.warning ? c.warning : c.muted;
  const borderColor = props.error
    ? c.danger
    : focused
    ? c.accent
    : props.warning
    ? c.warning
    : c.border;
  const RevealIcon = revealed ? EyeOff : Eye;
  return (
    <View style={s.field}>
      <Text style={s.fieldLabel} importantForAccessibility="no">
        {props.label}
      </Text>
      <View style={[s.inputWrap, {borderColor}, focused && s.inputFocused]}>
        <TextInput
          style={[s.input, props.multiline && s.inputMultiline]}
          value={props.value}
          onChangeText={props.onChangeText}
          placeholder={props.placeholder}
          placeholderTextColor={c.faint}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete={props.keyboardType === 'email-address' ? 'email' : 'off'}
          keyboardType={props.keyboardType}
          multiline={props.multiline}
          secureTextEntry={props.secret && !revealed}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          accessibilityLabel={props.label}
          accessibilityHint={message ?? undefined}
        />
        {props.secret && props.value.length > 0 && (
          <Pressable
            onPress={() => setRevealed(r => !r)}
            hitSlop={8}
            style={s.reveal}
            accessibilityRole="button"
            accessibilityLabel={revealed ? 'Hide token' : 'Show token'}>
            <RevealIcon color={c.muted} size={20} strokeWidth={2} />
          </Pressable>
        )}
      </View>
      {message ? (
        <View
          style={s.fieldMessageRow}
          accessibilityLiveRegion={props.error ? 'assertive' : props.warning ? 'polite' : 'none'}>
          {(props.error || props.warning) && (
            <CircleAlert
              color={messageColor}
              size={14}
              strokeWidth={2.4}
              style={s.fieldMessageIcon}
            />
          )}
          <Text style={[s.fieldMessage, {color: messageColor}]}>{message}</Text>
        </View>
      ) : null}
    </View>
  );
}

// ---- Status hero ----

export function StatusHero(props: {
  tone: Tone;
  icon: LucideIcon;
  title: string;
  caption: string;
  enabled: boolean;
  onToggle: (v: boolean) => void;
  live: boolean;
  chips: {icon: LucideIcon; text: string}[];
}) {
  const [s] = useStyles(styles);
  const reduceMotion = useReduceMotion();
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

// ---- Setup checklist ----

export interface SetupStep {
  key: string;
  title: string;
  subtitle: string;
  done: boolean;
  action?: {label: string; onPress: () => void};
}

export function SetupChecklist({steps}: {steps: SetupStep[]}) {
  const [s, c] = useStyles(styles);
  const done = steps.filter(x => x.done).length;
  const nextKey = steps.find(x => !x.done)?.key;
  return (
    <Card>
      <View style={s.rowBetween}>
        <View style={s.flex}>
          <Text style={s.cardTitle} accessibilityRole="header">
            Finish setting up
          </Text>
          <Text style={s.cardSubtitle}>A few steps so no call slips through.</Text>
        </View>
        <View
          style={[s.progressBadge, {backgroundColor: c.accentSoft}]}
          accessible
          accessibilityLabel={`${done} of ${steps.length} steps done`}>
          <Text style={[s.progressText, {color: c.accent}]}>
            {done}/{steps.length}
          </Text>
        </View>
      </View>
      <View
        style={s.progressTrack}
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel="Setup progress"
        accessibilityValue={{min: 0, max: steps.length, now: done}}>
        <View
          style={[
            s.progressFill,
            {width: `${(done / steps.length) * 100}%`, backgroundColor: c.accent},
          ]}
        />
      </View>
      {steps.map(step => {
        const isNext = step.key === nextKey;
        return (
          <View key={step.key} style={s.stepRow}>
            <View
              importantForAccessibility="no-hide-descendants"
              style={[
                s.stepCheck,
                step.done
                  ? {backgroundColor: c.success, borderColor: c.success}
                  : {borderColor: isNext ? c.accent : c.border},
              ]}>
              {step.done && <Check color={c.surface} size={14} strokeWidth={3.2} />}
            </View>
            <View
              style={s.flex}
              accessible
              accessibilityLabel={`${step.title}, ${step.done ? 'done' : 'not done'}`}
              accessibilityHint={step.done ? undefined : step.subtitle}>
              <Text style={[s.stepTitle, step.done && s.stepTitleDone]}>{step.title}</Text>
              {!step.done && <Text style={s.stepSubtitle}>{step.subtitle}</Text>}
            </View>
            {!step.done && step.action && (
              <Button
                title={step.action.label}
                onPress={step.action.onPress}
                variant={isNext ? 'primary' : 'secondary'}
                a11yLabel={`${step.action.label}: ${step.title}`}
                compact
              />
            )}
          </View>
        );
      })}
    </Card>
  );
}

// ---- Destination picker ----

export function PlatformPicker(props: {value: string; onChange: (v: string) => void}) {
  const [s, c] = useStyles(styles);
  return (
    <View style={s.tiles} accessibilityRole="radiogroup" accessibilityLabel="Destination">
      {PLATFORMS.map(p => {
        const active = p.value === props.value;
        return (
          <Pressable
            key={p.value}
            onPress={() => props.onChange(p.value)}
            android_ripple={{color: c.accentSoft}}
            accessibilityRole="radio"
            accessibilityLabel={p.label}
            accessibilityState={{checked: active}}
            style={[s.tile, active && {borderColor: c.accent, backgroundColor: c.accentSoft}]}>
            <IconBadge icon={PLATFORM_ICON[p.value] ?? Webhook} color={p.color} size={38} />
            <Text
              style={[s.tileLabel, active && [s.tileLabelActive, {color: c.text}]]}
              numberOfLines={2}>
              {p.label}
            </Text>
            {active && (
              <View
                style={[s.tileCheck, {backgroundColor: c.accentStrong}]}
                importantForAccessibility="no-hide-descendants">
                <Check color="#FFFFFF" size={11} strokeWidth={3.4} />
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

// ---- Schedule ----

export function TimeTile(props: {
  label: string;
  a11yName: string;
  value: string;
  onPress: () => void;
}) {
  const [s, c] = useStyles(styles);
  return (
    <Pressable
      onPress={props.onPress}
      android_ripple={{color: c.accentSoft}}
      style={s.timeTile}
      accessibilityRole="button"
      accessibilityLabel={`${props.a11yName}, ${props.value}`}
      accessibilityHint="Opens a time picker">
      <Text style={s.timeLabel}>{props.label}</Text>
      <Text style={s.timeValue} maxFontSizeMultiplier={1.4}>
        {props.value}
      </Text>
      <Text style={s.timeHint}>Tap to change</Text>
    </Pressable>
  );
}

export function DayChips(props: {mask: number; onToggle: (day: number) => void}) {
  const [s, c] = useStyles(styles);
  return (
    <View style={s.daysRow} accessibilityLabel="Office days">
      {DAY_LABELS.map((label, i) => {
        const on = (props.mask & (1 << i)) !== 0;
        return (
          // Full-width cell keeps a 48dp touch target; the circle is drawn inside it.
          <Pressable
            key={i}
            onPress={() => props.onToggle(i)}
            style={s.dayCell}
            accessibilityRole="checkbox"
            accessibilityLabel={DAY_NAMES[i]}
            accessibilityState={{checked: on}}>
            <View
              style={[
                s.dayChip,
                on && {backgroundColor: c.accentStrong, borderColor: c.accentStrong},
              ]}>
              <Text
                style={[s.dayChipText, on && {color: c.onAccent}]}
                maxFontSizeMultiplier={1.3}>
                {label}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Segmented<T extends string>(props: {
  label: string;
  options: {value: T; label: string; tone: Tone}[];
  value: T;
  onChange: (v: T) => void;
}) {
  const [s, c] = useStyles(styles);
  return (
    <View style={s.segmented} accessibilityRole="radiogroup" accessibilityLabel={props.label}>
      {props.options.map(o => {
        const active = o.value === props.value;
        const {fg, bg} = toneColors(c, o.tone);
        return (
          <Pressable
            key={o.value}
            onPress={() => props.onChange(o.value)}
            accessibilityRole="radio"
            accessibilityLabel={o.label}
            accessibilityState={{checked: active}}
            style={[s.segment, active && [s.segmentActive, {backgroundColor: bg}]]}>
            <Text style={[s.segmentText, active && [s.segmentTextActive, {color: fg}]]}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ---- Settings rows ----

export function SettingRow(props: {
  icon: LucideIcon;
  tone: Tone;
  title: string;
  subtitle: string;
  right?: React.ReactNode;
  onPress?: () => void;
  last?: boolean;
}) {
  const [s, c] = useStyles(styles);
  const body = (
    <View style={[s.settingRow, !props.last && s.settingDivider]}>
      <IconBadge icon={props.icon} tone={props.tone} size={40} />
      <View style={s.flex}>
        <Text style={s.settingTitle}>{props.title}</Text>
        <Text style={s.settingSubtitle}>{props.subtitle}</Text>
      </View>
      {props.right}
    </View>
  );
  if (!props.onPress) return body;
  return (
    <Pressable
      onPress={props.onPress}
      android_ripple={{color: c.accentSoft}}
      accessibilityRole="button"
      accessibilityLabel={props.title}
      accessibilityHint={props.subtitle}>
      {body}
    </Pressable>
  );
}

// ---- Inline result banner ----

const BANNER_ICON: Record<Tone, LucideIcon> = {
  success: CircleCheck,
  danger: CircleAlert,
  warning: TriangleAlert,
  accent: Info,
  neutral: Info,
};

export function Banner(props: {tone: Tone; title: string; message?: string; loading?: boolean}) {
  const [s, c] = useStyles(styles);
  const {fg, bg} = toneColors(c, props.tone);
  const Icon = BANNER_ICON[props.tone];
  return (
    <View
      style={[s.banner, {backgroundColor: bg, borderColor: fg + '40'}]}
      accessible
      accessibilityRole={props.tone === 'danger' ? 'alert' : undefined}
      accessibilityLiveRegion="polite"
      accessibilityLabel={props.message ? `${props.title}. ${props.message}` : props.title}>
      {props.loading ? (
        <ActivityIndicator size="small" color={fg} />
      ) : (
        <Icon color={fg} size={20} strokeWidth={2.2} />
      )}
      <View style={s.flex}>
        <Text style={[s.bannerTitle, {color: fg}]}>{props.title}</Text>
        {props.message ? <Text style={[s.bannerText, {color: c.text}]}>{props.message}</Text> : null}
      </View>
    </View>
  );
}

// ---- Activity ----

const KIND_META: Record<string, {icon: LucideIcon; tone: Tone; name: string}> = {
  incoming: {icon: PhoneIncoming, tone: 'success', name: 'Incoming call'},
  missed: {icon: PhoneMissed, tone: 'danger', name: 'Missed call'},
  test: {icon: FlaskConical, tone: 'accent', name: 'Test message'},
};

function kindOf(e: HistoryEntry): string {
  if (e.kind) return e.kind;
  return e.label === 'Test' ? 'test' : 'incoming';
}

export function HistoryList({data, limit}: {data: HistoryEntry[]; limit: number}) {
  const [s] = useStyles(styles);
  if (data.length === 0) {
    return (
      <Card style={s.emptyCard}>
        <IconBadge icon={Inbox} tone="accent" size={56} />
        <Text style={s.emptyTitle}>No activity yet</Text>
        <Text style={s.emptyText}>
          Calls you receive will show up here. Send a test message to check everything works.
        </Text>
      </Card>
    );
  }
  const rows = data.slice(0, limit);
  return (
    <Card style={s.listCard}>
      {rows.map((item, i) => {
        const kind = kindOf(item);
        const meta = KIND_META[kind];
        const title =
          kind === 'test' ? 'Test message' : item.label?.length ? item.label : 'Unknown number';
        const when = relativeTime(item.timestamp);
        const outcome = item.success
          ? 'sent'
          : `failed: ${friendlyDetail(item.detail, false)}`;
        return (
          <View
            key={`${item.timestamp}-${i}`}
            style={[s.histRow, i < rows.length - 1 && s.settingDivider]}
            accessible
            accessibilityLabel={`${title}, ${kind === 'test' ? '' : meta.name + ', '}${when}, ${outcome}`}>
            <IconBadge icon={meta.icon} tone={meta.tone} size={40} />
            <View style={s.flex}>
              <Text style={s.histTitle} numberOfLines={1}>
                {title}
              </Text>
              <Text style={s.histMeta}>
                {when}
                {kind !== 'test' ? ` · ${meta.name}` : ''}
              </Text>
              {!item.success && (
                <Text style={s.histError}>{friendlyDetail(item.detail, false)}</Text>
              )}
            </View>
            <Pill text={item.success ? 'Sent' : 'Failed'} tone={item.success ? 'success' : 'danger'} />
          </View>
        );
      })}
    </Card>
  );
}

// ---- Toast / snackbar ----

export interface ToastAction {
  label: string;
  onPress: () => void;
}

export type ShowToast = (msg: string, tone?: Tone, action?: ToastAction) => void;

function inverseTone(c: Palette, tone: Tone): string {
  switch (tone) {
    case 'success':
      return c.inverseSuccess;
    case 'warning':
      return c.inverseWarning;
    case 'danger':
      return c.inverseDanger;
    case 'accent':
      return c.inverseAccent;
    default:
      return c.faint;
  }
}

/**
 * Snackbar-style message at the bottom. Announced to screen readers, timed by the
 * user's accessibility timeout, and can carry one action (e.g. Undo).
 */
export function useToast(): [React.ReactNode, ShowToast] {
  const [s, c] = useStyles(styles);
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const [msg, setMsg] = useState<{text: string; tone: Tone; action?: ToastAction} | null>(null);
  const anim = useRef(new Animated.Value(0)).current;
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
      const screenReader = await AccessibilityInfo.isScreenReaderEnabled();
      const base = action ? (screenReader ? 10000 : 5000) : 2800;
      const timeout = await AccessibilityInfo.getRecommendedTimeoutMillis(base);
      timer.current = setTimeout(hide, timeout);
    },
    [anim, hide, reduceMotion],
  );

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const Icon = msg ? BANNER_ICON[msg.tone] : null;
  const node =
    msg && Icon ? (
      <Animated.View
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
        <Icon color={inverseTone(c, msg.tone)} size={20} strokeWidth={2.2} />
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

// ---- Styles ----

const styles = (c: Palette) =>
  StyleSheet.create({
    flex: {flex: 1},
    rowBetween: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},

    card: {
      backgroundColor: c.surface,
      borderRadius: RADIUS.lg,
      borderWidth: 1,
      borderColor: c.border,
      padding: SPACE.lg + 2,
      marginBottom: SPACE.lg,
      shadowColor: c.shadow,
      shadowOpacity: 0.08,
      shadowRadius: 18,
      shadowOffset: {width: 0, height: 6},
      elevation: 2,
    },
    cardTitle: {fontSize: 17, fontWeight: '700', color: c.text, letterSpacing: -0.2},
    cardSubtitle: {fontSize: 13, color: c.muted, marginTop: 2},

    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      minHeight: 48,
      marginTop: SPACE.xs,
      marginBottom: SPACE.xs,
      paddingLeft: SPACE.xs,
    },
    sectionTitle: {
      fontSize: 12,
      fontWeight: '800',
      color: c.muted,
      letterSpacing: 1.2,
      textTransform: 'uppercase',
    },
    sectionActionHit: {
      minHeight: 48,
      minWidth: 48,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: SPACE.sm,
      marginRight: -SPACE.sm,
    },
    sectionAction: {fontSize: 14, fontWeight: '700'},

    iconBadge: {alignItems: 'center', justifyContent: 'center'},

    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: RADIUS.pill,
    },
    pillDot: {width: 6, height: 6, borderRadius: 3},
    pillText: {fontSize: 12, fontWeight: '700'},

    btn: {
      minHeight: 52,
      borderRadius: RADIUS.md,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: SPACE.lg,
      overflow: 'hidden',
    },
    btnCompact: {minHeight: 40, borderRadius: RADIUS.sm, paddingHorizontal: SPACE.md},
    btnInner: {flexDirection: 'row', alignItems: 'center', gap: 8},
    btnText: {fontSize: 16, fontWeight: '700', letterSpacing: 0.1},
    btnTextCompact: {fontSize: 14},

    field: {marginBottom: SPACE.lg},
    fieldLabel: {fontSize: 14, fontWeight: '600', color: c.text, marginBottom: SPACE.sm},
    inputWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1.5,
      borderRadius: RADIUS.md,
      backgroundColor: c.surfaceAlt,
    },
    inputFocused: {backgroundColor: c.surface},
    input: {
      flex: 1,
      fontSize: 15,
      color: c.text,
      paddingHorizontal: 14,
      paddingVertical: 12,
      minHeight: 52,
    },
    inputMultiline: {minHeight: 68, textAlignVertical: 'top'},
    reveal: {paddingHorizontal: 14, paddingVertical: 14},
    fieldMessageRow: {flexDirection: 'row', alignItems: 'flex-start', marginTop: 7},
    fieldMessageIcon: {marginTop: 2, marginRight: 6},
    fieldMessage: {fontSize: 13, lineHeight: 18, flex: 1},

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
      fontVariant: ['tabular-nums'],
    },

    progressBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: RADIUS.pill,
      marginLeft: SPACE.md,
    },
    progressText: {fontSize: 13, fontWeight: '800'},
    progressTrack: {
      height: 6,
      borderRadius: 3,
      backgroundColor: c.surfaceAlt,
      marginTop: SPACE.lg,
      marginBottom: SPACE.sm,
      overflow: 'hidden',
    },
    progressFill: {height: 6, borderRadius: 3},
    stepRow: {flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10},
    stepCheck: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepTitle: {fontSize: 15, fontWeight: '600', color: c.text},
    stepTitleDone: {color: c.muted, fontWeight: '500'},
    stepSubtitle: {fontSize: 13, color: c.muted, marginTop: 2, lineHeight: 18},

    tiles: {flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: SPACE.lg + 2},
    tile: {
      width: '31%',
      flexGrow: 1,
      alignItems: 'center',
      gap: 8,
      paddingVertical: 14,
      paddingHorizontal: 6,
      borderRadius: RADIUS.md,
      borderWidth: 1.5,
      borderColor: c.border,
      backgroundColor: c.surfaceAlt,
      overflow: 'hidden',
    },
    tileLabel: {fontSize: 13, fontWeight: '600', color: c.muted, textAlign: 'center'},
    tileLabelActive: {fontWeight: '700'},
    tileCheck: {
      position: 'absolute',
      top: 7,
      right: 7,
      width: 18,
      height: 18,
      borderRadius: 9,
      alignItems: 'center',
      justifyContent: 'center',
    },

    timeTile: {
      flex: 1,
      borderRadius: RADIUS.md,
      backgroundColor: c.surfaceAlt,
      paddingVertical: 14,
      paddingHorizontal: 16,
      overflow: 'hidden',
    },
    timeLabel: {fontSize: 11, fontWeight: '800', color: c.muted, letterSpacing: 1},
    timeValue: {
      fontSize: 30,
      fontWeight: '800',
      color: c.text,
      marginTop: 2,
      letterSpacing: -0.5,
      fontVariant: ['tabular-nums'],
    },
    timeHint: {fontSize: 12, color: c.faint, marginTop: 2},

    daysRow: {flexDirection: 'row', marginHorizontal: -2},
    dayCell: {flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center'},
    dayChip: {
      width: '88%',
      maxWidth: 44,
      aspectRatio: 1,
      borderRadius: RADIUS.pill,
      borderWidth: 1.5,
      borderColor: c.border,
      backgroundColor: c.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dayChipText: {fontSize: 14, color: c.muted, fontWeight: '700'},

    segmented: {
      flexDirection: 'row',
      backgroundColor: c.surfaceAlt,
      borderRadius: RADIUS.md,
      padding: 4,
    },
    segment: {
      flex: 1,
      minHeight: 48,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: RADIUS.sm,
    },
    segmentActive: {
      shadowColor: c.shadow,
      shadowOpacity: 0.1,
      shadowRadius: 6,
      shadowOffset: {width: 0, height: 2},
      elevation: 1,
    },
    segmentText: {fontSize: 14, fontWeight: '600', color: c.muted},
    segmentTextActive: {fontWeight: '700'},

    settingRow: {flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14},
    settingDivider: {borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border},
    settingTitle: {fontSize: 15, fontWeight: '600', color: c.text},
    settingSubtitle: {fontSize: 13, color: c.muted, marginTop: 2, lineHeight: 18},

    banner: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      borderRadius: RADIUS.md,
      borderWidth: 1,
      padding: 14,
      marginTop: SPACE.lg,
    },
    bannerTitle: {fontSize: 14, fontWeight: '700'},
    bannerText: {fontSize: 13, marginTop: 3, lineHeight: 18},

    listCard: {paddingVertical: SPACE.xs},
    histRow: {flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 13},
    histTitle: {fontSize: 15, fontWeight: '600', color: c.text},
    histMeta: {fontSize: 13, color: c.muted, marginTop: 2, fontVariant: ['tabular-nums']},
    histError: {fontSize: 13, color: c.danger, marginTop: 4, lineHeight: 18},

    emptyCard: {alignItems: 'center', paddingVertical: SPACE.xl + 8},
    emptyTitle: {fontSize: 16, fontWeight: '700', color: c.text, marginTop: SPACE.md},
    emptyText: {
      fontSize: 14,
      color: c.muted,
      textAlign: 'center',
      marginTop: 6,
      lineHeight: 20,
      paddingHorizontal: SPACE.lg,
    },

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
