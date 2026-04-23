'use client';

import { useEffect, useState } from 'react';
import posthog from 'posthog-js';
import { useAccountState } from '@/components/account/AccountStateProvider';
import { clearAnalyticsUsername, setAnalyticsUsername } from '@/lib/analytics';
import { getAnalyticsConsent } from '@/lib/analytics/consent';
import { hasSupabaseEnv } from '@/lib/supabase/env';

function clearEmailIdentityArtifacts(): void {
  if (typeof (posthog as { unregister?: (key: string) => void }).unregister === 'function') {
    posthog.unregister?.('email');
  }
}

const postHogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const postHogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com';
let hasInitializedPostHog = false;

export default function AnalyticsProvider() {
  const { accountUsername, isHouseAccount } = useAccountState();
  const [consentVersion, setConsentVersion] = useState(0);

  useEffect(() => {
    const handleConsentChange = () => setConsentVersion((v) => v + 1);
    window.addEventListener('analytics-consent-changed', handleConsentChange);
    return () => window.removeEventListener('analytics-consent-changed', handleConsentChange);
  }, []);

  useEffect(() => {
    if (!postHogKey || typeof window === 'undefined') {
      return;
    }

    if (getAnalyticsConsent() !== 'accepted') {
      return;
    }

    if (hasInitializedPostHog || (posthog as { __loaded?: boolean }).__loaded) {
      hasInitializedPostHog = true;
      return;
    }

    posthog.init(postHogKey, {
      api_host: postHogHost,
      autocapture: false,
      capture_pageview: false,
      capture_pageleave: false,
      persistence: 'localStorage+cookie',
      person_profiles: 'identified_only',
    });

    posthog.onFeatureFlags(() => {
      window.dispatchEvent(new Event('analytics-feature-flags-loaded'));
    });

    hasInitializedPostHog = true;
  }, [consentVersion]);

  useEffect(() => {
    if (!postHogKey || typeof window === 'undefined' || !hasSupabaseEnv()) {
      return;
    }

    if (getAnalyticsConsent() !== 'accepted') {
      return;
    }

    if (!accountUsername) {
      clearAnalyticsUsername();
      posthog.reset(true);
      clearEmailIdentityArtifacts();
      return;
    }

    if (isHouseAccount) {
      clearAnalyticsUsername();
      return;
    }

    setAnalyticsUsername(accountUsername);

    const currentDistinctId = typeof posthog.get_distinct_id === 'function'
      ? posthog.get_distinct_id()
      : null;

    if (currentDistinctId && currentDistinctId !== accountUsername) {
      posthog.reset(true);
      clearEmailIdentityArtifacts();
    }

    posthog.identify(accountUsername, {
      name: accountUsername,
      username: accountUsername,
      email: null,
    });

    clearEmailIdentityArtifacts();
    posthog.register({ username: accountUsername });
  }, [accountUsername, isHouseAccount, consentVersion]);

  return null;
}