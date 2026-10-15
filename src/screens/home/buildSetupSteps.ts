/**
 * The "Finish setting up" checklist: which steps exist and which are done.
 * The card disappears once every step is done.
 *
 * To add a setup step, add an entry here — SetupChecklist draws whatever it gets.
 */
import {HistoryEntry, Battery, Config, Screening} from '../../native';
import type {SetupStep} from '../../ui';

export function buildSetupSteps(args: {
  cfg: Config;
  history: HistoryEntry[];
  screening: Screening | null;
  battery: Battery | null;
  actions: {
    goToDestination: () => void;
    sendTest: () => void;
    turnOn: () => void;
    enableCallerId: () => void;
    allowBattery: () => void;
  };
}): SetupStep[] {
  const {cfg, history, screening, battery, actions} = args;
  const steps: SetupStep[] = [
    {
      key: 'destination',
      title: 'Choose a destination',
      subtitle: 'Where your call alerts get posted.',
      done: cfg.url.length > 0,
      action: {label: 'Set up', onPress: actions.goToDestination},
    },
    {
      key: 'test',
      title: 'Send a test message',
      subtitle: 'Check that messages arrive.',
      // Any successful delivery proves the destination works.
      done: history.some(e => e.success),
      action: {label: 'Send', onPress: actions.sendTest},
    },
    {
      key: 'on',
      title: 'Turn on alerts',
      subtitle: 'Allow phone access so calls can be noticed.',
      done: cfg.masterEnabled,
      action: {label: 'Turn on', onPress: actions.turnOn},
    },
  ];
  // Caller ID needs Android 10+; on older phones the step is simply not shown.
  if (screening?.supported) {
    steps.push({
      key: 'callerid',
      title: 'Show caller numbers',
      subtitle: "Lets alerts include who's calling.",
      done: screening.held,
      action: {label: 'Allow', onPress: actions.enableCallerId},
    });
  }
  steps.push({
    key: 'battery',
    title: 'Keep running in the background',
    subtitle: 'Stops Android from pausing alerts.',
    done: !!battery?.exempt,
    action: {label: 'Allow', onPress: actions.allowBattery},
  });
  return steps;
}
