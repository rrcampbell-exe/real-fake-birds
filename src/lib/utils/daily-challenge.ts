import { notifyStoredValueChanged } from '@/hooks/useStoredValue';
import {
  DAILY_CHALLENGE_CONFIG,
  DAILY_CHALLENGE_HISTORY_STORAGE_KEY,
  DAILY_CHALLENGE_STORAGE_KEY,
} from '@/lib/constants/daily-challenge';
import type { DailyChallengeHistoryEntry, DailyChallengeState } from '@/types';
import { readBirdScore, writeBirdScore } from './player-progress';

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

export function getTodayChallengeDate(now = new Date()): string {
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, '0');
  const day = `${now.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function createDailyChallengeState(date = getTodayChallengeDate()): DailyChallengeState {
  return {
    date,
    roundsPlayed: 0,
    correctAnswers: 0,
    completed: false,
    completionBonusAwarded: false,
    perfectBonusAwarded: false,
    bonusSeedsAwarded: 0,
    roundResults: [],
  };
}

function normalizeDailyChallengeState(
  stateLike: Partial<DailyChallengeState> | null | undefined,
  fallbackDate = getTodayChallengeDate()
): DailyChallengeState {
  return {
    date: typeof stateLike?.date === 'string' ? stateLike.date : fallbackDate,
    roundsPlayed: typeof stateLike?.roundsPlayed === 'number' ? stateLike.roundsPlayed : 0,
    correctAnswers: typeof stateLike?.correctAnswers === 'number' ? stateLike.correctAnswers : 0,
    completed: typeof stateLike?.completed === 'boolean' ? stateLike.completed : false,
    completionBonusAwarded:
      typeof stateLike?.completionBonusAwarded === 'boolean'
        ? stateLike.completionBonusAwarded
        : false,
    perfectBonusAwarded:
      typeof stateLike?.perfectBonusAwarded === 'boolean' ? stateLike.perfectBonusAwarded : false,
    bonusSeedsAwarded:
      typeof stateLike?.bonusSeedsAwarded === 'number' ? stateLike.bonusSeedsAwarded : 0,
    roundResults: Array.isArray(stateLike?.roundResults)
      ? stateLike.roundResults.filter((value): value is boolean => typeof value === 'boolean')
      : [],
  };
}

export function readDailyChallengeState(date = getTodayChallengeDate()): DailyChallengeState {
  if (!isBrowser()) {
    return createDailyChallengeState(date);
  }

  const raw = localStorage.getItem(DAILY_CHALLENGE_STORAGE_KEY);
  if (!raw) {
    return createDailyChallengeState(date);
  }

  try {
    const parsed = normalizeDailyChallengeState(JSON.parse(raw) as Partial<DailyChallengeState>, date);
    return parsed.date === date ? parsed : createDailyChallengeState(date);
  } catch {
    return createDailyChallengeState(date);
  }
}

export function writeDailyChallengeState(stateLike: Partial<DailyChallengeState>): DailyChallengeState {
  const state = normalizeDailyChallengeState(stateLike);
  localStorage.setItem(DAILY_CHALLENGE_STORAGE_KEY, JSON.stringify(state));
  notifyStoredValueChanged(DAILY_CHALLENGE_STORAGE_KEY);
  return state;
}

export function readDailyChallengeHistory(): DailyChallengeHistoryEntry[] {
  if (!isBrowser()) {
    return [];
  }

  const raw = localStorage.getItem(DAILY_CHALLENGE_HISTORY_STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(
      (entry): entry is DailyChallengeHistoryEntry =>
        Boolean(entry) &&
        typeof entry === 'object' &&
        typeof (entry as DailyChallengeHistoryEntry).date === 'string' &&
        typeof (entry as DailyChallengeHistoryEntry).correctAnswers === 'number' &&
        typeof (entry as DailyChallengeHistoryEntry).roundsPlayed === 'number' &&
        typeof (entry as DailyChallengeHistoryEntry).completed === 'boolean'
    );
  } catch {
    return [];
  }
}

export function writeDailyChallengeHistory(history: DailyChallengeHistoryEntry[]): DailyChallengeHistoryEntry[] {
  localStorage.setItem(DAILY_CHALLENGE_HISTORY_STORAGE_KEY, JSON.stringify(history));
  notifyStoredValueChanged(DAILY_CHALLENGE_HISTORY_STORAGE_KEY);
  return history;
}

export function getDailyChallengeHistoryStreak(history = readDailyChallengeHistory()): number {
  const sorted = [...history]
    .filter((entry) => entry.completed)
    .sort((left, right) => right.date.localeCompare(left.date));

  if (sorted.length === 0) {
    return 0;
  }

  let streak = 0;
  const cursor = new Date(`${sorted[0].date}T12:00:00`);

  for (const entry of sorted) {
    const expectedDate = getTodayChallengeDate(cursor);
    if (entry.date !== expectedDate) {
      break;
    }

    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

export function recordDailyChallengeRound(isCorrect: boolean): DailyChallengeState {
  const current = readDailyChallengeState();
  if (current.completed) {
    return current;
  }

  const roundsPlayed = Math.min(current.roundsPlayed + 1, DAILY_CHALLENGE_CONFIG.roundCount);
  const completed = roundsPlayed >= DAILY_CHALLENGE_CONFIG.roundCount;
  const nextState = writeDailyChallengeState({
    ...current,
    roundsPlayed,
    correctAnswers: current.correctAnswers + (isCorrect ? 1 : 0),
    roundResults: [...current.roundResults, isCorrect],
    completed,
  });

  const finalState = completed
    ? writeDailyChallengeState({
        ...nextState,
        bonusSeedsAwarded: getDailyChallengeRewardSeeds(nextState),
      })
    : nextState;

  if (finalState.completed) {
    const history = readDailyChallengeHistory().filter((entry) => entry.date !== finalState.date);
    writeDailyChallengeHistory([
      {
        date: finalState.date,
        correctAnswers: finalState.correctAnswers,
        roundsPlayed: finalState.roundsPlayed,
        completed: true,
      },
      ...history,
    ]);
  }

  return finalState;
}

export function getDailyChallengeRewardSeeds(
  state: DailyChallengeState = readDailyChallengeState()
): number {
  if (!state.completed) {
    return 0;
  }

  let rewardSeeds = DAILY_CHALLENGE_CONFIG.completionBonusSeeds;

  if (state.correctAnswers === DAILY_CHALLENGE_CONFIG.roundCount) {
    rewardSeeds += DAILY_CHALLENGE_CONFIG.perfectBonusSeeds;
  }

  return rewardSeeds;
}

export function getUnclaimedDailyChallengeRewardSeeds(
  state: DailyChallengeState = readDailyChallengeState()
): number {
  if (!state.completed) {
    return 0;
  }

  let rewardSeeds = 0;

  if (!state.completionBonusAwarded) {
    rewardSeeds += DAILY_CHALLENGE_CONFIG.completionBonusSeeds;
  }

  if (!state.perfectBonusAwarded && state.correctAnswers === DAILY_CHALLENGE_CONFIG.roundCount) {
    rewardSeeds += DAILY_CHALLENGE_CONFIG.perfectBonusSeeds;
  }

  return rewardSeeds;
}

export function claimDailyChallengeBonuses(): DailyChallengeState {
  const current = readDailyChallengeState();
  const rewardSeeds = getUnclaimedDailyChallengeRewardSeeds(current);

  if (!current.completed || rewardSeeds <= 0) {
    return current;
  }

  const score = readBirdScore();
  writeBirdScore({
    ...score,
    seeds: score.seeds + rewardSeeds,
  });

  return writeDailyChallengeState({
    ...current,
    completionBonusAwarded: true,
    perfectBonusAwarded: current.correctAnswers === DAILY_CHALLENGE_CONFIG.roundCount,
    bonusSeedsAwarded: getDailyChallengeRewardSeeds(current),
  });
}