'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { WifiOff } from 'lucide-react';
import { useAccountState } from '@/components/account/AccountStateProvider';
import { isNativePlatform } from '@/lib/native/platform';
import { useHasHydrated } from '@/hooks/useHasHydrated';
import UsernameAvailabilityCard from '@/components/auth/UsernameAvailabilityCard';

/**
 * Session-scoped key that lets an offline user bypass the auth gate for the
 * current app session. Cleared when the app is restarted.
 */
const OFFLINE_GUEST_BYPASS_KEY = 'rfb:nativeOfflineGuestBypass';

/**
 * Full-screen native auth gate.
 *
 * Rendered after the boot overlay finishes. Blocks access to the game for
 * signed-out native users and redirects them through username + password
 * create/sign-in before any gameplay is possible.
 *
 * Offline exception: when the device has no network, a "Play as guest" path
 * is offered so the user is not indefinitely locked out. The bypass is stored
 * in sessionStorage and cleared when the app restarts.
 *
 * This component is a no-op on web (returns null for non-native platforms).
 */
export default function NativeAuthGate() {
  const hasMounted = useHasHydrated();
  const { isBooting, isSignedIn } = useAccountState();
  const router = useRouter();
  const [isOffline, setIsOffline] = useState(false);
  const [offlineBypass, setOfflineBypass] = useState(false);

  useEffect(() => {
    if (!hasMounted) return;

    // Restore any existing session-scoped offline bypass.
    try {
      setOfflineBypass(sessionStorage.getItem(OFFLINE_GUEST_BYPASS_KEY) === 'true');
    } catch {
      // sessionStorage not available (private browsing, etc.) — ignore.
    }

    const update = () => setIsOffline(!navigator.onLine);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, [hasMounted]);

  const handlePlayOffline = useCallback(() => {
    try {
      sessionStorage.setItem(OFFLINE_GUEST_BYPASS_KEY, 'true');
    } catch {
      // Ignore storage errors.
    }
    setOfflineBypass(true);
  }, []);

  // Not a native platform — never render.
  if (!hasMounted || !isNativePlatform()) return null;

  // Boot screen is still showing — stay hidden so we don't render under it.
  if (isBooting) return null;

  // User is already signed in — gate not needed.
  if (isSignedIn) return null;

  // Offline guest bypass was granted this session.
  if (offlineBypass) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col overflow-y-auto bg-[var(--color-primary)] px-6"
      style={{
        paddingTop: 'max(2rem, env(safe-area-inset-top))',
        paddingBottom: 'calc(env(safe-area-inset-bottom) + 2rem)',
      }}
    >
      {/* Main content — vertically centered in the available space */}
      <div className="flex flex-1 flex-col justify-center">
        {/* Branding header */}
        <div className="mb-8 text-center">
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-[0.05em] text-[var(--color-text)]">
            Real Fake Birds
          </h1>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            Join the flock with a username.
          </p>
        </div>

        {isOffline ? (
          <div className="flex flex-col items-center gap-6">
            <div className="flex items-center gap-2 rounded-xl border border-[var(--color-surface-border)] bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-text)]">
              <WifiOff size={16} className="shrink-0 text-[var(--color-error)]" />
              <span>{"You're offline. Sign in is unavailable right now."}</span>
            </div>
            <p className="text-center text-sm text-[var(--color-muted)]">
              You can play without an account until you&apos;re back online. Your progress
              will be saved locally and can be linked to your account later.
            </p>
            <button
              type="button"
              onClick={handlePlayOffline}
              className="w-full rounded-2xl border border-[var(--color-surface-border)] bg-[var(--color-surface)] px-6 py-3 text-sm font-semibold text-[var(--color-text)] transition hover:bg-[var(--color-surface-hover)]"
            >
              Play as guest (offline)
            </button>
          </div>
        ) : (
          <UsernameAvailabilityCard compact deferCaptcha onAuthSuccess={() => router.replace('/')} />
        )}
      </div>

      {/* Privacy / terms links */}
      <p className="mt-8 text-center text-[0.7rem] leading-5 text-[var(--color-muted)]">
        By creating an account you agree to our{' '}
        <a
          href="/privacy"
          className="underline underline-offset-2"
          target="_blank"
          rel="noopener noreferrer"
        >
          Privacy Policy
        </a>{' '}
        and{' '}
        <a
          href="/terms"
          className="underline underline-offset-2"
          target="_blank"
          rel="noopener noreferrer"
        >
          Terms of Service
        </a>
        .
      </p>
    </div>
  );
}
