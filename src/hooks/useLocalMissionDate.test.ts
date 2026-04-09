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
});