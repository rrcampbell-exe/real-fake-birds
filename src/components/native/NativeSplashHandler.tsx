'use client';

import { useEffect } from 'react';

/**
 * Hides the native splash screen after React has hydrated.
 * This component renders nothing — it exists purely for the side effect.
 *
 * When CAPACITOR_SERVER_URL is not set (production), `launchAutoHide` is false
 * so we control the hide timing ourselves. On web this is a no-op.
 *
 * Before hiding the splash, we preload all bundled audio assets so SFX and
 * the theme song are ready the moment the splash fades out.
 */
export default function NativeSplashHandler() {
  useEffect(() => {
    void (async () => {
      try {
        const { isNativePlatform } = await import('@/lib/native/platform');
        if (!isNativePlatform()) return;
        const { SplashScreen } = await import('@capacitor/splash-screen');

        // Hide first so launch is never blocked by JS-side preload work.
        await SplashScreen.hide({ fadeOutDuration: 300 }).catch(() => undefined);

        // Warm audio in the background (best-effort) after splash dismissal.
        void (async () => {
          try {
            const { getSoundController } = await import('@/lib/sound/sound-platform');
            await Promise.race([
              getSoundController().preloadAll().catch(() => undefined),
              new Promise<void>(r => setTimeout(r, 2000)),
            ]);
          } catch {
            // Ignore preload/setup errors.
          }
        })();
      } catch {
        // Ignore — if the plugin isn't available or we're on web, do nothing.
      }
    })();
  }, []);

  return null;
}
