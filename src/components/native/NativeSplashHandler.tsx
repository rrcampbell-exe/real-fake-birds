'use client';

import { useEffect } from 'react';

/**
 * Hides the native splash screen after React has hydrated.
 * This component renders nothing — it exists purely for the side effect.
 *
 * The splash screen has `launchAutoHide: false` in capacitor.config.ts, so we
 * control the hide timing ourselves. On web this is a no-op.
 */
export default function NativeSplashHandler() {
  useEffect(() => {
    void (async () => {
      try {
        const { isNativePlatform } = await import('@/lib/native/platform');
        if (!isNativePlatform()) return;
        const { SplashScreen } = await import('@capacitor/splash-screen');
        await SplashScreen.hide({ fadeOutDuration: 300 });
      } catch {
        // Ignore — if the plugin isn't available or we're on web, do nothing.
      }
    })();
  }, []);

  return null;
}
