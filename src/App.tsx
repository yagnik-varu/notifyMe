/**
 * Root React component (registered in /index.js).
 *
 * Only sets up app-wide providers. Today that's SafeAreaProvider, which measures
 * the notch / status bar / gesture bar so screens can avoid drawing under them
 * (read with useSafeAreaInsets()).
 *
 * If the app grows more screens, this is where navigation would go.
 */
import React from 'react';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {HomeScreen} from './screens/home/HomeScreen';

export default function App() {
  return (
    <SafeAreaProvider>
      <HomeScreen />
    </SafeAreaProvider>
  );
}
