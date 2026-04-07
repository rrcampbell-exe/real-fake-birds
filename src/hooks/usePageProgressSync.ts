'use client';

import { useAccountState } from '@/components/account/AccountStateProvider';

export function usePageProgressSync() {
  const { isBooting, isBackgroundSyncing, isSignedIn } = useAccountState();

  return {
    isPageSyncLoading: isBooting,
    isPageBackgroundRefreshing: isSignedIn && isBackgroundSyncing,
    isSignedIn,
  };
}