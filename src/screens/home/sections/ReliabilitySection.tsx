/**
 * "Reliability" card: the Android settings that decide whether alerts arrive
 * when the app is closed and whether they include the caller's number.
 *
 *  - Caller numbers: the "call screening" role (Android 10+). Without it the
 *    number must come from the call log, which some phones write late.
 *  - Background running: battery-optimization exemption, so Android doesn't
 *    freeze the app and miss the "phone is ringing" broadcast.
 *  - App settings: shortcut for OEM extras like "Autostart" (Xiaomi, Samsung…).
 *
 * Background reading: docs/08-android-engine.md.
 */
import React from 'react';
import {Linking, StyleSheet} from 'react-native';
import {BatteryCharging, ChevronRight, IdCard, Settings} from 'lucide-react-native';
import {Battery, Screening} from '../../../native';
import {Palette, SPACE, useStyles} from '../../../theme';
import {Button, Card, Pill, SectionHeader, SettingRow} from '../../../ui';

export function ReliabilitySection(props: {
  screening: Screening | null;
  battery: Battery | null;
  onEnableCallerId: () => void;
  onAllowBattery: () => void;
}) {
  const [s, c] = useStyles(styles);
  const {screening, battery} = props;
  return (
    <>
      <SectionHeader title="Reliability" />
      <Card style={s.listCard}>
        <SettingRow
          icon={IdCard}
          tone={screening?.held ? 'success' : screening?.supported ? 'warning' : 'neutral'}
          title="Caller numbers"
          subtitle={
            screening?.held
              ? "Alerts include the caller's number."
              : screening?.supported
              ? 'Without this, some alerts say “number unavailable”.'
              : 'Needs Android 10+. Using call history instead.'
          }
          right={
            screening?.held ? (
              <Pill text="On" tone="success" />
            ) : screening?.supported ? (
              <Button title="Allow" compact onPress={props.onEnableCallerId} />
            ) : (
              <Pill text="N/A" tone="neutral" a11yLabel="Not available" />
            )
          }
        />
        <SettingRow
          icon={BatteryCharging}
          tone={battery?.exempt ? 'success' : 'warning'}
          title="Background running"
          subtitle={
            battery?.exempt
              ? "Android won't pause Notify-Me."
              : 'Android may stop alerts when the app is closed.'
          }
          right={
            battery?.exempt ? (
              <Pill text="Allowed" tone="success" />
            ) : (
              <Button title="Allow" compact onPress={props.onAllowBattery} />
            )
          }
        />
        <SettingRow
          icon={Settings}
          tone="neutral"
          title="App settings"
          subtitle="On Samsung, Xiaomi, Oppo or OnePlus, also turn on Autostart."
          right={<ChevronRight color={c.faint} size={22} strokeWidth={2.2} />}
          // Opens this app's page in Android Settings.
          onPress={() => Linking.openSettings()}
          last
        />
      </Card>
    </>
  );
}

const styles = (_c: Palette) =>
  StyleSheet.create({
    listCard: {paddingVertical: SPACE.xs},
  });
