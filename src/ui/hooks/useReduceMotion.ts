/**
 * Accessibility: follow the phone's "Remove animations" setting.
 * Used by StatusHero (pulse ring) and useToast (slide-in) to skip motion.
 */
import {useEffect, useState} from 'react';
import {AccessibilityInfo} from 'react-native';

/** True when the user asked the OS for less motion (incl. "Animation scale: off"). */
export function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduce);
    // Also react if the user changes the setting while the app is open.
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);
    return () => sub.remove();
  }, []);
  return reduce;
}
