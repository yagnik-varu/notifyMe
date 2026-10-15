import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  KeyboardAvoidingView,
  Linking,
  PermissionsAndroid,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {SafeAreaProvider, useSafeAreaInsets} from 'react-native-safe-area-context';
import {DateTimePickerAndroid} from '@react-native-community/datetimepicker';
import {
  ArrowRight,
  BatteryCharging,
  BellOff,
  CalendarClock,
  ChevronRight,
  Clock,
  IdCard,
  LucideIcon,
  Moon,
  Pause,
  Phone,
  PhoneCall,
  Plug,
  Send,
  Settings,
  TriangleAlert,
} from 'lucide-react-native';
import NotifyMe, {
  Battery,
  Config,
  HistoryEntry,
  OVERRIDE,
  Screening,
  Status,
  endOfToday,
  platformInfo,
} from './src/NotifyMe';
import {Palette, SPACE, useStyles} from './src/theme';
import {
  daysSummary,
  fmtMin,
  friendlyDetail,
  nextWindowStart,
  windowLength,
} from './src/format';
import {
  BRAND_GRADIENT,
  Banner,
  Button,
  Card,
  DayChips,
  Field,
  GradientFill,
  HistoryList,
  IconBadge,
  Pill,
  PlatformPicker,
  SectionHeader,
  Segmented,
  SettingRow,
  SetupChecklist,
  SetupStep,
  StatusHero,
  TimeTile,
  Tone,
  useToast,
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

const wait = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

type TestState =
  | {phase: 'idle'}
  | {phase: 'sending'}
  | {phase: 'ok'; detail: string}
  | {phase: 'fail'; detail: string}
  | {phase: 'slow'};

type OverrideChoice = 'schedule' | 'force' | 'pause';

const HISTORY_PREVIEW = 6;

export default function App() {
  return (
    <SafeAreaProvider>
      <Main />
    </SafeAreaProvider>
  );
}

function Main() {
  const [s, c] = useStyles(styles);
  const insets = useSafeAreaInsets();
  const [toast, showToast] = useToast();
  const scrollRef = useRef<ScrollView>(null);
  const destinationY = useRef(0);
  const testRun = useRef(0);

  const [cfg, setCfg] = useState<Config | null>(null);
  const [status, setStatus] = useState<Status | null>(null);
  const [screening, setScreening] = useState<Screening | null>(null);
  const [battery, setBattery] = useState<Battery | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [url, setUrl] = useState('');
  const [cliqUser, setCliqUser] = useState('');
  const [cliqToken, setCliqToken] = useState('');
  const [loadError, setLoadError] = useState(false);
  const [test, setTest] = useState<TestState>({phase: 'idle'});
  const [showAll, setShowAll] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [conf, st, sc, bat, hist] = await Promise.all([
        NotifyMe.getConfig(),
        NotifyMe.getStatus(),
        NotifyMe.getScreening(),
        NotifyMe.getBatteryStatus(),
        NotifyMe.getHistory(),
      ]);
      setCfg(conf);
      setUrl(conf.url);
      setCliqUser(conf.cliqUser);
      setCliqToken(conf.cliqToken);
      setStatus(st);
      setScreening(sc);
      setBattery(bat);
      setHistory(hist);
      setLoadError(false);
    } catch {
      setLoadError(true);
    }
  }, []);

  useEffect(() => {
    refresh();
    const sub = AppState.addEventListener('change', st => {
      if (st === 'active') refresh();
    });
    const run = testRun;
    return () => {
      sub.remove();
      run.current++; // cancels any test poll in flight
    };
  }, [refresh]);

  // Re-read config/status/history without touching unsaved form fields.
  const reread = useCallback(async () => {
    const [conf, st, hist] = await Promise.all([
      NotifyMe.getConfig(),
      NotifyMe.getStatus(),
      NotifyMe.getHistory(),
    ]);
    setCfg(conf);
    setStatus(st);
    setHistory(hist);
  }, []);

  const statusBar = (
    <StatusBar barStyle={c.statusBar} backgroundColor="transparent" translucent />
  );

  if (loadError) {
    return (
      <View style={[s.screen, s.center, {paddingTop: insets.top}]}>
        {statusBar}
        <IconBadge icon={TriangleAlert} tone="warning" size={64} />
        <Text style={s.loadTitle}>Couldn't load your settings</Text>
        <Text style={s.loadText}>Something went wrong starting Notify-Me.</Text>
        <Button title="Try again" onPress={refresh} style={s.loadButton} />
      </View>
    );
  }

  if (!cfg || !status) {
    return (
      <View style={[s.screen, s.center]}>
        {statusBar}
        <ActivityIndicator color={c.accent} size="large" />
      </View>
    );
  }

  // ---- Derived state ----

  const platform = platformInfo(cfg.platform);
  const isCliq = cfg.platform === 'cliq';
  const hasDestination = cfg.url.length > 0;
  const urlTrim = url.trim();

  const urlError =
    urlTrim.length > 0 && !/^https:\/\/\S+$/i.test(urlTrim)
      ? urlTrim.toLowerCase().startsWith('http://')
        ? 'Use a secure link that starts with https://'
        : 'Enter the full link, starting with https://'
      : null;
  const urlWarning =
    isCliq && urlTrim.length > 0 && !urlError && !urlTrim.includes('/bots/')
      ? "This doesn't look like a Cliq bot endpoint (…/api/v2/bots/<bot>/incoming)."
      : null;
  const tokenWarning =
    isCliq && urlTrim.length > 0 && !cliqToken.trim() && !urlTrim.includes('zapikey=')
      ? 'Needed to post to your bot. Copy it from the bot page in Cliq.'
      : null;
  const emailError =
    cliqUser.trim().length > 0 && !/^\S+@\S+\.\S+$/.test(cliqUser.trim())
      ? 'Enter a valid email, or leave it empty.'
      : null;

  const dirty =
    urlTrim !== cfg.url ||
    cliqUser.trim() !== cfg.cliqUser ||
    cliqToken.trim() !== cfg.cliqToken;
  const formValid = !urlError && !(isCliq && emailError);

  // ---- Actions ----

  const scrollToDestination = () =>
    scrollRef.current?.scrollTo({y: Math.max(destinationY.current - 12, 0), animated: true});

  const persistDestination = () => {
    NotifyMe.setWebhookUrl(urlTrim);
    NotifyMe.setCliqUser(cliqUser.trim());
    NotifyMe.setCliqToken(cliqToken.trim());
  };

  const saveDestination = async () => {
    persistDestination();
    setTest({phase: 'idle'});
    NotifyMe.haptic('confirm');
    showToast(urlTrim ? 'Destination saved' : 'Destination removed');
    await reread();
  };

  const onPlatform = (p: string) => {
    NotifyMe.haptic('tick');
    NotifyMe.setPlatform(p);
    setCfg({...cfg, platform: p});
    setTest({phase: 'idle'});
  };

  const onMaster = async (value: boolean) => {
    if (value) {
      if (!hasDestination) {
        showToast('Add a destination first', 'warning');
        scrollToDestination();
        return;
      }
      const granted = await requestCallPermissions();
      if (!granted) {
        Alert.alert(
          'Phone access needed',
          'Notify-Me needs phone, call log and contacts access to notice calls and show who is calling. You can allow it in Settings.',
          [
            {text: 'Not now', style: 'cancel'},
            {text: 'Open Settings', onPress: () => Linking.openSettings()},
          ],
        );
        return;
      }
    }
    NotifyMe.setMasterEnabled(value);
    showToast(value ? 'Alerts turned on' : 'Alerts turned off', value ? 'success' : 'neutral');
    reread();
  };

  // Send a test and watch history for its outcome, so the result shows right here.
  const runTest = async () => {
    if (!urlTrim) {
      showToast('Add a destination first', 'warning');
      scrollToDestination();
      return;
    }
    if (!formValid) {
      showToast('Fix the highlighted field first', 'danger');
      scrollToDestination();
      return;
    }
    if (dirty) {
      persistDestination();
      await reread();
    }
    const id = ++testRun.current;
    const since = Date.now() - 1500;
    setTest({phase: 'sending'});
    NotifyMe.sendTest();
    for (let i = 0; i < 16; i++) {
      await wait(1500);
      if (testRun.current !== id) return;
      const hist = await NotifyMe.getHistory();
      const hit = hist.find(
        e => (e.kind === 'test' || e.label === 'Test') && e.timestamp >= since,
      );
      if (hit) {
        setHistory(hist);
        NotifyMe.haptic(hit.success ? 'confirm' : 'reject');
        setTest(
          hit.success
            ? {phase: 'ok', detail: hit.detail}
            : {phase: 'fail', detail: friendlyDetail(hit.detail, false)},
        );
        return;
      }
    }
    if (testRun.current === id) setTest({phase: 'slow'});
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
    NotifyMe.haptic('tick');
    const mask = cfg.daysMask ^ (1 << day);
    NotifyMe.setDaysMask(mask);
    setCfg({...cfg, daysMask: mask});
    reread();
  };

  const overrideChoice: OverrideChoice = !status.overrideActive
    ? 'schedule'
    : status.forced
    ? 'force'
    : 'pause';

  const onOverride = (choice: OverrideChoice) => {
    if (choice === overrideChoice) return;
    NotifyMe.haptic('tick');
    if (choice === 'schedule') {
      NotifyMe.clearOverride();
      showToast('Back to your office hours', 'neutral');
    } else if (choice === 'force') {
      NotifyMe.setOverride(OVERRIDE.FORCE_ON, endOfToday());
      showToast('Every call is posted until midnight');
    } else {
      NotifyMe.setOverride(OVERRIDE.PAUSE, endOfToday());
      showToast('Paused until midnight', 'warning');
    }
    reread();
  };

  const enableCallerId = async () => {
    const r = await NotifyMe.requestScreeningRole();
    const msg: Record<string, [string, Tone]> = {
      granted: ['Caller numbers turned on', 'success'],
      held: ['Caller numbers already on', 'success'],
      denied: ['Caller numbers stay off', 'warning'],
      unsupported: ['Needs Android 10 or newer', 'warning'],
      unavailable: ["This phone doesn't support it", 'warning'],
    };
    const [text, tone] = msg[r] ?? ['Something went wrong', 'danger'];
    showToast(text, tone);
    refresh();
  };

  // Clear right away and offer Undo (snackbar pattern) instead of a blocking dialog.
  const clearHistory = () => {
    const cleared = history;
    NotifyMe.clearHistory();
    setHistory([]);
    setShowAll(false);
    showToast('Activity cleared', 'neutral', {
      label: 'Undo',
      onPress: async () => {
        NotifyMe.restoreHistory(cleared);
        NotifyMe.haptic('confirm');
        setHistory(await NotifyMe.getHistory());
      },
    });
  };

  const onPullRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  // ---- Hero ----

  const next = nextWindowStart(cfg.startMin, cfg.endMin, cfg.daysMask);
  let hero: {tone: Tone; icon: LucideIcon; title: string; caption: string; live: boolean};
  if (!hasDestination) {
    hero = {
      tone: 'neutral',
      icon: Plug,
      title: "Let's get you set up",
      caption: 'Choose where call alerts should be posted.',
      live: false,
    };
  } else if (status.state === 'paused') {
    hero = {
      tone: 'warning',
      icon: Pause,
      title: 'Paused for today',
      caption: "Calls won't be posted until midnight.",
      live: false,
    };
  } else if (status.state === 'active') {
    hero = {
      tone: 'success',
      icon: PhoneCall,
      title: status.forced ? 'On for the rest of today' : 'Watching for calls',
      caption: status.forced
        ? `Every call goes to ${platform.label}, office hours ignored.`
        : `Incoming and missed calls go to ${platform.label}.`,
      live: true,
    };
  } else if (cfg.masterEnabled) {
    hero = {
      tone: 'accent',
      icon: Moon,
      title: 'Outside office hours',
      caption: next ? `Alerts resume ${next}.` : 'Pick office days below to start alerting.',
      live: false,
    };
  } else {
    hero = {
      tone: 'neutral',
      icon: BellOff,
      title: 'Alerts are off',
      caption: `Turn on to post your calls to ${platform.label}.`,
      live: false,
    };
  }
  const heroChips = hasDestination
    ? [
        {icon: Send, text: platform.label},
        {icon: Clock, text: `${fmtMin(cfg.startMin)}–${fmtMin(cfg.endMin)}`},
        {icon: CalendarClock, text: daysSummary(cfg.daysMask)},
      ]
    : [];

  // ---- Setup checklist ----

  const steps: SetupStep[] = [
    {
      key: 'destination',
      title: 'Choose a destination',
      subtitle: 'Where your call alerts get posted.',
      done: hasDestination,
      action: {label: 'Set up', onPress: scrollToDestination},
    },
    {
      key: 'test',
      title: 'Send a test message',
      subtitle: 'Check that messages arrive.',
      done: history.some(e => e.success),
      action: {label: 'Send', onPress: runTest},
    },
    {
      key: 'on',
      title: 'Turn on alerts',
      subtitle: 'Allow phone access so calls can be noticed.',
      done: cfg.masterEnabled,
      action: {label: 'Turn on', onPress: () => onMaster(true)},
    },
  ];
  if (screening?.supported) {
    steps.push({
      key: 'callerid',
      title: 'Show caller numbers',
      subtitle: "Lets alerts include who's calling.",
      done: screening.held,
      action: {label: 'Allow', onPress: enableCallerId},
    });
  }
  steps.push({
    key: 'battery',
    title: 'Keep running in the background',
    subtitle: 'Stops Android from pausing alerts.',
    done: !!battery?.exempt,
    action: {label: 'Allow', onPress: () => NotifyMe.requestBatteryExemption()},
  });
  const setupDone = steps.every(x => x.done);

  // ---- Test banner ----

  let banner: React.ReactNode = null;
  if (test.phase === 'sending') {
    banner = <Banner tone="accent" loading title="Sending test message…" message={`To ${platform.label}`} />;
  } else if (test.phase === 'ok') {
    banner = (
      <Banner
        tone="success"
        title="Test delivered"
        message={
          isCliq
            ? 'Open your bot chat in Zoho Cliq — the test card should be there.'
            : `Check ${platform.label} — the test message should be there.`
        }
      />
    );
  } else if (test.phase === 'fail') {
    banner = <Banner tone="danger" title="Test didn't go through" message={test.detail} />;
  } else if (test.phase === 'slow') {
    banner = (
      <Banner
        tone="warning"
        title="Still trying"
        message="No answer yet. Notify-Me keeps retrying in the background — check Activity below."
      />
    );
  }

  // ---- Schedule summary ----

  const windowEmpty = cfg.startMin === cfg.endMin;
  const overnight = cfg.endMin < cfg.startMin;
  const scheduleSummary = windowEmpty
    ? 'Start and end are the same, so alerts never run. Pick different times.'
    : cfg.daysMask === 0
    ? 'No days selected, so alerts never run.'
    : `${daysSummary(cfg.daysMask)} · ${windowLength(cfg.startMin, cfg.endMin)} a day${
        overnight ? ' (overnight)' : ''
      }`;

  const overrideCaption: Record<OverrideChoice, string> = {
    schedule: 'Following your office hours.',
    force: 'Posting every call until midnight, whatever the time.',
    pause: 'Muted until midnight, even during office hours.',
  };

  const visibleHistory = showAll ? history.length : HISTORY_PREVIEW;

  return (
    <KeyboardAvoidingView
      style={[s.screen, {paddingTop: insets.top}]}
      // adjustResize stops resizing under Android 15+ edge-to-edge; pad for the keyboard there.
      behavior={typeof Platform.Version === 'number' && Platform.Version >= 35 ? 'height' : undefined}>
      {statusBar}
      <ScrollView
        ref={scrollRef}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onPullRefresh}
            colors={[c.accent]}
            progressBackgroundColor={c.surface}
          />
        }
        contentContainerStyle={[
          s.content,
          {paddingTop: SPACE.lg, paddingBottom: insets.bottom + 48},
        ]}>
        {/* Header */}
        <View style={s.header}>
          <View style={s.logo} importantForAccessibility="no-hide-descendants">
            <GradientFill colors={BRAND_GRADIENT} id="logo" />
            <Phone color="#FFFFFF" size={24} strokeWidth={2.4} />
          </View>
          <View style={s.flex}>
            <Text style={s.title} accessibilityRole="header">
              Notify-Me
            </Text>
            <Text style={s.subtitle}>Call alerts for your team chat</Text>
          </View>
        </View>

        <StatusHero
          {...hero}
          enabled={cfg.masterEnabled}
          onToggle={onMaster}
          chips={heroChips}
        />

        {!setupDone && <SetupChecklist steps={steps} />}

        {/* Destination */}
        <View onLayout={e => (destinationY.current = e.nativeEvent.layout.y)}>
          <SectionHeader title="Destination" />
          <Card>
            <PlatformPicker value={cfg.platform} onChange={onPlatform} />
            <Field
              label={isCliq ? 'Bot endpoint URL' : 'Webhook URL'}
              value={url}
              onChangeText={setUrl}
              placeholder={platform.placeholder}
              keyboardType="url"
              multiline
              error={urlError}
              warning={urlWarning}
              helper={
                isCliq
                  ? "Shown on your bot's page in Cliq. Company domains work too."
                  : `Paste the incoming webhook link from ${platform.label}.`
              }
            />
            {isCliq && (
              <>
                <Field
                  label="Webhook token"
                  value={cliqToken}
                  onChangeText={setCliqToken}
                  placeholder="Paste the token from your bot"
                  secret
                  warning={tokenWarning}
                  helper="Kept on this phone and sent only to Cliq."
                />
                <Field
                  label="Your Cliq email (optional)"
                  value={cliqUser}
                  onChangeText={setCliqUser}
                  placeholder="you@company.com"
                  keyboardType="email-address"
                  error={emailError}
                  helper="Alerts go only to this person's chat with the bot."
                />
                <View style={s.note}>
                  <Text style={s.noteText}>
                    Your bot needs the Notify-Me incoming webhook handler. It's in the
                    project's docs folder, ready to paste.
                  </Text>
                </View>
              </>
            )}
            <View style={s.buttonRow}>
              <Button
                title={dirty ? 'Save changes' : hasDestination ? '✓ Saved' : 'Save'}
                onPress={saveDestination}
                disabled={!dirty || !formValid}
                style={s.flex}
              />
              <Button
                title="Send test"
                icon={Send}
                variant="secondary"
                onPress={runTest}
                loading={test.phase === 'sending'}
                disabled={!urlTrim}
                style={s.flex}
              />
            </View>
            {banner}
          </Card>
        </View>

        {/* Schedule */}
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
          <DayChips mask={cfg.daysMask} onToggle={toggleDay} />
          <Text
            style={[
              s.summary,
              (windowEmpty || cfg.daysMask === 0) && {color: c.warning},
            ]}>
            {scheduleSummary}
          </Text>

          <View style={s.divider} />

          <Text style={s.label}>Today</Text>
          <Segmented<OverrideChoice>
            label="Today"
            value={overrideChoice}
            onChange={onOverride}
            options={[
              {value: 'schedule', label: 'Schedule', tone: 'accent'},
              {value: 'force', label: 'Always on', tone: 'success'},
              {value: 'pause', label: 'Pause', tone: 'warning'},
            ]}
          />
          <Text style={s.summary}>{overrideCaption[overrideChoice]}</Text>
        </Card>

        {/* Reliability */}
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
                ? "Without this, some alerts say “number unavailable”."
                : 'Needs Android 10+. Using call history instead.'
            }
            right={
              screening?.held ? (
                <Pill text="On" tone="success" />
              ) : screening?.supported ? (
                <Button title="Allow" compact onPress={enableCallerId} />
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
                <Button
                  title="Allow"
                  compact
                  onPress={() => NotifyMe.requestBatteryExemption()}
                />
              )
            }
          />
          <SettingRow
            icon={Settings}
            tone="neutral"
            title="App settings"
            subtitle="On Samsung, Xiaomi, Oppo or OnePlus, also turn on Autostart."
            right={<ChevronRight color={c.faint} size={22} strokeWidth={2.2} />}
            onPress={() => Linking.openSettings()}
            last
          />
        </Card>

        {/* Activity */}
        <SectionHeader
          title="Activity"
          action={
            history.length > 0 ? {label: 'Clear', onPress: clearHistory, tone: 'danger', a11yLabel: 'Clear activity'} : undefined
          }
        />
        <HistoryList data={history} limit={visibleHistory} />
        {history.length > HISTORY_PREVIEW && (
          <Button
            title={showAll ? 'Show less' : `Show all ${history.length}`}
            variant="ghost"
            onPress={() => setShowAll(v => !v)}
          />
        )}
      </ScrollView>
      {toast}
    </KeyboardAvoidingView>
  );
}

