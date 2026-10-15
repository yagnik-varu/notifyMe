import React, {useCallback, useEffect, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  Linking,
  PermissionsAndroid,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {DateTimePickerAndroid} from '@react-native-community/datetimepicker';
import NotifyMe, {
  Battery,
  Config,
  HistoryEntry,
  OVERRIDE,
  Screening,
  Status,
  endOfToday,
} from './src/NotifyMe';
import {COLORS} from './src/theme';
import {
  Card,
  CardLabel,
  DayChips,
  HistoryList,
  OutlineButton,
  PlatformSelector,
  PrimaryButton,
  StatusHero,
  fmtMin,
} from './src/ui/widgets';

async function requestCallPermissions(): Promise<boolean> {
  const P = PermissionsAndroid.PERMISSIONS;
  const wanted = [P.READ_PHONE_STATE, P.READ_CALL_LOG, P.READ_CONTACTS];
  if (typeof Platform.Version === 'number' && Platform.Version >= 33) {
    wanted.push(P.POST_NOTIFICATIONS);
  }
  const res = await PermissionsAndroid.requestMultiple(wanted);
  const G = PermissionsAndroid.RESULTS.GRANTED;
  return (
    res[P.READ_PHONE_STATE] === G &&
    res[P.READ_CALL_LOG] === G &&
    res[P.READ_CONTACTS] === G
  );
}

export default function App() {
  const [cfg, setCfg] = useState<Config | null>(null);
  const [status, setStatus] = useState<Status | null>(null);
  const [screening, setScreening] = useState<Screening | null>(null);
  const [battery, setBattery] = useState<Battery | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [url, setUrl] = useState('');
  const [cliqUser, setCliqUser] = useState('');
  const [cliqToken, setCliqToken] = useState('');
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const [c, st, sc, bat, hist] = await Promise.all([
      NotifyMe.getConfig(),
      NotifyMe.getStatus(),
      NotifyMe.getScreening(),
      NotifyMe.getBatteryStatus(),
      NotifyMe.getHistory(),
    ]);
    setCfg(c);
    setUrl(c.url);
    setCliqUser(c.cliqUser);
    setCliqToken(c.cliqToken);
    setStatus(st);
    setScreening(sc);
    setBattery(bat);
    setHistory(hist);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    const sub = AppState.addEventListener('change', s => {
      if (s === 'active') refresh();
    });
    return () => sub.remove();
  }, [refresh]);

  // Re-read config/status/history without a full reload after a local mutation.
  const reread = useCallback(async () => {
    const [c, st, hist] = await Promise.all([
      NotifyMe.getConfig(),
      NotifyMe.getStatus(),
      NotifyMe.getHistory(),
    ]);
    setCfg(c);
    setStatus(st);
    setHistory(hist);
  }, []);

  if (loading || !cfg || !status) {
    return (
      <SafeAreaView style={[styles.screen, styles.center]}>
        <ActivityIndicator color={COLORS.accent} />
      </SafeAreaView>
    );
  }

  const isCliq = cfg.platform === 'cliq';
  const webhookDirty =
    url.trim() !== cfg.url ||
    cliqUser.trim() !== cfg.cliqUser ||
    cliqToken.trim() !== cfg.cliqToken;

  const saveWebhook = () => {
    const u = url.trim();
    NotifyMe.setWebhookUrl(u);
    const token = cliqToken.trim();
    NotifyMe.setCliqUser(cliqUser.trim());
    NotifyMe.setCliqToken(token);
    if (isCliq && u.length > 0 && !u.includes('/bots/')) {
      Alert.alert(
        'Saved — check the URL',
        'Use the bot endpoint from Cliq, e.g. https://cliq.zoho.com/api/v2/bots/<bot>/incoming.',
      );
    } else if (isCliq && token.length === 0 && !u.includes('zapikey=')) {
      Alert.alert('Saved — token missing', 'Add the webhook token from your Cliq bot.');
    } else {
      Alert.alert('Saved', 'Webhook settings saved.');
    }
    reread();
  };

  const onPlatform = (p: string) => {
    NotifyMe.setPlatform(p);
    setCfg({...cfg, platform: p});
  };

  const onMaster = async (value: boolean) => {
    if (value) {
      if (cfg.url.length === 0) {
        Alert.alert('Add a webhook first', 'Save your webhook URL before turning on.');
        return;
      }
      const granted = await requestCallPermissions();
      if (!granted) {
        Alert.alert(
          'Permissions needed',
          'Phone state, call log and contacts access are required to detect calls and read the caller. Enable them in Settings, then try again.',
          [
            {text: 'Cancel', style: 'cancel'},
            {text: 'Open settings', onPress: () => Linking.openSettings()},
          ],
        );
        return;
      }
    }
    NotifyMe.setMasterEnabled(value);
    reread();
  };

  const pickTime = (isStart: boolean) => {
    const cur = isStart ? cfg.startMin : cfg.endMin;
    const value = new Date();
    value.setHours(Math.floor(cur / 60), cur % 60, 0, 0);
    DateTimePickerAndroid.open({
      value,
      mode: 'time',
      is24Hour: true,
      onChange: (_e, date) => {
        if (!date) return;
        const v = date.getHours() * 60 + date.getMinutes();
        const start = isStart ? v : cfg.startMin;
        const end = isStart ? cfg.endMin : v;
        NotifyMe.setSchedule(start, end);
        setCfg({...cfg, startMin: start, endMin: end});
        reread();
      },
    });
  };

  const toggleDay = (day: number) => {
    const mask = cfg.daysMask ^ (1 << day);
    NotifyMe.setDaysMask(mask);
    setCfg({...cfg, daysMask: mask});
    reread();
  };

  const setOverride = (mode: string, label: string) => {
    NotifyMe.setOverride(mode, endOfToday());
    Alert.alert(label, `${label} until end of day.`);
    reread();
  };

  const clearOverride = () => {
    NotifyMe.clearOverride();
    reread();
  };

  const sendTest = () => {
    if (cfg.url.length === 0) {
      Alert.alert('Add a webhook first', 'Save your webhook URL before sending a test.');
      return;
    }
    NotifyMe.sendTest();
    Alert.alert('Test sent', 'Check your channel. History refreshes shortly.');
    setTimeout(reread, 1500);
  };

  const enableCallerId = async () => {
    const r = await NotifyMe.requestScreeningRole();
    const msg: Record<string, string> = {
      granted: 'Caller ID enabled.',
      denied: 'Not enabled — incoming alerts may lack the number.',
      held: 'Caller ID already enabled.',
      unsupported: 'Caller ID needs Android 10 or newer.',
      unavailable: 'Call screening unavailable on this device.',
    };
    Alert.alert('Caller ID', msg[r] ?? r);
    reread();
  };

  const clearHistory = () => {
    NotifyMe.clearHistory();
    setHistory([]);
  };

  const overrideLabel = status.overrideActive
    ? status.forced
      ? 'Forced on until end of day'
      : 'Paused until end of day'
    : 'No override — following schedule';

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Notify-Me</Text>
        <Text style={styles.subtitle}>
          Posts to your channel when your phone rings.
        </Text>

        <StatusHero status={status} />

        {/* Master */}
        <Card>
          <View style={styles.rowBetween}>
            <View>
              <CardLabel>Notifications</CardLabel>
              <Text
                style={[
                  styles.bigState,
                  {color: cfg.masterEnabled ? COLORS.on : COLORS.off},
                ]}>
                {cfg.masterEnabled ? 'On' : 'Off'}
              </Text>
            </View>
            <Switch
              value={cfg.masterEnabled}
              onValueChange={onMaster}
              trackColor={{true: COLORS.accent, false: '#CFC9CF'}}
              thumbColor={COLORS.white}
            />
          </View>
        </Card>

        {/* Webhook + platform */}
        <Card>
          <CardLabel>Webhook URL</CardLabel>
          <TextInput
            style={styles.input}
            value={url}
            onChangeText={setUrl}
            placeholder={PLACEHOLDERS[cfg.platform] ?? PLACEHOLDERS.slack}
            placeholderTextColor={COLORS.muted}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            multiline
          />
          <CardLabel>Destination</CardLabel>
          <PlatformSelector value={cfg.platform} onChange={onPlatform} />
          {isCliq && (
            <>
              <View style={{height: 12}} />
              <CardLabel>Webhook token</CardLabel>
              <TextInput
                style={styles.input}
                value={cliqToken}
                onChangeText={setCliqToken}
                placeholder="Token from your Cliq bot"
                placeholderTextColor={COLORS.muted}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <CardLabel>Cliq user email</CardLabel>
              <TextInput
                style={styles.input}
                value={cliqUser}
                onChangeText={setCliqUser}
                placeholder="you@company.com"
                placeholderTextColor={COLORS.muted}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
              />
              <Text style={styles.hint}>
                Alerts go to this user's chat with your bot (optional). The bot needs the
                Notify-Me incoming webhook handler — see README.
              </Text>
            </>
          )}
          <View style={{height: 12}} />
          <PrimaryButton title="Save" onPress={saveWebhook} disabled={!webhookDirty} />
        </Card>

        {/* Schedule */}
        <Card>
          <CardLabel>Office hours</CardLabel>
          <View style={styles.rowBetween}>
            <TouchableOpacity style={styles.timeBtn} onPress={() => pickTime(true)}>
              <Text style={styles.timeBtnText}>Start {fmtMin(cfg.startMin)}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.timeBtn} onPress={() => pickTime(false)}>
              <Text style={styles.timeBtnText}>End {fmtMin(cfg.endMin)}</Text>
            </TouchableOpacity>
          </View>
          <View style={{height: 12}} />
          <DayChips mask={cfg.daysMask} onToggle={toggleDay} />
        </Card>

        {/* Override */}
        <Card>
          <CardLabel>Quick override</CardLabel>
          <View style={styles.overrideRow}>
            <TouchableOpacity
              style={[styles.ovBtn, {borderColor: COLORS.on}]}
              onPress={() => setOverride(OVERRIDE.FORCE_ON, 'Forced on')}>
              <Text style={[styles.ovText, {color: COLORS.on}]}>Force on</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.ovBtn, {borderColor: COLORS.amber}]}
              onPress={() => setOverride(OVERRIDE.PAUSE, 'Paused')}>
              <Text style={[styles.ovText, {color: COLORS.amber}]}>Pause now</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.ovBtn, {borderColor: COLORS.muted}]}
              onPress={clearOverride}>
              <Text style={[styles.ovText, {color: COLORS.muted}]}>Clear</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.ovStatus}>{overrideLabel}</Text>
        </Card>

        {/* Caller ID */}
        <Card>
          <CardLabel>Caller ID</CardLabel>
          <Text style={styles.callerText}>
            {screening?.held
              ? 'On — incoming alerts will show the caller’s number.'
              : screening?.supported
              ? 'Off — incoming alerts may show “number unavailable”.'
              : 'Needs Android 10+ — using call-log fallback.'}
          </Text>
          {!screening?.held && screening?.supported && (
            <>
              <View style={{height: 10}} />
              <OutlineButton title="Enable caller ID" onPress={enableCallerId} />
            </>
          )}
        </Card>

        {/* Test */}
        <OutlineButton title="Send test message" onPress={sendTest} />
        <View style={{height: 18}} />

        {/* Reliability */}
        <Card>
          <CardLabel>Reliability</CardLabel>
          <Text
            style={[
              styles.batteryState,
              {color: battery?.exempt ? COLORS.on : COLORS.amber},
            ]}>
            {battery?.exempt
              ? 'Battery optimization: exempt ✓'
              : 'Battery optimization: not exempt — alerts can be missed when the app is closed.'}
          </Text>
          {!battery?.exempt && (
            <>
              <View style={{height: 10}} />
              <OutlineButton
                title="Disable battery optimization"
                onPress={() => NotifyMe.requestBatteryExemption()}
              />
            </>
          )}
          <Text style={styles.noteText}>
            On Samsung / Xiaomi / Oppo / OnePlus, also enable Autostart in app settings.
          </Text>
          <TouchableOpacity onPress={() => Linking.openSettings()}>
            <Text style={styles.link}>Open app settings</Text>
          </TouchableOpacity>
        </Card>
        <View style={{height: 18}} />

        {/* History */}
        <View style={styles.rowBetween}>
          <Text style={styles.sectionTitle}>Recent</Text>
          {history.length > 0 && (
            <TouchableOpacity onPress={clearHistory}>
              <Text style={styles.clear}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>
        <HistoryList data={history} />
      </ScrollView>
    </SafeAreaView>
  );
}

