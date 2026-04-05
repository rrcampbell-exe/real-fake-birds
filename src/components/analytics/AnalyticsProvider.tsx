'use client';

import { useEffect } from 'react';
import posthog from 'posthog-js';
import { useAccountState } from '@/components/account/AccountStateProvider';
import { clearAnalyticsUsername, setAnalyticsUsername } from '@/lib/analytics';
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
  const { accountUsername } = useAccountState();

  useEffect(() => {
    if (!postHogKey || typeof window === 'undefined') {
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

    hasInitializedPostHog = true;
  }, []);

  useEffect(() => {
    if (!postHogKey || typeof window === 'undefined' || !hasSupabaseEnv()) {
      return;
    }

    if (!accountUsername) {
      clearAnalyticsUsername();
      posthog.reset(true);
      clearEmailIdentityArtifacts();
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
  }, [accountUsername]);

  return null;
}