const styles = (c: Palette) =>
  StyleSheet.create({
    screen: {flex: 1, backgroundColor: c.bg},
    center: {alignItems: 'center', justifyContent: 'center', padding: SPACE.xl},
    flex: {flex: 1},
    content: {paddingHorizontal: SPACE.lg},

    header: {flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: SPACE.xl},
    logo: {
      width: 50,
      height: 50,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    title: {fontSize: 26, fontWeight: '800', color: c.text, letterSpacing: -0.5},
    subtitle: {fontSize: 14, color: c.muted, marginTop: 1},

    note: {
      backgroundColor: c.accentSoft,
      borderRadius: 12,
      padding: SPACE.md,
      marginBottom: SPACE.lg,
    },
    noteText: {fontSize: 13, color: c.text, lineHeight: 19},

    buttonRow: {flexDirection: 'row', gap: SPACE.md},

    timeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACE.sm,
      marginBottom: SPACE.lg,
    },
    summary: {fontSize: 13, color: c.muted, marginTop: SPACE.md, lineHeight: 18},
    divider: {height: StyleSheet.hairlineWidth, backgroundColor: c.border, marginVertical: SPACE.lg},
    label: {fontSize: 14, fontWeight: '600', color: c.text, marginBottom: SPACE.sm},

    listCard: {paddingVertical: SPACE.xs},

    loadTitle: {fontSize: 18, fontWeight: '700', color: c.text, marginTop: SPACE.lg},
    loadText: {fontSize: 14, color: c.muted, marginTop: 6, textAlign: 'center'},
    loadButton: {marginTop: SPACE.xl, alignSelf: 'stretch'},
  });
