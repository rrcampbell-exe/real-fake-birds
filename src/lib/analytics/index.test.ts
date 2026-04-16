import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { posthogMock } = vi.hoisted(() => ({
  posthogMock: {
    capture: vi.fn(),
    identify: vi.fn(),
    register: vi.fn(),
    reset: vi.fn(),
    unregister: vi.fn(),
    get_distinct_id: vi.fn(),
  },
}));

vi.mock('posthog-js', () => ({
  default: posthogMock,
}));

vi.mock('./consent', () => ({
  getAnalyticsConsent: vi.fn(() => 'accepted'),
}));

import { getAnalyticsConsent } from './consent';

import {
  clearAnalyticsUsername,
  readAnalyticsUsername,
  setAnalyticsUsername,
  track,
  trackClientError,
  trackFirstPurchase,
  trackSessionStart,
} from './index';

describe('analytics helpers', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', 'posthog-key');
    Object.values(posthogMock).forEach((value) => value.mockReset());
    posthogMock.get_distinct_id.mockReturnValue('someone-else');
    vi.mocked(getAnalyticsConsent).mockReturnValue('accepted');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('reads, writes, and clears the analytics username', () => {
    expect(readAnalyticsUsername()).toBeNull();

    setAnalyticsUsername('  birder  ');
    expect(readAnalyticsUsername()).toBe('birder');

    setAnalyticsUsername('   ');
    expect(readAnalyticsUsername()).toBe('birder');

    clearAnalyticsUsername();
    expect(readAnalyticsUsername()).toBeNull();
  });

  it('tracks with username identity and strips undefined properties', () => {
    setAnalyticsUsername('birder');

    track('share_created', {
      mode: 'daily',
      optional: undefined,
    } as never);

    expect(posthogMock.reset).toHaveBeenCalledWith(true);
    expect(posthogMock.unregister).toHaveBeenCalledWith('email');
    expect(posthogMock.identify).toHaveBeenCalledWith('birder', {
      name: 'birder',
      username: 'birder',
      email: null,
    });
    expect(posthogMock.register).toHaveBeenCalledWith({ username: 'birder' });
    expect(posthogMock.capture).toHaveBeenCalledWith('share_created', {
      mode: 'daily',
      username: 'birder',
    });
  });

  it('tracks without identity work when there is no username', () => {
    track('session_start');

    expect(posthogMock.identify).not.toHaveBeenCalled();
    expect(posthogMock.capture).toHaveBeenCalledWith('session_start', undefined);
  });

  it('tracks a session start only once per mode', () => {
    trackSessionStart('classic');
    trackSessionStart('classic');
    trackSessionStart('daily');

    expect(posthogMock.capture).toHaveBeenCalledTimes(2);
    expect(posthogMock.capture).toHaveBeenNthCalledWith(1, 'session_start', { mode: 'classic' });
    expect(posthogMock.capture).toHaveBeenNthCalledWith(2, 'session_start', { mode: 'daily' });
  });

  it('does nothing when the PostHog key is missing', () => {
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', '');

    track('session_start');
    trackSessionStart('classic');

    expect(posthogMock.capture).not.toHaveBeenCalled();
  });

  it('does not track when consent is not accepted', () => {
    vi.mocked(getAnalyticsConsent).mockReturnValue(null);

    track('session_start');

    expect(posthogMock.capture).not.toHaveBeenCalled();
  });

  it('swallows PostHog runtime errors so analytics cannot break the UI', () => {
    posthogMock.capture.mockImplementation(() => {
      throw new Error('capture failed');
    });

    expect(() => {
      track('session_start');
    }).not.toThrow();
  });

  it('tracks normalized client error details', () => {
    trackClientError('journal_open_details_failed', new TypeError('sync failed'), {
      screen: 'journal',
      bird_key: 'real:owl',
    });

    expect(posthogMock.capture).toHaveBeenCalledWith('client_error_reported', {
      error_context: 'journal_open_details_failed',
      error_name: 'TypeError',
      error_message: 'sync failed',
      screen: 'journal',
      bird_key: 'real:owl',
    });
  });

  it('tracks string-based client errors as UnknownError', () => {
    trackClientError('journal_progress_flush_failed', 'network timeout');

    expect(posthogMock.capture).toHaveBeenCalledWith('client_error_reported', {
      error_context: 'journal_progress_flush_failed',
      error_name: 'UnknownError',
      error_message: 'network timeout',
    });
  });

  it('does not track session start when consent is declined', () => {
    vi.mocked(getAnalyticsConsent).mockReturnValue('declined');

    trackSessionStart('classic');

    expect(posthogMock.capture).not.toHaveBeenCalled();
  });

  it('records first session timestamp on first trackSessionStart call', () => {
    expect(localStorage.getItem('analytics-first-session-ts')).toBeNull();

    trackSessionStart('classic');

    expect(localStorage.getItem('analytics-first-session-ts')).not.toBeNull();
  });

  it('does not overwrite existing first session timestamp', () => {
    localStorage.setItem('analytics-first-session-ts', '12345');

    trackSessionStart('classic');

    expect(localStorage.getItem('analytics-first-session-ts')).toBe('12345');
  });

  it('includes seeds_balance from birdScore localStorage in session_start', () => {
    localStorage.setItem('birdScore', JSON.stringify({ seeds: 42 }));

    trackSessionStart('daily');

    expect(posthogMock.capture).toHaveBeenCalledWith('session_start', { mode: 'daily', seeds_balance: 42 });
  });

  it('fires time_to_first_purchase once with purchase_type and seconds', () => {
    localStorage.setItem('analytics-first-session-ts', (Date.now() - 10000).toString());

    trackFirstPurchase('theme');

    expect(posthogMock.capture).toHaveBeenCalledWith(
      'time_to_first_purchase',
      expect.objectContaining({ purchase_type: 'theme' })
    );
  });

  it('does not fire time_to_first_purchase a second time', () => {
    localStorage.setItem('analytics-first-session-ts', Date.now().toString());

    trackFirstPurchase('hint_fact');
    trackFirstPurchase('hint_image');

    expect(posthogMock.capture).toHaveBeenCalledTimes(1);
  });

  it('does not fire trackFirstPurchase when consent is missing', () => {
    vi.mocked(getAnalyticsConsent).mockReturnValue(null);

    trackFirstPurchase('streak_insurance');

    expect(posthogMock.capture).not.toHaveBeenCalled();
  });
});
