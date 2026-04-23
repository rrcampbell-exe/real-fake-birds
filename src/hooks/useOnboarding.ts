'use client';

import { useStoredJson } from '@/hooks/useStoredValue';
import { notifyStoredValueChanged } from '@/hooks/useStoredValue';

export const ONBOARDING_STORAGE_KEY = 'hasSeenOnboarding';

function markOnboardingSeen(): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(true));
  notifyStoredValueChanged(ONBOARDING_STORAGE_KEY);
}

export function useOnboarding() {
  const hasSeenOnboarding = useStoredJson<boolean | null>(ONBOARDING_STORAGE_KEY, null);

  return {
    shouldShowOnboarding: hasSeenOnboarding === null || hasSeenOnboarding === false,
    dismissOnboarding: markOnboardingSeen,
  };
}
