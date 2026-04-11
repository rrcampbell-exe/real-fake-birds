import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { posthogMock } = vi.hoisted(() => ({
  posthogMock: {
    isFeatureEnabled: vi.fn(),
    getFeatureFlag: vi.fn(),
  },
}));

vi.mock('posthog-js', () => ({
  default: posthogMock,
}));

import { useFeatureFlag } from './useFeatureFlag';

describe('useFeatureFlag', () => {
  beforeEach(() => {
    localStorage.clear();
    posthogMock.isFeatureEnabled.mockReturnValue(undefined);
    posthogMock.getFeatureFlag.mockReturnValue(undefined);
  });

  it('returns null when no cached value and PostHog has no value', () => {
    const { result } = renderHook(() => useFeatureFlag('my-flag'));
    expect(result.current).toBeNull();
  });

  it('returns the cached value immediately on mount', () => {
    localStorage.setItem('analytics-ff:my-flag', 'true');
    const { result } = renderHook(() => useFeatureFlag('my-flag'));
    expect(result.current).toBe(true);
  });

  it('reads a boolean flag from PostHog via isFeatureEnabled', () => {
    posthogMock.isFeatureEnabled.mockReturnValue(true);
    const { result } = renderHook(() => useFeatureFlag('my-flag'));
    expect(result.current).toBe(true);
    expect(localStorage.getItem('analytics-ff:my-flag')).toBe('true');
  });

  it('falls back to getFeatureFlag for string multivariate flags', () => {
    posthogMock.isFeatureEnabled.mockReturnValue(undefined);
    posthogMock.getFeatureFlag.mockReturnValue('variant-b');
    const { result } = renderHook(() => useFeatureFlag('my-flag'));
    expect(result.current).toBe('variant-b');
    expect(localStorage.getItem('analytics-ff:my-flag')).toBe('variant-b');
  });

  it('refreshes when the analytics-feature-flags-loaded event fires', () => {
    const { result } = renderHook(() => useFeatureFlag('my-flag'));
    expect(result.current).toBeNull();

    posthogMock.isFeatureEnabled.mockReturnValue(false);

    act(() => {
      window.dispatchEvent(new Event('analytics-feature-flags-loaded'));
    });

    expect(result.current).toBe(false);
  });

  it('removes the event listener on unmount', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    const { unmount } = renderHook(() => useFeatureFlag('my-flag'));
    unmount();
    expect(removeSpy).toHaveBeenCalledWith('analytics-feature-flags-loaded', expect.any(Function));
  });
});
