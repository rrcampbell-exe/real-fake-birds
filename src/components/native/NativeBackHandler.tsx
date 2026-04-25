'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Handles the Android hardware/gesture back button when running inside the
 * Capacitor native shell. Without this the app exits instead of navigating
 * back through the Next.js history stack.
 *
 * Renders nothing — side-effect only.
 */
export default function NativeBackHandler() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    let removeListener: (() => void) | undefined;

    async function register() {
      // Dynamically import so the Capacitor plugin is never bundled for web
      const { App } = await import('@capacitor/app');
      const { remove } = await App.addListener('backButton', ({ canGoBack }) => {
        if (canGoBack) {
          router.back();
        } else {
          void App.exitApp();
        }
      });
      // If the component unmounted before this promise resolved, remove
      // the listener immediately rather than leaking it.
      if (cancelled) {
        remove();
      } else {
        removeListener = remove;
      }
    }

    // Only activate inside the native shell
    const cap = (typeof window !== 'undefined')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? (window as any).Capacitor
      : null;

    if (cap?.isNativePlatform?.() && cap?.getPlatform?.() === 'android') {
      void register();
    }

    return () => {
      cancelled = true;
      removeListener?.();
    };
  }, [router]);

  return null;
}
