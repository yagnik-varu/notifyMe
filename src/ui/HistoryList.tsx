/**
 * The Activity list: one row per delivered/failed alert, newest first, or an
 * empty-state card when there's nothing yet.
 */
import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {FlaskConical, Inbox, LucideIcon, PhoneIncoming, PhoneMissed} from 'lucide-react-native';
import {HistoryKind, friendlyDetail, historyKind, relativeTime} from '../domain/history';
import {HistoryEntry} from '../native/types';
import {Palette, SPACE, useStyles} from '../theme';
import {Card} from './Card';
import {IconBadge} from './IconBadge';
import {Pill} from './Pill';
import {Tone} from './tone';

const KIND_META: Record<HistoryKind, {icon: LucideIcon; tone: Tone; name: string}> = {
  incoming: {icon: PhoneIncoming, tone: 'success', name: 'Incoming call'},
  missed: {icon: PhoneMissed, tone: 'danger', name: 'Missed call'},
  test: {icon: FlaskConical, tone: 'accent', name: 'Test message'},
};

export function HistoryList({data, limit}: {data: HistoryEntry[]; /** Max rows to show. */ limit: number}) {
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
        const kind = historyKind(item);
        const meta = KIND_META[kind];
        const title =
          kind === 'test' ? 'Test message' : item.label?.length ? item.label : 'Unknown number';
        const when = relativeTime(item.timestamp);
        const outcome = item.success
          ? 'sent'
          : `failed: ${friendlyDetail(item.detail, false)}`;
        return (
          <View
            // Rows have no id; timestamp + position is unique enough for React's list diffing.
            key={`${item.timestamp}-${i}`}
            style={[s.histRow, i < rows.length - 1 && s.divider]}
            // `accessible` merges the row into one element read as a single sentence.
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

const styles = (c: Palette) =>
  StyleSheet.create({
    flex: {flex: 1},
    listCard: {paddingVertical: SPACE.xs},
    histRow: {flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 13},
    divider: {borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border},
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
  });
