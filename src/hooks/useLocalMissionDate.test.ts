import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useLocalMissionDate } from './useLocalMissionDate';

describe('useLocalMissionDate', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 3, 6, 23, 59, 50));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('rolls over to the next local mission date after midnight without a page reload', async () => {
    const { result } = renderHook(() => useLocalMissionDate());

    expect(result.current).toBe('2026-04-06');

    await act(async () => {
      vi.advanceTimersByTime(15_000);
    });

    expect(result.current).toBe('2026-04-07');
  });

  it('refreshes on focus and pageshow after the date changes', async () => {
    const { result } = renderHook(() => useLocalMissionDate());

    vi.setSystemTime(new Date(2026, 3, 7, 8, 0, 0));

    act(() => {
      window.dispatchEvent(new Event('focus'));
    });
    expect(result.current).toBe('2026-04-07');

    vi.setSystemTime(new Date(2026, 3, 8, 8, 0, 0));
    act(() => {
      window.dispatchEvent(new Event('pageshow'));
    });
    expect(result.current).toBe('2026-04-08');
  });

  it('only refreshes on visibilitychange when the page becomes visible', async () => {
    const { result } = renderHook(() => useLocalMissionDate());

    vi.setSystemTime(new Date(2026, 3, 7, 8, 0, 0));

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
