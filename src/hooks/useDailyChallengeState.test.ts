import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const trackMock = vi.fn();

vi.mock('@/lib/analytics', () => ({
  track: (...args: unknown[]) => trackMock(...args),
}));

import { useDailyChallengeState } from './useDailyChallengeState';
import { writeDailyChallengeState } from '@/lib/utils/daily-challenge';

describe('useDailyChallengeState', () => {
  beforeEach(() => {
    localStorage.clear();
    trackMock.mockReset();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-06T23:59:50.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('resets the active daily challenge when the UTC day changes', async () => {
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

  it('computes rounds remaining and canPlay for an in-progress challenge', () => {
    writeDailyChallengeState({
      date: '2026-04-06',
      roundsPlayed: 2,
      correctAnswers: 1,
      completed: false,
      completionBonusAwarded: false,
      perfectBonusAwarded: false,
      bonusSeedsAwarded: 0,
      roundResults: [true, false],
    });

    const { result } = renderHook(() => useDailyChallengeState());

    expect(result.current.roundsRemaining).toBe(3);
    expect(result.current.canPlay).toBe(true);
    expect(result.current.challengeStreak).toBe(0);
  });

  it('tracks completion when recordRound finishes the challenge', () => {
    writeDailyChallengeState({
      date: '2026-04-06',
      roundsPlayed: 4,
      correctAnswers: 4,
      completed: false,
      completionBonusAwarded: false,
      perfectBonusAwarded: false,
      bonusSeedsAwarded: 0,
      roundResults: [true, true, true, true],
    });

    const { result } = renderHook(() => useDailyChallengeState());

    act(() => {
      result.current.recordRound({ isCorrect: true } as never);
    });

    expect(trackMock).toHaveBeenCalledWith('daily_challenge_completed', {
      correct_answers: 5,
      rounds_played: 5,
      bonus_seeds_awarded: 75,
    });
  });

  it('does not track when recordRound does not finish the challenge', () => {
    writeDailyChallengeState({
      date: '2026-04-06',
      roundsPlayed: 1,
      correctAnswers: 1,
      completed: false,
      completionBonusAwarded: false,
      perfectBonusAwarded: false,
      bonusSeedsAwarded: 0,
      roundResults: [true],
    });

    const { result } = renderHook(() => useDailyChallengeState());

    act(() => {
      result.current.recordRound({ isCorrect: false } as never);
    });

    expect(trackMock).not.toHaveBeenCalled();
  });
});