// Example URL per destination, shown in the empty webhook field.
const PLACEHOLDERS: Record<string, string> = {
  slack: 'https://hooks.slack.com/services/...',
  discord: 'https://discord.com/api/webhooks/...',
  teams: 'https://<tenant>.webhook.office.com/...',
  cliq: 'https://cliq.zoho.com/api/v2/bots/<bot>/incoming',
  generic: 'https://example.com/webhook',
};

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: COLORS.bg},
  center: {alignItems: 'center', justifyContent: 'center'},
  content: {padding: 20, paddingBottom: 48},
  title: {fontSize: 28, fontWeight: '800', color: COLORS.text, marginTop: 8},
  subtitle: {fontSize: 15, color: COLORS.muted, marginTop: 4, marginBottom: 20},
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bigState: {fontSize: 20, fontWeight: '700'},
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.text,
    minHeight: 44,
    marginBottom: 14,
  },
  timeBtn: {
    flex: 1,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.chipOff,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  timeBtnText: {color: COLORS.accentDark, fontWeight: '700', fontSize: 14},
  overrideRow: {flexDirection: 'row', gap: 8},
  ovBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  ovText: {fontWeight: '700', fontSize: 13},
  ovStatus: {marginTop: 10, fontSize: 12, color: COLORS.muted},
  callerText: {fontSize: 13, color: COLORS.muted, lineHeight: 19},
  batteryState: {fontSize: 13, fontWeight: '600', lineHeight: 19},
  noteText: {fontSize: 13, color: COLORS.muted, lineHeight: 19, marginTop: 10},
  hint: {fontSize: 12, color: COLORS.muted, lineHeight: 17, marginTop: -8},
  link: {color: COLORS.accent, fontWeight: '600', marginTop: 6, fontSize: 13},
  sectionTitle: {fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: 8},
  clear: {color: COLORS.danger, fontWeight: '600', fontSize: 13},
});
