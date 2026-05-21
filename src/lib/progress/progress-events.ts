import { progressMilestones } from '@/lib/constants/milestones';
import { getStreakReward } from '@/lib/constants/streaks';
import { getThemeUnlockByMilestoneValue } from '@/lib/constants/theme-unlocks';
import { defaultBirdScore, normalizeBirdScore } from '@/lib/utils/player-progress';
import type { BirdScore, GameMode } from '@/types';

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
      eventType: 'mission-reward-granted';
      occurredAt: string;
      payload: {
        missionDate: string;
        missionId: string;
        rewardSeeds: number;
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
  return getStreakReward(currentStreak);
}

export function createProgressSnapshot(partial?: Partial<ProgressSnapshot>): ProgressSnapshot {
  return {
    score: normalizeBirdScore(partial?.score ?? defaultBirdScore),
    unlockedThemes: uniqueStrings(partial?.unlockedThemes ?? []),
    milestoneValues: uniqueNumbers(partial?.milestoneValues ?? []),
  };
}

export function applyProgressEvents(
  initialSnapshot: ProgressSnapshot,
  events: ProgressEvent[]
): ProgressSnapshot {
  let snapshot = createProgressSnapshot(initialSnapshot);

  for (const event of events) {
    if (event.eventType === 'mission-reward-granted') {
      snapshot = {
        ...snapshot,
        score: {
          ...snapshot.score,
          seeds: snapshot.score.seeds + Math.max(0, Math.floor(event.payload.rewardSeeds)),
        },
      };
      continue;
    }

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
    const seedsEarned = typeof event.payload.seedsEarned === 'number'
      ? Math.max(0, Math.floor(event.payload.seedsEarned))
      : event.payload.isCorrect
        ? BASE_CORRECT_SEED_REWARD + calculateStreakSeedReward(nextCurrentStreak)
        : 0;
    const nextSeeds = snapshot.score.seeds + seedsEarned;

    const nextMilestones = uniqueNumbers([
      ...snapshot.milestoneValues,
      ...progressMilestones
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
      milestoneValues: nextMilestones,
    };
  }

  return createProgressSnapshot(snapshot);
}
