'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import AppBootScreen from '@/components/account/AppBootScreen';
import { fetchAccountState, type AccountStateResponse } from '@/lib/auth/account-sync';
import {
  ACCOUNT_STATE_CHANGED_EVENT,
  resetLocalStateForGuestSession,
  syncSignedInAccountToLocalState,
} from '@/lib/auth/account-session';
import {
  ensureBrowserSession,
  logNativeAuthEvent,
  recoverBrowserSessionFromUnauthorized,
} from '@/lib/auth/browser-session';
import { isUnauthenticatedAccountActionError } from '@/lib/auth/error';
import { readAccountSyncMeta } from '@/lib/auth/account-sync-local';
import { markLaunchStage } from '@/lib/native/launch-metrics';
import { isNativePlatform } from '@/lib/native/platform';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { hasSupabaseEnv } from '@/lib/supabase/env';
import { setUnlockedThemeNames } from '@/lib/utils/player-progress';
import { getCurrentWeekStart } from '@/lib/utils/weekly-leaderboard';
import type { WeeklyOverview } from '@/types';

type RemoteProgressSummary = {
  birdsIdentified: number;
  seeds: number;
  bestStreak: number;
  bestDailyStreak: number;
  bestWeeklyPlacement: number | null;
  firstPlaceCount: number;
  secondPlaceCount: number;
  thirdPlaceCount: number;
};

type AccountStateCache = {
  email: string | null;
  username: string | null;
  isHouseAccount: boolean;
  avatarPalette: string | null;
  joinedMonthYear: string | null;
  avatarFakeBirdKey: string | null;
  avatarFakeBirdImageUrl: string | null;
  privacyMode: 'public' | 'private' | null;
  remoteSummary: RemoteProgressSummary | null;
  remoteUnlockedThemes: string[];
  weeklyOverview: WeeklyOverview | null;
  lastFetchedAt: string | null;
};

type BootStage = 'checking-session' | 'restoring-cache' | 'syncing-progress' | 'finalizing';

type AccountStateContextValue = {
  isLoadingAccount: boolean;
  isSignedIn: boolean;
  isBooting: boolean;
  isBackgroundSyncing: boolean;
  isAppChromeVisible: boolean;
  accountEmail: string | null;
  accountUsername: string | null;
  accountAvatarPalette: string | null;
  accountJoinedMonthYear: string | null;
  accountAvatarFakeBirdKey: string | null;
  accountAvatarFakeBirdImageUrl: string | null;
  accountPrivacyMode: 'public' | 'private' | null;
  isHouseAccount: boolean;
  remoteSummary: RemoteProgressSummary | null;
  remoteUnlockedThemes: string[];
  weeklyOverview: WeeklyOverview | null;
  refreshAccountState: () => Promise<void>;
  syncSignedInProgress: () => Promise<void>;
};

