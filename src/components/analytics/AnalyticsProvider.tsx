'use client';

import { useEffect } from 'react';
import posthog from 'posthog-js';

const postHogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const postHogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com';

export default function AnalyticsProvider() {
  useEffect(() => {
    if (!postHogKey || typeof window === 'undefined') {
      return;
    }

    posthog.init(postHogKey, {
      api_host: postHogHost,
      autocapture: false,
      capture_pageview: false,
      capture_pageleave: false,
      persistence: 'localStorage+cookie',
      person_profiles: 'never',
    });
  }, []);

  return null;
}