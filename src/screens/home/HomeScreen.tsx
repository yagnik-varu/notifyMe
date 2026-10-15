/**
 * The app's only screen. Think of it as the "controller":
 *  - gets data from hooks (useAppData, useDestinationForm, useTestSend),
 *  - defines what each button does (the "Actions" block),
 *  - hands data + actions to presentational sections in ./sections.
 *
 * Every setting change follows the same pattern:
 *   1. NotifyMe.setX(...)        write to the phone (fire-and-forget)
 *   2. app.setCfg({...})         optional: update the screen immediately
 *   3. app.reread()              read back the truth from the native side
 *
 * Reading guide: docs/06-ui-layer.md.
 */
import React, {useCallback, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {getDestination} from '../../destinations';
import {requestCallPermissions} from '../../domain/permissions';
import {endOfToday, toggleDay} from '../../domain/schedule';
import {useAppData} from '../../hooks/useAppData';
import {useAppForeground} from '../../hooks/useAppForeground';
import {useDestinationForm} from '../../hooks/useDestinationForm';
import {useTestSend} from '../../hooks/useTestSend';
import {NotifyMe, OVERRIDE, ScreeningResult} from '../../native';
import {Palette, SPACE, useStyles} from '../../theme';
import {SetupChecklist, StatusHero, Tone, useToast} from '../../ui';
import {buildHero} from './buildHero';
import {buildSetupSteps} from './buildSetupSteps';
import {ActivitySection} from './sections/ActivitySection';
import {AppHeader} from './sections/AppHeader';
import {DestinationSection} from './sections/DestinationSection';
import {LoadErrorView} from './sections/LoadErrorView';
import {ReliabilitySection} from './sections/ReliabilitySection';
import {OverrideChoice, ScheduleSection, overrideChoiceOf} from './sections/ScheduleSection';

/** Toast text + tone for each answer to the caller-ID role dialog. */
const SCREENING_TOAST: Record<ScreeningResult, [string, Tone]> = {
  granted: ['Caller numbers turned on', 'success'],
  held: ['Caller numbers already on', 'success'],
  denied: ['Caller numbers stay off', 'warning'],
  unsupported: ['Needs Android 10 or newer', 'warning'],
  unavailable: ["This phone doesn't support it", 'warning'],
};

export function HomeScreen() {
  const [s, c] = useStyles(styles);
  // Space taken by the status bar / gesture bar, so content isn't drawn under them.
  const insets = useSafeAreaInsets();
  const [toast, showToast] = useToast();
  const scrollRef = useRef<ScrollView>(null);
  const destinationY = useRef(0);
  const [refreshing, setRefreshing] = useState(false);

  // ---- Data ----
  // ⚠ Hooks must run in the same order on every render, so they all come before
  // the early `return`s below (React's "rules of hooks").

  const app = useAppData();
  const {cfg, status} = app;
  const destination = getDestination(cfg?.platform ?? '');
  const form = useDestinationForm(cfg, destination);
  const testSend = useTestSend(app.setHistory);

  const {refresh} = app;
  const {reset: resetForm} = form;
  /** Full reload, then put the saved values back into the form. */
  const reload = useCallback(async () => {
    const conf = await refresh();
    if (conf) resetForm(conf);
  }, [refresh, resetForm]);
  useAppForeground(reload);

  const statusBar = (
    <StatusBar barStyle={c.statusBar} backgroundColor="transparent" translucent />
  );

  if (app.loadError) {
    return (
      <>
        {statusBar}
        <LoadErrorView onRetry={reload} topInset={insets.top} />
      </>
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

  const hasDestination = cfg.url.length > 0;
  const overrideChoice = overrideChoiceOf(status);

  // ---- Actions ----

  const scrollToDestination = () =>
    scrollRef.current?.scrollTo({y: Math.max(destinationY.current - 12, 0), animated: true});

  const saveDestination = async () => {
    form.persist();
    testSend.reset();
    NotifyMe.haptic('confirm');
    showToast(form.trimmed.url ? 'Destination saved' : 'Destination removed');
    await app.reread();
  };

  const onPlatform = (id: string) => {
    NotifyMe.haptic('tick');
    NotifyMe.setPlatform(id);
    app.setCfg({...cfg, platform: id});
    testSend.reset();
  };

  /** Master switch. Turning on needs a destination and the phone permissions. */
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
    app.reread();
  };

  /** Validate, save unsaved edits (so the test uses them), then send. */
  const runTest = async () => {
    if (!form.trimmed.url) {
      showToast('Add a destination first', 'warning');
      scrollToDestination();
      return;
    }
    if (!form.isValid) {
      showToast('Fix the highlighted field first', 'danger');
      scrollToDestination();
      return;
    }
    if (form.dirty) {
      form.persist();
      await app.reread();
    }
    testSend.start();
  };

  const onScheduleChange = (startMin: number, endMin: number) => {
    NotifyMe.setSchedule(startMin, endMin);
    app.setCfg({...cfg, startMin, endMin});
    app.reread();
  };

  const onToggleDay = (day: number) => {
    NotifyMe.haptic('tick');
    const mask = toggleDay(cfg.daysMask, day);
    NotifyMe.setDaysMask(mask);
    app.setCfg({...cfg, daysMask: mask});
    app.reread();
  };

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
    app.reread();
  };

  const enableCallerId = async () => {
    const result = await NotifyMe.requestScreeningRole();
    const [text, tone] = SCREENING_TOAST[result] ?? ['Something went wrong', 'danger'];
    showToast(text, tone);
    reload();
  };

  const allowBattery = () => NotifyMe.requestBatteryExemption();

  /** Clear right away and offer Undo (snackbar pattern) instead of an "Are you sure?" dialog. */
  const clearHistory = () => {
    const cleared = app.history;
    NotifyMe.clearHistory();
    app.setHistory([]);
    showToast('Activity cleared', 'neutral', {
      label: 'Undo',
      onPress: async () => {
        NotifyMe.restoreHistory(cleared);
        NotifyMe.haptic('confirm');
        app.setHistory(await NotifyMe.getHistory());
      },
    });
  };

  const onPullRefresh = async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  };

  // ---- Derived view data ----

  const hero = buildHero(cfg, status, destination);
  const steps = buildSetupSteps({
    cfg,
    history: app.history,
    screening: app.screening,
    battery: app.battery,
    actions: {
      goToDestination: scrollToDestination,
      sendTest: runTest,
      turnOn: () => onMaster(true),
      enableCallerId,
      allowBattery,
    },
  });
  const setupDone = steps.every(step => step.done);

  // ---- Layout ----

  return (
    <KeyboardAvoidingView
      style={[s.screen, {paddingTop: insets.top}]}
      // ⚠ GOTCHA: on Android 15+ (API 35) apps are drawn edge-to-edge and the
      // manifest's adjustResize no longer shrinks the window for the keyboard, so
      // we pad for it ourselves. Older versions resize natively → no behavior.
      behavior={typeof Platform.Version === 'number' && Platform.Version >= 35 ? 'height' : undefined}>
      {statusBar}
      <ScrollView
        ref={scrollRef}
        // Taps on buttons work even while the keyboard is open.
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
        <AppHeader />

        <StatusHero {...hero} enabled={cfg.masterEnabled} onToggle={onMaster} />

        {!setupDone && <SetupChecklist steps={steps} />}

        <DestinationSection
          destination={destination}
          form={form}
          hasSaved={hasDestination}
          test={testSend.test}
          onPlatform={onPlatform}
          onSave={saveDestination}
          onTest={runTest}
          onLayout={e => (destinationY.current = e.nativeEvent.layout.y)}
        />

        <ScheduleSection
          cfg={cfg}
          overrideChoice={overrideChoice}
          onScheduleChange={onScheduleChange}
          onToggleDay={onToggleDay}
          onOverride={onOverride}
        />

        <ReliabilitySection
          screening={app.screening}
          battery={app.battery}
          onEnableCallerId={enableCallerId}
          onAllowBattery={allowBattery}
        />

        <ActivitySection history={app.history} onClear={clearHistory} />
      </ScrollView>
      {/* Rendered last so it floats above the scroll content. */}
      {toast}
    </KeyboardAvoidingView>
  );
}

const styles = (c: Palette) =>
  StyleSheet.create({
    screen: {flex: 1, backgroundColor: c.bg},
    center: {alignItems: 'center', justifyContent: 'center', padding: SPACE.xl},
    content: {paddingHorizontal: SPACE.lg},
  });
