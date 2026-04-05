import { DAILY_CHALLENGE_CONFIG } from '@/lib/constants/daily-challenge';
import { milestones } from '@/lib/constants/milestones';
import { streakValues } from '@/lib/constants/streaks';
import { getThemeUnlockByMilestoneValue } from '@/lib/constants/theme-unlocks';
import { defaultBirdScore, normalizeBirdScore } from '@/lib/utils/player-progress';
import type { BirdScore, DailyChallengeHistoryEntry, GameMode } from '@/types';

export type ProgressEvent =
  | {
      eventId: string;
      eventType: 'round-resolved';
      occurredAt: string;
      payload: {
        mode: GameMode;
        isCorrect: boolean;
        streakProtected: boolean;
        challengeDate?: string;
        birdKey?: string;
        isRealBird?: boolean;
        isNewBirdEncounter?: boolean;
        currentStreak?: number;
        seedsEarned?: number;
      };
    }
  | {
      eventId: string;
      eventType: 'hint-spent';
      occurredAt: string;
      payload: {
        mode: GameMode;
        cost: number;
      };
    }
  | {
      eventId: string;
      eventType: 'hint-refunded';
      occurredAt: string;
      payload: {
        mode: GameMode;
        cost: number;
      };
    };

export interface ProgressSnapshot {
  score: BirdScore;
  unlockedThemes: string[];
  dailyChallengeHistory: DailyChallengeHistoryEntry[];
  milestoneValues: number[];
}

const BASE_CORRECT_SEED_REWARD = 1;

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values)).sort((left, right) => left.localeCompare(right));
}

function uniqueNumbers(values: number[]): number[] {
  return Array.from(new Set(values)).sort((left, right) => left - right);
}

function calculateStreakSeedReward(currentStreak: number): number {
  if (!streakValues.includes(currentStreak)) {
    return 0;
  }

  return streakValues
    .filter((value) => value <= currentStreak)
    .reduce((totalSeeds, value) => totalSeeds + value, 0);
}

function normalizeHistory(history: DailyChallengeHistoryEntry[]): DailyChallengeHistoryEntry[] {
  return [...history]
    .map((entry) => ({
      date: entry.date,
      correctAnswers: Math.max(0, Math.floor(entry.correctAnswers)),
      roundsPlayed: Math.max(0, Math.floor(entry.roundsPlayed)),
      completed: Boolean(entry.completed),
    }))
    .sort((left, right) => right.date.localeCompare(left.date));
}

export function createProgressSnapshot(partial?: Partial<ProgressSnapshot>): ProgressSnapshot {
  return {
    score: normalizeBirdScore(partial?.score ?? defaultBirdScore),
    unlockedThemes: uniqueStrings(partial?.unlockedThemes ?? []),
    dailyChallengeHistory: normalizeHistory(partial?.dailyChallengeHistory ?? []),
    milestoneValues: uniqueNumbers(partial?.milestoneValues ?? []),
  };
}

function applyDailyRound(
  history: DailyChallengeHistoryEntry[],
  challengeDate: string,
  isCorrect: boolean
): DailyChallengeHistoryEntry[] {
  const historyByDate = new Map(history.map((entry) => [entry.date, entry]));
  const current = historyByDate.get(challengeDate) ?? {
    date: challengeDate,
    correctAnswers: 0,
    roundsPlayed: 0,
    completed: false,
  };

  const roundsPlayed = Math.min(current.roundsPlayed + 1, DAILY_CHALLENGE_CONFIG.roundCount);
  const updated: DailyChallengeHistoryEntry = {
    date: challengeDate,
    roundsPlayed,
    correctAnswers: current.correctAnswers + (isCorrect ? 1 : 0),
    completed: roundsPlayed >= DAILY_CHALLENGE_CONFIG.roundCount,
  };

  historyByDate.set(challengeDate, updated);
  return normalizeHistory(Array.from(historyByDate.values()));
}

export function applyProgressEvents(
  initialSnapshot: ProgressSnapshot,
  events: ProgressEvent[]
): ProgressSnapshot {
  let snapshot = createProgressSnapshot(initialSnapshot);

  for (const event of events) {
    if (event.eventType === 'hint-spent') {
      snapshot = {
        ...snapshot,
        score: {
          ...snapshot.score,
          seeds: Math.max(0, snapshot.score.seeds - Math.max(0, Math.floor(event.payload.cost))),
        },
      };
      continue;
    }

    if (event.eventType === 'hint-refunded') {
      snapshot = {
        ...snapshot,
        score: {
          ...snapshot.score,
          seeds: snapshot.score.seeds + Math.max(0, Math.floor(event.payload.cost)),
        },
      };
      continue;
    }

    const nextBirdsSeen = snapshot.score.birdsSeen + 1;
    const nextBirdsIdentified = snapshot.score.birdsIdentified + (event.payload.isCorrect ? 1 : 0);
    const nextCurrentStreak = event.payload.isCorrect
      ? snapshot.score.currentStreak + 1
      : event.payload.streakProtected
        ? snapshot.score.currentStreak
        : 0;
    const nextBestStreak = event.payload.isCorrect
      ? Math.max(snapshot.score.bestStreak, nextCurrentStreak)
      : snapshot.score.bestStreak;
    const seedsEarned = event.payload.isCorrect
      ? BASE_CORRECT_SEED_REWARD + calculateStreakSeedReward(nextCurrentStreak)
      : 0;
    const nextSeeds = snapshot.score.seeds + seedsEarned;

    let nextHistory = snapshot.dailyChallengeHistory;
    if (event.payload.mode === 'daily' && event.payload.challengeDate) {
      nextHistory = applyDailyRound(
        snapshot.dailyChallengeHistory,
        event.payload.challengeDate,
        event.payload.isCorrect
      );
    }
    const nextMilestones = uniqueNumbers([
      ...snapshot.milestoneValues,
      ...milestones
        .filter((milestone) => milestone.value <= nextBirdsIdentified)
        .map((milestone) => milestone.value),
    ]);
    const nextUnlockedThemes = uniqueStrings([
      ...snapshot.unlockedThemes,
      ...nextMilestones
        .map((milestoneValue) => getThemeUnlockByMilestoneValue(milestoneValue)?.themeName)
        .filter((themeName): themeName is string => Boolean(themeName)),
    ]);
    snapshot = {
      ...snapshot,
      score: {
        ...snapshot.score,
        birdsSeen: nextBirdsSeen,
        birdsIdentified: nextBirdsIdentified,
        currentStreak: nextCurrentStreak,
        bestStreak: nextBestStreak,
        seeds: nextSeeds,
      },
      unlockedThemes: nextUnlockedThemes,
      dailyChallengeHistory: nextHistory,
      milestoneValues: nextMilestones,
    };
  }

  return createProgressSnapshot(snapshot);
}
