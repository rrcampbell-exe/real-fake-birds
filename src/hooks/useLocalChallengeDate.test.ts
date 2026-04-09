import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useLocalChallengeDate } from './useLocalChallengeDate';

describe('useLocalChallengeDate', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-06T23:59:50.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('rolls over to the next UTC date after midnight without a page reload', async () => {
    const { result } = renderHook(() => useLocalChallengeDate());

    expect(result.current).toBe('2026-04-06');

    await act(async () => {
      vi.advanceTimersByTime(15_000);
    });

    expect(result.current).toBe('2026-04-07');
  });

  it('refreshes on focus and pageshow after the date changes', async () => {
    const { result } = renderHook(() => useLocalChallengeDate());

    vi.setSystemTime(new Date('2026-04-07T08:00:00.000Z'));
    act(() => {
      window.dispatchEvent(new Event('focus'));
    });
    expect(result.current).toBe('2026-04-07');

    vi.setSystemTime(new Date('2026-04-08T08:00:00.000Z'));
    act(() => {
      window.dispatchEvent(new Event('pageshow'));
    });
    expect(result.current).toBe('2026-04-08');
  });

  it('only refreshes on visibilitychange when the page becomes visible', async () => {
    const { result } = renderHook(() => useLocalChallengeDate());

    vi.setSystemTime(new Date('2026-04-07T08:00:00.000Z'));

    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'hidden',
    });
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(result.current).toBe('2026-04-06');

    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'visible',
    });
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(result.current).toBe('2026-04-07');
  });
});
