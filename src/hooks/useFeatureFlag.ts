'use client';

import { useCallback, useEffect, useState } from 'react';
import posthog from 'posthog-js';

const CACHE_PREFIX = 'analytics-ff:';

function readCachedFlag(flagKey: string): boolean | string | null {
  try {
    const raw = localStorage.getItem(`${CACHE_PREFIX}${flagKey}`);
    if (raw === null) return null;
    if (raw === 'true') return true;
    if (raw === 'false') return false;
    return raw;
  } catch {
    return null;
  }
}

function writeCachedFlag(flagKey: string, value: boolean | string): void {
  try {
    localStorage.setItem(`${CACHE_PREFIX}${flagKey}`, String(value));
  } catch {
    // ignore storage errors
  }
}

/**
 * Returns the current value of a PostHog feature flag.
 *
 * - Returns the cached localStorage value immediately on mount to avoid layout
 *   shifts while PostHog loads.
 * - Refreshes the value from PostHog when feature flags finish loading
 *   (signalled by the `analytics-feature-flags-loaded` DOM event).
 * - Returns `false` if PostHog is unavailable or consent has not been granted.
 */
export function useFeatureFlag(flagKey: string): boolean | string | null {
  const [value, setValue] = useState<boolean | string | null>(() => readCachedFlag(flagKey));

  const refreshFlag = useCallback(() => {
    const flag = posthog.isFeatureEnabled(flagKey);
    if (flag !== undefined) {
      writeCachedFlag(flagKey, flag);
      setValue(flag);
      return;
    }

    // posthog.getFeatureFlagPayload returns string/object variants; fall back to
    // isFeatureEnabled which covers boolean flags.
    const rawFlag = posthog.getFeatureFlag(flagKey);
    if (rawFlag !== undefined && rawFlag !== null) {
      const coerced = typeof rawFlag === 'string' ? rawFlag : Boolean(rawFlag);
      writeCachedFlag(flagKey, coerced);
      setValue(coerced);
    }
  }, [flagKey]);

  useEffect(() => {
    refreshFlag();

    const handler = () => refreshFlag();
    window.addEventListener('analytics-feature-flags-loaded', handler);
    return () => window.removeEventListener('analytics-feature-flags-loaded', handler);
  }, [refreshFlag]);

  return value;
}
