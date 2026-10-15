/**
 * "Office hours" card: start/end time, office days, and the "Today" override
 * (Schedule / Always on / Pause).
 *
 * This section owns the time-picker dialog; saving is left to the callbacks.
 */
import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {DateTimePickerAndroid} from '@react-native-community/datetimepicker';
import {ArrowRight} from 'lucide-react-native';
import {fmtMin, scheduleSummary} from '../../../domain/schedule';
import {Config, Status} from '../../../native';
import {Palette, SPACE, useStyles} from '../../../theme';
import {Card, DayChips, SectionHeader, Segmented, TimeTile} from '../../../ui';

/** The three positions of the "Today" control. */
export type OverrideChoice = 'schedule' | 'force' | 'pause';

/** Which "Today" option is currently in effect, from the live status. */
export function overrideChoiceOf(status: Status): OverrideChoice {
  if (!status.overrideActive) return 'schedule';
  return status.forced ? 'force' : 'pause';
}

const OVERRIDE_CAPTION: Record<OverrideChoice, string> = {
  schedule: 'Following your office hours.',
  force: 'Posting every call until midnight, whatever the time.',
  pause: 'Muted until midnight, even during office hours.',
};

export function ScheduleSection(props: {
  cfg: Config;
  overrideChoice: OverrideChoice;
  /** New office hours, minutes since midnight. */
  onScheduleChange: (startMin: number, endMin: number) => void;
  /** Day index tapped (0 = Sunday). */
  onToggleDay: (day: number) => void;
  onOverride: (choice: OverrideChoice) => void;
}) {
  const [s, c] = useStyles(styles);
  const {cfg} = props;
  const summary = scheduleSummary(cfg.startMin, cfg.endMin, cfg.daysMask);

  // Opens Android's native clock dialog (an imperative API, not a component).
  const pickTime = (isStart: boolean) => {
    const cur = isStart ? cfg.startMin : cfg.endMin;
    const value = new Date();
    value.setHours(Math.floor(cur / 60), cur % 60, 0, 0);
    DateTimePickerAndroid.open({
      value,
      mode: 'time',
      is24Hour: true,
      onChange: (_e, date) => {
        if (!date) return; // dismissed
        const v = date.getHours() * 60 + date.getMinutes();
        props.onScheduleChange(isStart ? v : cfg.startMin, isStart ? cfg.endMin : v);
      },
    });
  };

  return (
    <>
      <SectionHeader title="Office hours" />
      <Card>
        <View style={s.timeRow}>
          <TimeTile
            label="FROM"
            a11yName="Start time"
            value={fmtMin(cfg.startMin)}
            onPress={() => pickTime(true)}
          />
          <ArrowRight color={c.faint} size={20} strokeWidth={2.4} />
          <TimeTile
            label="UNTIL"
            a11yName="End time"
            value={fmtMin(cfg.endMin)}
            onPress={() => pickTime(false)}
          />
        </View>
        <DayChips mask={cfg.daysMask} onToggle={props.onToggleDay} />
        <Text style={[s.summary, summary.isProblem && {color: c.warning}]}>{summary.text}</Text>

        <View style={s.divider} />

        <Text style={s.label}>Today</Text>
        <Segmented<OverrideChoice>
          label="Today"
          value={props.overrideChoice}
          onChange={props.onOverride}
          options={[
            {value: 'schedule', label: 'Schedule', tone: 'accent'},
            {value: 'force', label: 'Always on', tone: 'success'},
            {value: 'pause', label: 'Pause', tone: 'warning'},
          ]}
        />
        <Text style={s.summary}>{OVERRIDE_CAPTION[props.overrideChoice]}</Text>
      </Card>
    </>
  );
}

const styles = (c: Palette) =>
  StyleSheet.create({
    timeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACE.sm,
      marginBottom: SPACE.lg,
    },
    summary: {fontSize: 13, color: c.muted, marginTop: SPACE.md, lineHeight: 18},
    divider: {height: StyleSheet.hairlineWidth, backgroundColor: c.border, marginVertical: SPACE.lg},
    label: {fontSize: 14, fontWeight: '600', color: c.text, marginBottom: SPACE.sm},
  });
