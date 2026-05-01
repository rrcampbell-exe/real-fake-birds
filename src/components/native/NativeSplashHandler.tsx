'use client';

import { useEffect } from 'react';

/**
 * Hides the native splash screen after React has hydrated **and** the app boot
 * screen is ready to cover the transition. Without this coordination the
 * Capacitor splash disappears before the boot overlay is painted, producing a
 * black flash between the two screens.
 *
 * When CAPACITOR_SERVER_URL is not set (production), `launchAutoHide` is false
 * so we control the hide timing ourselves. On web this is a no-op.
 *
 * Before hiding the splash, we preload all bundled audio assets so SFX and
 * the theme song are ready the moment the splash fades out.
 */

/**
 * Resolves once `data-app-booting` is set on `<html>` (meaning AccountStateProvider
 * has mounted and the boot overlay is in the DOM), or after `timeoutMs` at most.
 */
function waitForBootOverlay(timeoutMs = 1500): Promise<void> {
  if (document.documentElement.hasAttribute('data-app-booting')) {
    return Promise.resolve();
  }

  return new Promise<void>((resolve) => {
    const observer = new MutationObserver(() => {
      if (document.documentElement.hasAttribute('data-app-booting')) {
        observer.disconnect();
        window.clearTimeout(safetyId);
        resolve();
      }
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-app-booting'],
    });

    // Safety valve: never block the splash hide indefinitely.
    const safetyId = window.setTimeout(() => {
      observer.disconnect();
      resolve();
    }, timeoutMs);
  });
}

export default function NativeSplashHandler() {
  useEffect(() => {
    void (async () => {
      try {
        const { isNativePlatform } = await import('@/lib/native/platform');
        if (!isNativePlatform()) return;

        // Enforce maximum-scale=1 to prevent WKWebView from zooming into
        // inputs on focus. The Next.js viewport export covers production
        // builds, but live-reload mode may not apply it until a full
        // native rebuild — patching the live <meta> tag is always reliable.
        const viewportMeta = document.querySelector<HTMLMetaElement>('meta[name="viewport"]');
        if (viewportMeta && !viewportMeta.content.includes('maximum-scale')) {
          viewportMeta.content += ', maximum-scale=1';
        }

        const { SplashScreen } = await import('@capacitor/splash-screen');

        // Wait until the boot screen overlay is painted before hiding the
        // Capacitor splash — this eliminates the black-frame gap.
        await waitForBootOverlay();

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
