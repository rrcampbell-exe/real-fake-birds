'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { fetchAccountState } from '@/lib/auth/account-sync';
import { ACCOUNT_STATE_CHANGED_EVENT, resetLocalStateForGuestSession } from '@/lib/auth/account-session';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { hasSupabaseEnv } from '@/lib/supabase/env';
import { setUnlockedThemeNames } from '@/lib/utils/player-progress';
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

type AccountStateContextValue = {
  isLoadingAccount: boolean;
  accountEmail: string | null;
  accountUsername: string | null;
  remoteSummary: RemoteProgressSummary | null;
  remoteUnlockedThemes: string[];
  weeklyOverview: WeeklyOverview | null;
  refreshAccountState: () => Promise<void>;
};

const AccountStateContext = createContext<AccountStateContextValue | null>(null);

export function AccountStateProvider({ children }: { children: ReactNode }) {
  const supabaseReady = hasSupabaseEnv();
  const [isLoadingAccount, setIsLoadingAccount] = useState(true);
  const [accountEmail, setAccountEmail] = useState<string | null>(null);
  const [accountUsername, setAccountUsername] = useState<string | null>(null);
  const [remoteSummary, setRemoteSummary] = useState<RemoteProgressSummary | null>(null);
  const [remoteUnlockedThemes, setRemoteUnlockedThemes] = useState<string[]>([]);
  const [weeklyOverview, setWeeklyOverview] = useState<WeeklyOverview | null>(null);

  const clearAccountState = useCallback(() => {
    setAccountEmail(null);
    setAccountUsername(null);
    setRemoteSummary(null);
    setRemoteUnlockedThemes([]);
    setWeeklyOverview(null);
  }, []);

  const refreshAccountState = useCallback(async () => {
    if (!supabaseReady) {
      clearAccountState();
      setIsLoadingAccount(false);
      return;
    }

    const supabase = getSupabaseBrowserClient();
    setIsLoadingAccount(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const sessionUser = sessionData.session?.user;

      if (!sessionUser) {
        clearAccountState();
        return;
      }

      const accountState = await fetchAccountState();
      setAccountEmail(accountState.email);
      setAccountUsername(accountState.profile?.username ?? null);
      setRemoteSummary(accountState.progressSummary);
      setRemoteUnlockedThemes(accountState.unlockedThemes);
      setWeeklyOverview(accountState.weeklyOverview);
      setUnlockedThemeNames(accountState.unlockedThemes);
    } catch {
      clearAccountState();
    } finally {
      setIsLoadingAccount(false);
    }
  }, [clearAccountState, supabaseReady]);

  useEffect(() => {
    if (!supabaseReady) {
      clearAccountState();
      setIsLoadingAccount(false);
      return;
    }

    const supabase = getSupabaseBrowserClient();

    void refreshAccountState();

    const handleAccountStateChanged = () => {
      void refreshAccountState();
    };

    window.addEventListener(ACCOUNT_STATE_CHANGED_EVENT, handleAccountStateChanged);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      clearAccountState();

      if (event === 'SIGNED_OUT') {
        resetLocalStateForGuestSession();
      }

      void refreshAccountState();
    });

    return () => {
      window.removeEventListener(ACCOUNT_STATE_CHANGED_EVENT, handleAccountStateChanged);
      subscription.unsubscribe();
    };
  }, [clearAccountState, refreshAccountState, supabaseReady]);

  const value = useMemo<AccountStateContextValue>(() => ({
    isLoadingAccount,
    accountEmail,
    accountUsername,
    remoteSummary,
    remoteUnlockedThemes,
    weeklyOverview,
    refreshAccountState,
  }), [accountEmail, accountUsername, isLoadingAccount, refreshAccountState, remoteSummary, remoteUnlockedThemes, weeklyOverview]);

  return (
    <AccountStateContext.Provider value={value}>
      {children}
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