const AccountStateContext = createContext<AccountStateContextValue | null>(null);
const SIGNED_IN_PROGRESS_SYNC_INTERVAL_MS = 60_000;
const ACCOUNT_STATE_CACHE_STORAGE_KEY = 'accountStateCache';
const BOOT_INSPECTION_STORAGE_KEY = 'rfb:inspectBootDelayMs';
const WARM_CACHE_WINDOW_MS = 5 * 60_000;
const DEFAULT_BOOT_INSPECTION_DELAY_MS = 2_500;
const MAX_BOOT_INSPECTION_DELAY_MS = 10_000;
const MIN_BOOT_SCREEN_DURATION_MS = 700;
const BOOT_NETWORK_TIMEOUT_MS = 2_500;
const BOOT_WATCHDOG_TIMEOUT_MS = 8_000;
const BOOT_EXIT_DURATION_MS = 220;
const CONTENT_REVEAL_DELAY_MS = BOOT_EXIT_DURATION_MS;
const CHROME_REVEAL_DELAY_MS = BOOT_EXIT_DURATION_MS;

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      reject(new Error(`${label} timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    promise
      .then((value) => {
        window.clearTimeout(timeoutId);
        resolve(value);
      })
      .catch((error) => {
        window.clearTimeout(timeoutId);
        reject(error);
      });
  });
}

function getBootInspectionDelayMs(): number {
  if (!isBrowser() || process.env.NODE_ENV === 'production') {
    return 0;
  }

  const searchParams = new URLSearchParams(window.location.search);
  const queryValue = searchParams.get('inspectBoot');
  const storageValue = window.localStorage.getItem(BOOT_INSPECTION_STORAGE_KEY);
  const rawValue = queryValue ?? storageValue;

  if (!rawValue) {
    return 0;
  }

  if (rawValue === 'true' || rawValue === '1') {
    return DEFAULT_BOOT_INSPECTION_DELAY_MS;
  }

  const parsedDelay = Number.parseInt(rawValue, 10);
  if (!Number.isFinite(parsedDelay) || parsedDelay <= 0) {
    return 0;
  }

  return Math.min(parsedDelay, MAX_BOOT_INSPECTION_DELAY_MS);
}

function getBootStageCopy(stage: BootStage): string {
  switch (stage) {
    case 'checking-session':
      return 'Checking which birder just arrived...';
    case 'restoring-cache':
      return 'Opening the last saved field guide...';
    case 'syncing-progress':
      return 'Fetching the latest flock progress...';
    case 'finalizing':
      return 'Setting the perch for takeoff...';
    default:
      return 'Getting your bird log ready...';
  }
}

function getBootStageProgress(stage: BootStage): number {
  switch (stage) {
    case 'checking-session':
      return 20;
    case 'restoring-cache':
      return 45;
    case 'syncing-progress':
      return 75;
    case 'finalizing':
      return 100;
    default:
      return 15;
  }
}

function readAccountStateCache(): AccountStateCache | null {
  if (!isBrowser()) {
    return null;
  }

  const raw = window.localStorage.getItem(ACCOUNT_STATE_CACHE_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AccountStateCache;
  } catch {
    return null;
  }
}

function writeAccountStateCache(cache: AccountStateCache): void {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(ACCOUNT_STATE_CACHE_STORAGE_KEY, JSON.stringify(cache));
}

function clearAccountStateCache(): void {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.removeItem(ACCOUNT_STATE_CACHE_STORAGE_KEY);
}

function hasWarmProgressCache(): boolean {
  if (!isBrowser()) {
    return false;
  }

  const { lastPulledAt } = readAccountSyncMeta();
  if (!lastPulledAt) {
    return false;
  }

  const pulledAt = Date.parse(lastPulledAt);
  if (Number.isNaN(pulledAt) || Date.now() - pulledAt > WARM_CACHE_WINDOW_MS) {
    return false;
  }

  return Boolean(
    window.localStorage.getItem('birdScore')
      || window.localStorage.getItem('birdJournal')
      || window.localStorage.getItem('dailyMissionHistory')
  );
}

export function AccountStateProvider({ children }: { children: ReactNode }) {
  const supabaseReady = hasSupabaseEnv();
  const prefersReducedMotion = usePrefersReducedMotion();
  const [isLoadingAccount, setIsLoadingAccount] = useState(true);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [isBooting, setIsBooting] = useState(true);
  const [isBackgroundSyncing, setIsBackgroundSyncing] = useState(false);
  const [isContentVisible, setIsContentVisible] = useState(false);
  const [isAppChromeVisible, setIsAppChromeVisible] = useState(false);
  const [bootStage, setBootStage] = useState<BootStage>('checking-session');
  const [accountEmail, setAccountEmail] = useState<string | null>(null);
  const [accountUsername, setAccountUsername] = useState<string | null>(null);
  const [accountAvatarPalette, setAccountAvatarPalette] = useState<string | null>(null);
  const [accountJoinedMonthYear, setAccountJoinedMonthYear] = useState<string | null>(null);
  const [accountAvatarFakeBirdKey, setAccountAvatarFakeBirdKey] = useState<string | null>(null);
  const [accountAvatarFakeBirdImageUrl, setAccountAvatarFakeBirdImageUrl] = useState<string | null>(null);
  const [accountPrivacyMode, setAccountPrivacyMode] = useState<'public' | 'private' | null>(null);
  const [isHouseAccount, setIsHouseAccount] = useState<boolean>(false);
  const [remoteSummary, setRemoteSummary] = useState<RemoteProgressSummary | null>(null);
  const [remoteUnlockedThemes, setRemoteUnlockedThemes] = useState<string[]>([]);
  const [weeklyOverview, setWeeklyOverview] = useState<WeeklyOverview | null>(null);

  const applyRemoteAccountState = useCallback((accountState: AccountStateResponse) => {
    setIsSignedIn(true);
    setAccountEmail(accountState.email);
    setAccountUsername(accountState.profile?.username ?? null);
    setAccountAvatarPalette(accountState.profile?.avatarPalette ?? null);
    setAccountJoinedMonthYear(accountState.profile?.joinedMonthYear ?? null);
    setAccountAvatarFakeBirdKey(accountState.profile?.avatarFakeBirdKey ?? null);
    setAccountAvatarFakeBirdImageUrl(accountState.profile?.avatarFakeBirdImageUrl ?? null);
    setAccountPrivacyMode(accountState.profile?.privacyMode ?? null);
    setIsHouseAccount(accountState.profile?.isHouseAccount ?? false);
    setRemoteSummary(accountState.progressSummary);
    setRemoteUnlockedThemes(accountState.unlockedThemes);
    setWeeklyOverview(accountState.weeklyOverview);
    setUnlockedThemeNames(accountState.unlockedThemes);
    writeAccountStateCache({
      email: accountState.email,
      username: accountState.profile?.username ?? null,
      isHouseAccount: accountState.profile?.isHouseAccount ?? false,
      avatarPalette: accountState.profile?.avatarPalette ?? null,
      joinedMonthYear: accountState.profile?.joinedMonthYear ?? null,
      avatarFakeBirdKey: accountState.profile?.avatarFakeBirdKey ?? null,
      avatarFakeBirdImageUrl: accountState.profile?.avatarFakeBirdImageUrl ?? null,
      privacyMode: accountState.profile?.privacyMode ?? null,
      remoteSummary: accountState.progressSummary,
      remoteUnlockedThemes: accountState.unlockedThemes,
      weeklyOverview: accountState.weeklyOverview,
      lastFetchedAt: new Date().toISOString(),
    });
  }, []);

  const applyAccountStateCache = useCallback((cache: AccountStateCache | null) => {
    if (!cache) {
      return;
    }

    setAccountEmail(cache.email);
    setAccountUsername(cache.username);
    setIsHouseAccount(cache.isHouseAccount ?? false);
    setAccountAvatarPalette(cache.avatarPalette ?? null);
    setAccountJoinedMonthYear(cache.joinedMonthYear ?? null);
    setAccountAvatarFakeBirdKey(cache.avatarFakeBirdKey ?? null);
    setAccountAvatarFakeBirdImageUrl(cache.avatarFakeBirdImageUrl ?? null);
    setAccountPrivacyMode(cache.privacyMode ?? null);
    setRemoteSummary(cache.remoteSummary);
    setRemoteUnlockedThemes(cache.remoteUnlockedThemes);

    // Don't restore a cached weeklyOverview from a previous week — it would
    // suppress the recap modal on the first post-turnover visit until a fresh
    // server fetch completes. Leave weeklyOverview null so the modal waits for
    // fresh data rather than showing based on last-week's cached null recap.
    const cachedWeekStart = cache.weeklyOverview?.currentWeekStart;
    const isCurrentWeek = cachedWeekStart === getCurrentWeekStart();
    setWeeklyOverview(isCurrentWeek ? cache.weeklyOverview : null);

    if (cache.remoteUnlockedThemes.length > 0) {
      setUnlockedThemeNames(cache.remoteUnlockedThemes);
    }
  }, []);

  const clearAccountState = useCallback(() => {
    setIsSignedIn(false);
    setAccountEmail(null);
    setAccountUsername(null);
    setAccountAvatarPalette(null);
    setAccountJoinedMonthYear(null);
    setAccountAvatarFakeBirdKey(null);
    setAccountAvatarFakeBirdImageUrl(null);
    setAccountPrivacyMode(null);
    setIsHouseAccount(false);
    setRemoteSummary(null);
    setRemoteUnlockedThemes([]);
    setWeeklyOverview(null);
  }, []);

  const clearStaleSignedInSession = useCallback(async () => {
    logNativeAuthEvent('clearing-stale-session');
    clearAccountState();
    clearAccountStateCache();
    resetLocalStateForGuestSession();

    try {
      const supabase = getSupabaseBrowserClient();
      await supabase.auth.signOut({ scope: 'local' });
    } catch {
      // Clearing local auth state is best-effort here.
    }
  }, [clearAccountState]);

  const refreshAccountState = useCallback(async (options?: { silent?: boolean }) => {
    if (!supabaseReady) {
      clearAccountState();
      setIsLoadingAccount(false);
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!options?.silent) {
      setIsLoadingAccount(true);
    }

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const sessionUser = sessionData.session?.user;

      if (!sessionUser) {
        clearAccountState();
        clearAccountStateCache();
        return;
      }

      setIsSignedIn(true);
      applyRemoteAccountState(await fetchAccountState());
    } catch (error) {
      if (isUnauthenticatedAccountActionError(error)) {
        logNativeAuthEvent('account-state-unauthorized', {
          source: 'refreshAccountState',
        });

        const recovered = await recoverBrowserSessionFromUnauthorized('refresh-account-state');
        if (recovered) {
          await wait(150);

          try {
            applyRemoteAccountState(await fetchAccountState());
            return;
          } catch (retryError) {
            if (isUnauthenticatedAccountActionError(retryError)) {
              await clearStaleSignedInSession();
              return;
            }

            throw retryError;
          }
        }

        await clearStaleSignedInSession();
        return;
      }

      clearAccountState();
    } finally {
      if (!options?.silent) {
        setIsLoadingAccount(false);
      }
    }
  }, [applyRemoteAccountState, clearAccountState, clearStaleSignedInSession, supabaseReady]);

  const syncSignedInProgress = useCallback(async (options?: { silent?: boolean }) => {
    if (!supabaseReady || !isSignedIn) {
      return;
    }

    if (options?.silent) {
      setIsBackgroundSyncing(true);
    }

    try {
      await syncSignedInAccountToLocalState({ notify: false });
    } catch {
      // Pages keep rendering local state if the refresh cannot complete.
    } finally {
      if (options?.silent) {
        setIsBackgroundSyncing(false);
      }
    }
  }, [isSignedIn, supabaseReady]);

  useEffect(() => {
    if (isBooting) {
      setIsContentVisible(false);
      setIsAppChromeVisible(false);
      return;
    }

    markLaunchStage('boot-complete', {
      signedIn: isSignedIn,
    }, { once: true });

    const contentTimeoutId = window.setTimeout(() => {
      setIsContentVisible(true);
    }, CONTENT_REVEAL_DELAY_MS);

    const chromeTimeoutId = window.setTimeout(() => {
      setIsAppChromeVisible(true);
    }, CHROME_REVEAL_DELAY_MS);

    return () => {
      window.clearTimeout(contentTimeoutId);
      window.clearTimeout(chromeTimeoutId);
    };
  }, [isBooting, isSignedIn]);

  useEffect(() => {
    if (!isBrowser()) {
      return;
    }

    const root = document.documentElement;
    const shouldLockBootTheme = isBooting;

    if (shouldLockBootTheme) {
      root.setAttribute('data-app-booting', 'true');
      return () => {
        root.removeAttribute('data-app-booting');
      };
    }

    root.removeAttribute('data-app-booting');

    return undefined;
  }, [isBooting]);

  useEffect(() => {
    // Absolute safety net: if anything in startup flow regresses, never trap
    // players on the boot screen indefinitely.
    const failOpenId = window.setTimeout(() => {
      setBootStage('finalizing');
      setIsLoadingAccount(false);
      setIsBooting(false);
    }, BOOT_WATCHDOG_TIMEOUT_MS + 3_000);

    return () => {
      window.clearTimeout(failOpenId);
    };
  }, []);

  useEffect(() => {
    if (!supabaseReady) {
      let active = true;

      const runGuestBoot = async () => {
        setIsBooting(true);
        setIsLoadingAccount(true);
        setBootStage('checking-session');
        clearAccountState();

        await wait(MIN_BOOT_SCREEN_DURATION_MS);

        if (!active) {
          return;
        }

        setIsLoadingAccount(false);
        setIsBooting(false);
      };

      void runGuestBoot();

      return () => {
        active = false;
      };
    }

    const waitForMinimumBootDuration = async (bootStartedAt: number, requiredBootDurationMs: number, activeRef: () => boolean) => {
      const elapsedBootTimeMs = Date.now() - bootStartedAt;
      const remainingBootTimeMs = requiredBootDurationMs - elapsedBootTimeMs;

      if (remainingBootTimeMs <= 0) {
        return;
      }

      await wait(remainingBootTimeMs);

      if (!activeRef()) {
        return;
      }
    };

    let active = true;
    const bootWatchdogId = window.setTimeout(() => {
      if (!active) {
        return;
      }

      // Absolute fail-open for native/webview debugging sessions where an
      // unexpected startup path hangs before normal finally blocks run.
      setBootStage('finalizing');
      setIsLoadingAccount(false);
      setIsBooting(false);
    }, BOOT_WATCHDOG_TIMEOUT_MS);

    const runBoot = async () => {
      const bootStartedAt = Date.now();
      const bootInspectionDelayMs = getBootInspectionDelayMs();
      const requiredBootDurationMs = Math.max(MIN_BOOT_SCREEN_DURATION_MS, bootInspectionDelayMs);

      setIsBooting(true);
      setIsLoadingAccount(true);
      setBootStage('checking-session');

      try {
        const supabase = getSupabaseBrowserClient();
        const { data: sessionData } = await withTimeout(
          supabase.auth.getSession(),
          BOOT_NETWORK_TIMEOUT_MS,
          'supabase.auth.getSession() during boot'
        );
        if (!active) {
          return;
        }

        const sessionUser = sessionData.session?.user;

        setBootStage('restoring-cache');
        applyAccountStateCache(readAccountStateCache());
        if (!active) {
          return;
        }

        if (!sessionUser) {
          clearAccountState();
          clearAccountStateCache();
          return;
        }

        setIsSignedIn(true);
        setBootStage('finalizing');

        void (async () => {
          const hasWarmCache = hasWarmProgressCache();

          if (active) {
            setIsBackgroundSyncing(true);
          }

          try {
            if (!hasWarmCache) {
              setBootStage('syncing-progress');
              await withTimeout(
                syncSignedInAccountToLocalState({ notify: false }),
                BOOT_NETWORK_TIMEOUT_MS,
                'syncSignedInAccountToLocalState() during background boot sync'
              );
            }
          } catch {
            logNativeAuthEvent('boot-progress-sync-deferred');
          }

          try {
            if (!active) {
              return;
            }

            setBootStage('finalizing');
            await withTimeout(
              refreshAccountState({ silent: true }),
              BOOT_NETWORK_TIMEOUT_MS,
              'refreshAccountState() during background boot refresh'
            );
          } catch {
            logNativeAuthEvent('boot-account-refresh-deferred');
          } finally {
            if (active) {
              setIsBackgroundSyncing(false);
            }
          }
        })();
      } catch {
        // Never let boot freeze due to network/auth stalls.
        clearAccountState();
      } finally {
        await waitForMinimumBootDuration(bootStartedAt, requiredBootDurationMs, () => active);

        if (active) {
          window.clearTimeout(bootWatchdogId);
          setIsLoadingAccount(false);
          setIsBooting(false);
        }
      }
    };

    void runBoot();

    return () => {
      active = false;
      window.clearTimeout(bootWatchdogId);
    };
  }, [applyAccountStateCache, clearAccountState, refreshAccountState, supabaseReady]);

  useEffect(() => {
    if (!supabaseReady || !isNativePlatform()) {
      return;
    }

    let active = true;
    let removeListener: (() => Promise<void>) | null = null;

    void (async () => {
      const { App } = await import('@capacitor/app');
      const listener = await App.addListener('appStateChange', ({ isActive }) => {
        logNativeAuthEvent('app-state-change', { isActive });

        if (!isActive) {
          return;
        }

        void (async () => {
          const sessionState = await ensureBrowserSession({
            forceRefresh: true,
            reason: 'app-resume',
          });

          if (!active) {
            return;
          }

          if (!sessionState.hasSession && !isSignedIn) {
            return;
          }

          void refreshAccountState({ silent: true });
          void syncSignedInProgress({ silent: true });
        })();
      });

      removeListener = () => listener.remove();
    })();

    return () => {
      active = false;
      if (removeListener) {
        void removeListener();
      }
    };
  }, [isSignedIn, refreshAccountState, supabaseReady, syncSignedInProgress]);

  useEffect(() => {
    if (!supabaseReady || !isSignedIn) {
      return;
    }

    const triggerSignedInProgressSync = () => {
      void syncSignedInProgress({ silent: true });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        triggerSignedInProgressSync();
      }
    };

    const intervalId = window.setInterval(triggerSignedInProgressSync, SIGNED_IN_PROGRESS_SYNC_INTERVAL_MS);
    window.addEventListener('focus', triggerSignedInProgressSync);
    window.addEventListener('online', triggerSignedInProgressSync);
    window.addEventListener('pageshow', triggerSignedInProgressSync);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', triggerSignedInProgressSync);
      window.removeEventListener('online', triggerSignedInProgressSync);
      window.removeEventListener('pageshow', triggerSignedInProgressSync);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isSignedIn, supabaseReady, syncSignedInProgress]);

  useEffect(() => {
    if (!supabaseReady) {
      return;
    }

    const supabase = getSupabaseBrowserClient();

    const handleAccountStateChanged = () => {
      void refreshAccountState({ silent: true });
    };

    window.addEventListener(ACCOUNT_STATE_CHANGED_EVENT, handleAccountStateChanged);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      logNativeAuthEvent('auth-state-change', {
        event,
        hasSession: Boolean(session?.user),
        userId: session?.user.id ?? null,
      });

      if (event === 'SIGNED_OUT' || (event === 'TOKEN_REFRESHED' && !session)) {
        clearAccountState();
        resetLocalStateForGuestSession();
        clearAccountStateCache();
        return;
      }

      if (session?.user) {
        setIsSignedIn(true);
      }

      void refreshAccountState({ silent: true });
    });

    return () => {
      window.removeEventListener(ACCOUNT_STATE_CHANGED_EVENT, handleAccountStateChanged);
      subscription.unsubscribe();
    };
  }, [clearAccountState, refreshAccountState, supabaseReady]);

  const value = useMemo<AccountStateContextValue>(() => ({
    isLoadingAccount,
    isSignedIn,
    isBooting,
    isBackgroundSyncing,
    isAppChromeVisible,
    accountEmail,
    accountUsername,
    accountAvatarPalette,
    accountJoinedMonthYear,
    accountAvatarFakeBirdKey,
    accountAvatarFakeBirdImageUrl,
    accountPrivacyMode,
    isHouseAccount,
    remoteSummary,
    remoteUnlockedThemes,
    weeklyOverview,
    refreshAccountState: () => refreshAccountState(),
    syncSignedInProgress: () => syncSignedInProgress({ silent: true }),
  }), [accountAvatarFakeBirdImageUrl, accountAvatarFakeBirdKey, accountAvatarPalette, accountEmail, accountJoinedMonthYear, accountPrivacyMode, accountUsername, isAppChromeVisible, isBackgroundSyncing, isBooting, isHouseAccount, isLoadingAccount, isSignedIn, refreshAccountState, remoteSummary, remoteUnlockedThemes, syncSignedInProgress, weeklyOverview]);

  return (
    <AccountStateContext.Provider value={value}>
      <motion.div
        initial={false}
        animate={isContentVisible ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: prefersReducedMotion ? 0 : 0.38, ease: [0.22, 1, 0.36, 1] }}
        className="flex min-h-dvh flex-1 flex-col"
      >
        {children}
      </motion.div>
      <AnimatePresence>
        {isBooting ? (
          <motion.div
            key="app-boot-screen"
            initial={{ opacity: 1, x: 0, scale: 1 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -72, scale: 0.985 }}
            transition={{ duration: prefersReducedMotion ? 0 : BOOT_EXIT_DURATION_MS / 1000, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-[100] overflow-hidden"
          >
            <AppBootScreen
              progress={getBootStageProgress(bootStage)}
              status={getBootStageCopy(bootStage)}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </AccountStateContext.Provider>
  );
}

export function useAccountState(): AccountStateContextValue {
  const context = useContext(AccountStateContext);

  if (!context) {
    throw new Error('useAccountState must be used within an AccountStateProvider.');
  }

  return context;
}
