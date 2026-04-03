'use client';

import { useEffect, useMemo } from 'react';
import { useStoredJson } from './useStoredValue';
import {
  DAILY_CHALLENGE_CONFIG,
  DAILY_CHALLENGE_HISTORY_STORAGE_KEY,
  DAILY_CHALLENGE_STORAGE_KEY,
} from '@/lib/constants/daily-challenge';
import {
  createDailyChallengeState,
  getDailyChallengeRewardSeeds,
  getDailyChallengeHistoryStreak,
  getTodayChallengeDate,
  readDailyChallengeHistory,
  readDailyChallengeState,
  recordDailyChallengeRound,
  writeDailyChallengeState,
} from '@/lib/utils/daily-challenge';
import { track } from '@/lib/analytics';
import type { DailyChallengeHistoryEntry, DailyChallengeState, GameRoundResult } from '@/types';

export function useDailyChallengeState() {
  const today = getTodayChallengeDate();
  const storedState = useStoredJson<DailyChallengeState>(
    DAILY_CHALLENGE_STORAGE_KEY,
    createDailyChallengeState(today)
  );
  const history = useStoredJson<DailyChallengeHistoryEntry[]>(
    DAILY_CHALLENGE_HISTORY_STORAGE_KEY,
    readDailyChallengeHistory()
  );

  useEffect(() => {
    if (storedState.date !== today) {
      writeDailyChallengeState(readDailyChallengeState(today));
    }
  }, [storedState.date, today]);

  const state = useMemo(
    () => (storedState.date === today ? storedState : createDailyChallengeState(today)),
    [storedState, today]
  );

  const challengeStreak = useMemo(() => getDailyChallengeHistoryStreak(history), [history]);

  const recordRound = (roundResult: GameRoundResult) => {
    const updatedState = recordDailyChallengeRound(roundResult.isCorrect);
    if (updatedState.completed) {
      track('daily_challenge_completed', {
        correct_answers: updatedState.correctAnswers,
        rounds_played: updatedState.roundsPlayed,
        bonus_seeds_awarded: getDailyChallengeRewardSeeds(updatedState),
      });
    }

    return updatedState;
  };

  return {
    state,
    history,
    challengeStreak,
    roundsRemaining: Math.max(DAILY_CHALLENGE_CONFIG.roundCount - state.roundsPlayed, 0),
    isComplete: state.completed,
    canPlay: !state.completed,
    recordRound,
  };
}