/**
 * "Finish setting up" card: a progress bar and a list of steps, each with a
 * button. The first unfinished step gets the filled (primary) button.
 * The steps themselves come from buildSetupSteps() in src/screens/home/.
 */
import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {Check} from 'lucide-react-native';
import {Palette, RADIUS, SPACE, useStyles} from '../theme';
import {Button} from './Button';
import {Card} from './Card';

export interface SetupStep {
  /** Stable React key. */
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

const styles = (c: Palette) =>
  StyleSheet.create({
    flex: {flex: 1},
    rowBetween: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
    cardTitle: {fontSize: 17, fontWeight: '700', color: c.text, letterSpacing: -0.2},
    cardSubtitle: {fontSize: 13, color: c.muted, marginTop: 2},
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
  });
