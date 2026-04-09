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

import {
  clearAnalyticsUsername,
  readAnalyticsUsername,
  setAnalyticsUsername,
  track,
  trackSessionStart,
} from './index';

describe('analytics helpers', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', 'posthog-key');
    Object.values(posthogMock).forEach((value) => value.mockReset());
    posthogMock.get_distinct_id.mockReturnValue('someone-else');
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
});
