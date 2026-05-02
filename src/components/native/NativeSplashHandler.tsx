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

const BOOT_OVERLAY_SELECTOR = '[data-boot-overlay="true"]';

function isBootOverlayReady(): boolean {
  return document.documentElement.hasAttribute('data-app-booting')
    && document.querySelector(BOOT_OVERLAY_SELECTOR) !== null;
}

/**
 * Resolves once the React boot overlay has mounted and the browser has had a
 * chance to paint it, or after `timeoutMs` at most.
 */
function waitForBootOverlay(timeoutMs = 1500): Promise<void> {
  return new Promise<void>((resolve) => {
    let settled = false;
    let observer: MutationObserver | null = null;
    let safetyId = 0;

    const finish = () => {
      if (settled) {
        return;
      }

      settled = true;
      observer?.disconnect();
      window.clearTimeout(safetyId);
      resolve();
    };

    const resolveAfterPaint = () => {
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          finish();
        });
      });
    };

    const tryResolve = () => {
      if (!isBootOverlayReady()) {
        return false;
      }

      resolveAfterPaint();
      return true;
    };

    observer = new MutationObserver(() => {
      tryResolve();
    });
    observer.observe(document.documentElement, {
      attributes: true,
      childList: true,
      subtree: true,
    });

    if (!tryResolve()) {
      // Safety valve: never block the splash hide indefinitely.
      safetyId = window.setTimeout(() => {
        finish();
      }, timeoutMs);
    }
  });
}

export default function NativeSplashHandler() {
  useEffect(() => {
    void (async () => {
      try {
        const { isNativePlatform } = await import('@/lib/native/platform');
        if (!isNativePlatform()) return;

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
