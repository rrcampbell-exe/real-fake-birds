import { render, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Hoisted: runs before any module evaluation so NEXT_PUBLIC_POSTHOG_KEY is
// already set when AnalyticsProvider.tsx is imported for the static-import
// identity tests at the bottom of this file.
// ---------------------------------------------------------------------------
const { posthogSharedMock, getConsentMock, useAccountStateMock } = vi.hoisted(() => {
  process.env.NEXT_PUBLIC_POSTHOG_KEY = 'phc_hoisted_test_key';
  delete process.env.NEXT_PUBLIC_POSTHOG_HOST;

  return {
    posthogSharedMock: {
      init: vi.fn(),
      identify: vi.fn(),
      reset: vi.fn(),
      register: vi.fn(),
      unregister: vi.fn(),
      get_distinct_id: vi.fn(() => 'other-user'),
      onFeatureFlags: vi.fn(),
      opt_in_capturing: vi.fn(),
      __loaded: false,
    },
    getConsentMock: vi.fn(() => 'accepted' as 'accepted' | 'declined' | null),
    useAccountStateMock: vi.fn(() => ({
      accountUsername: null as string | null,
      isHouseAccount: false,
    })),
  };
});

vi.mock('posthog-js', () => ({ default: posthogSharedMock }));
vi.mock('@/lib/analytics/consent', () => ({ getAnalyticsConsent: getConsentMock }));
vi.mock('@/lib/supabase/env', () => ({ hasSupabaseEnv: vi.fn(() => true) }));
vi.mock('@/components/account/AccountStateProvider', () => ({
  useAccountState: useAccountStateMock,
}));
vi.mock('@/lib/analytics', () => ({
  clearAnalyticsUsername: vi.fn(),
  setAnalyticsUsername: vi.fn(),
}));

// Static import for identity tests (postHogKey evaluated from hoisted env var).
import AnalyticsProvider from './AnalyticsProvider';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makePosthogMock() {
  return {
    init: vi.fn(),
    identify: vi.fn(),
    reset: vi.fn(),
    register: vi.fn(),
    unregister: vi.fn(),
    get_distinct_id: vi.fn(() => null),
    onFeatureFlags: vi.fn(),
    opt_in_capturing: vi.fn(),
    __loaded: false,
  };
}

// ---------------------------------------------------------------------------
// Initialization tests
// Each test gets a fresh module instance (and therefore hasInitializedPostHog
// starting as false) via vi.resetModules() + vi.doMock() + dynamic import.
// ---------------------------------------------------------------------------
describe('AnalyticsProvider – initialization', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  function setupInitMocks(ph: ReturnType<typeof makePosthogMock>, consent: 'accepted' | null) {
    vi.doMock('posthog-js', () => ({ default: ph }));
    vi.doMock('@/lib/analytics/consent', () => ({
      getAnalyticsConsent: vi.fn(() => consent),
    }));
    vi.doMock('@/lib/supabase/env', () => ({ hasSupabaseEnv: vi.fn(() => true) }));
    vi.doMock('@/components/account/AccountStateProvider', () => ({
      useAccountState: vi.fn(() => ({ accountUsername: null, isHouseAccount: false })),
    }));
    vi.doMock('@/lib/analytics', () => ({
      clearAnalyticsUsername: vi.fn(),
      setAnalyticsUsername: vi.fn(),
    }));
  }

  it('calls posthog.init with correct host when key and consent are set', async () => {
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', 'phc_test_key');
    const ph = makePosthogMock();
    setupInitMocks(ph, 'accepted');

    const { default: AP } = await import('./AnalyticsProvider');
    await act(async () => {
      render(<AP />);
    });

    expect(ph.init).toHaveBeenCalledOnce();
    expect(ph.init).toHaveBeenCalledWith(
      'phc_test_key',
      expect.objectContaining({
        api_host: 'https://us.i.posthog.com',
        autocapture: false,
        capture_pageview: false,
        capture_pageleave: false,
        person_profiles: 'identified_only',
      })
    );
  });

  it('does not call posthog.init when NEXT_PUBLIC_POSTHOG_KEY is absent', async () => {
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', '');
    const ph = makePosthogMock();
    setupInitMocks(ph, 'accepted');

    const { default: AP } = await import('./AnalyticsProvider');
    await act(async () => {
      render(<AP />);
    });

    expect(ph.init).not.toHaveBeenCalled();
  });

  it('does not call posthog.init when consent is not accepted', async () => {
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', 'phc_test_key');
    const ph = makePosthogMock();
    setupInitMocks(ph, null);

    const { default: AP } = await import('./AnalyticsProvider');
    await act(async () => {
      render(<AP />);
    });

    expect(ph.init).not.toHaveBeenCalled();
  });

  it('dispatches analytics-feature-flags-loaded after init', async () => {
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', 'phc_test_key');
    let flagsCallback: (() => void) | undefined;
    const ph = makePosthogMock();
    ph.onFeatureFlags.mockImplementation((cb: () => void) => {
      flagsCallback = cb;
    });
    setupInitMocks(ph, 'accepted');

    const { default: AP } = await import('./AnalyticsProvider');
    await act(async () => {
      render(<AP />);
    });

    const listener = vi.fn();
    window.addEventListener('analytics-feature-flags-loaded', listener);
    await act(async () => {
      flagsCallback?.();
    });
    expect(listener).toHaveBeenCalledOnce();
    window.removeEventListener('analytics-feature-flags-loaded', listener);
  });
});

// ---------------------------------------------------------------------------
// Identity management tests
// Use the static AnalyticsProvider import (postHogKey set via vi.hoisted).
// The identity effect is independent of hasInitializedPostHog.
// ---------------------------------------------------------------------------
describe('AnalyticsProvider – identity management', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    posthogSharedMock.get_distinct_id.mockReturnValue('other-user');
    getConsentMock.mockReturnValue('accepted');
  });

  it('calls posthog.identify when accountUsername is set', async () => {
    useAccountStateMock.mockReturnValue({ accountUsername: 'birder', isHouseAccount: false });

    await act(async () => {
      render(<AnalyticsProvider />);
    });

    expect(posthogSharedMock.identify).toHaveBeenCalledWith(
      'birder',
      expect.objectContaining({ username: 'birder', email: null })
    );
    expect(posthogSharedMock.register).toHaveBeenCalledWith({ username: 'birder' });
  });

  it('calls posthog.reset when accountUsername is null', async () => {
    useAccountStateMock.mockReturnValue({ accountUsername: null, isHouseAccount: false });

    await act(async () => {
      render(<AnalyticsProvider />);
    });

    expect(posthogSharedMock.reset).toHaveBeenCalledWith(true);
    expect(posthogSharedMock.identify).not.toHaveBeenCalled();
  });

  it('skips identify for house accounts', async () => {
    useAccountStateMock.mockReturnValue({ accountUsername: 'house-acct', isHouseAccount: true });

    await act(async () => {
      render(<AnalyticsProvider />);
    });

    expect(posthogSharedMock.identify).not.toHaveBeenCalled();
    expect(posthogSharedMock.reset).not.toHaveBeenCalled();
  });

  it('skips identity work when consent is not accepted', async () => {
    getConsentMock.mockReturnValue(null);
    useAccountStateMock.mockReturnValue({ accountUsername: 'birder', isHouseAccount: false });

    await act(async () => {
      render(<AnalyticsProvider />);
    });

    expect(posthogSharedMock.identify).not.toHaveBeenCalled();
  });
});
