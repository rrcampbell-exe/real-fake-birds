import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useDailyChallengeState } from './useDailyChallengeState';
import { writeDailyChallengeState } from '@/lib/utils/daily-challenge';

describe('useDailyChallengeState midnight rollover', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 3, 6, 23, 59, 50));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('resets the active daily challenge when the local day changes', async () => {
    writeDailyChallengeState({
      date: '2026-04-06',
      roundsPlayed: 5,
      correctAnswers: 4,
      completed: true,
      completionBonusAwarded: false,
      perfectBonusAwarded: false,
      bonusSeedsAwarded: 50,
      roundResults: [true, true, true, true, false],
    });

    const { result } = renderHook(() => useDailyChallengeState());

    expect(result.current.state.date).toBe('2026-04-06');
    expect(result.current.isComplete).toBe(true);

    await act(async () => {
      vi.advanceTimersByTime(15_000);
    });

    expect(result.current.state.date).toBe('2026-04-07');
    expect(result.current.isComplete).toBe(false);
    expect(result.current.state.roundsPlayed).toBe(0);
  });
});
