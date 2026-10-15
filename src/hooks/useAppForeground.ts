/**
 * Run `callback` once when the screen mounts and again every time the user comes
 * back to the app (e.g. after granting a permission in Android Settings).
 *
 * WHY: settings can change while the app is in the background — the user may
 * have toggled battery optimization in Settings, or a call may have added history.
 * React Native has no "page focus" event like a browser tab; AppState is the
 * equivalent ('active' = in the foreground).
 */
import {useEffect} from 'react';
import {AppState} from 'react-native';

export function useAppForeground(callback: () => void) {
  useEffect(() => {
    callback();
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') callback();
    });
    return () => sub.remove();
  }, [callback]);
}
