import React from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TextStyle,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import {COLORS} from '../theme';
import {HistoryEntry, PLATFORMS, Status} from '../NotifyMe';

export const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export function fmtMin(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function fmtTime(ts: number): string {
  return new Date(ts).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function Card({children, style}: {children: React.ReactNode; style?: ViewStyle}) {
  return <View style={[s.card, style]}>{children}</View>;
}

export function CardLabel({children}: {children: React.ReactNode}) {
  return <Text style={s.cardLabel}>{children}</Text>;
}

export function PrimaryButton(props: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[s.btn, props.disabled && s.btnDisabled]}
      onPress={props.onPress}
      disabled={props.disabled}>
      <Text style={s.btnText}>{props.title}</Text>
    </TouchableOpacity>
  );
}

export function OutlineButton(props: {title: string; onPress: () => void}) {
  return (
    <TouchableOpacity style={s.btnOutline} onPress={props.onPress}>
      <Text style={s.btnOutlineText}>{props.title}</Text>
    </TouchableOpacity>
  );
}

// Recolors by state — green=active, amber=paused, neutral=off (mirrors the native hero card).
export function StatusHero({status}: {status: Status}) {
  let title: string;
  let caption: string;
  let fg: string;
  let tint: string;
  if (status.state === 'paused') {
    title = 'Paused';
    caption = 'Muted until end of day';
    fg = COLORS.amber;
    tint = COLORS.amberTint;
  } else if (status.state === 'active') {
    title = 'Active';
    caption = status.forced
      ? 'Forced on — alerting every call'
      : 'Alerting incoming & missed calls';
    fg = COLORS.on;
    tint = COLORS.onTint;
  } else {
    title = 'Inactive';
    caption = 'Turn on to start alerting';
    fg = COLORS.off;
    tint = COLORS.card;
  }
  const captionColor = tint === COLORS.card ? COLORS.muted : fg;
  return (
    <View style={[s.hero, {backgroundColor: tint}]}>
      <View style={[s.heroDot, {backgroundColor: fg}]} />
      <View style={{flex: 1}}>
        <Text style={[s.heroTitle, {color: fg}]}>{title}</Text>
        <Text style={[s.heroCaption, {color: captionColor}]}>{caption}</Text>
      </View>
    </View>
  );
}

export function PlatformSelector(props: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <View style={s.segRow}>
      {PLATFORMS.map(p => {
        const active = p.value === props.value;
        return (
          <TouchableOpacity
            key={p.value}
            style={[s.seg, active && s.segActive]}
            onPress={() => props.onChange(p.value)}>
            <Text style={[s.segText, active && s.segTextActive]}>{p.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export function DayChips(props: {mask: number; onToggle: (day: number) => void}) {
  return (
    <View style={s.daysRow}>
      {DAY_LABELS.map((label, i) => {
        const on = (props.mask & (1 << i)) !== 0;
        return (
          <TouchableOpacity
            key={i}
            style={[s.dayChip, on && s.dayChipOn]}
            onPress={() => props.onToggle(i)}>
            <Text style={[s.dayChipText, on && s.dayChipTextOn]}>{label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export function HistoryList({data}: {data: HistoryEntry[]}) {
  if (data.length === 0) {
    return (
      <Text style={s.empty}>No events yet. Send a test or wait for a call.</Text>
    );
  }
  return (
    <FlatList
      scrollEnabled={false}
      data={data}
      keyExtractor={(_, i) => String(i)}
      ItemSeparatorComponent={() => <View style={s.sep} />}
      renderItem={({item}) => (
        <View style={s.histRow}>
          <View
            style={[
              s.histDot,
              {backgroundColor: item.success ? COLORS.on : COLORS.danger},
            ]}
          />
          <View style={{flex: 1}}>
            <Text style={s.histLabel}>
              {item.label?.length ? item.label : 'Number unavailable'}
            </Text>
            <Text style={s.histDetail}>
              {fmtTime(item.timestamp)} · {item.detail}
            </Text>
          </View>
        </View>
      )}
    />
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginBottom: 14,
  } as ViewStyle,
  cardLabel: {
    fontSize: 13,
    color: COLORS.muted,
    marginBottom: 8,
    fontWeight: '600',
  } as TextStyle,
  btn: {
    backgroundColor: COLORS.accent,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  btnDisabled: {backgroundColor: '#CFC9CF'},
  btnText: {color: COLORS.white, fontWeight: '700', fontSize: 15},
  btnOutline: {
    borderWidth: 1.5,
    borderColor: COLORS.accent,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  btnOutlineText: {color: COLORS.accent, fontWeight: '700', fontSize: 15},
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 18,
    marginBottom: 14,
  },
  heroDot: {width: 12, height: 12, borderRadius: 6, marginRight: 14},
  heroTitle: {fontSize: 22, fontWeight: '800'},
  heroCaption: {fontSize: 13, marginTop: 2, fontWeight: '500'},
  segRow: {flexDirection: 'row', flexWrap: 'wrap', gap: 8},
  seg: {
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.chipOff,
    borderRadius: 9,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  segActive: {backgroundColor: COLORS.accentTint, borderColor: COLORS.accent},
  segText: {fontSize: 13, color: COLORS.muted, fontWeight: '600'},
  segTextActive: {color: COLORS.accentDark},
  daysRow: {flexDirection: 'row', justifyContent: 'space-between', gap: 6},
  dayChip: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.chipOff,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayChipOn: {backgroundColor: COLORS.accent, borderColor: COLORS.accent},
  dayChipText: {fontSize: 13, color: COLORS.muted, fontWeight: '700'},
  dayChipTextOn: {color: COLORS.white},
  empty: {color: COLORS.muted, fontSize: 14, paddingVertical: 12},
  sep: {height: 1, backgroundColor: COLORS.border},
  histRow: {flexDirection: 'row', alignItems: 'center', paddingVertical: 10},
  histDot: {width: 9, height: 9, borderRadius: 5, marginRight: 12},
  histLabel: {fontSize: 15, color: COLORS.text, fontWeight: '600'},
  histDetail: {fontSize: 12, color: COLORS.muted, marginTop: 2},
});
