import { beforeEach, describe, expect, it, vi } from 'vitest';
import { applyRoundToSessionMissions, createSessionMissionsStateForDate, getMissionDefinitionsForState, writeSessionMissions } from './missions';
import { BIRD_SCORE_STORAGE_KEY, defaultBirdScore } from './player-progress';
import type { GameRoundResult } from '@/types';

function buildRoundResult(overrides: Partial<GameRoundResult> = {}): GameRoundResult {
  return {
    isCorrect: true,
    isReal: true,
    chosenResponse: 'real',
    roundSeedsEarned: 1,
    seedsEarned: 1,
    currentStreak: 1,
    bestStreak: 1,
    birdsSeen: 1,
    birdsIdentified: 1,
    usedHintTypes: [],
    streakProtected: false,
    earnedBadgeName: null,
    unlockedThemeName: null,
    missionRewards: [],
    missionSetBonusSeedsEarned: 0,
    completedDailyMissionSet: false,
    dailyMissionStreak: null,
    ...overrides,
  };
}

describe('mission rewards', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(BIRD_SCORE_STORAGE_KEY, JSON.stringify(defaultBirdScore));
    vi.setSystemTime(new Date(2026, 3, 5, 12, 0, 0));
  });

  it('auto-claims mission rewards and credits seeds when a mission completes', () => {
    const date = '2026-04-05';
    const baseState = createSessionMissionsStateForDate(date);
    const mission = getMissionDefinitionsForState(baseState)[0];

    writeSessionMissions({
      ...baseState,
      missions: baseState.missions.map((missionState) =>
        missionState.missionId === mission.id
          ? {
              ...missionState,
              progress: Math.max(0, mission.target - 1),
              completed: false,
              claimed: false,
            }
          : missionState
      ),
    });

    const roundResult = buildRoundResult({
      isCorrect: true,
      isReal: mission.type !== 'identify_fake_birds',
      roundSeedsEarned: mission.type === 'earn_seeds' ? mission.target : 1,
      seedsEarned: mission.type === 'earn_seeds' ? mission.target : 1,
      usedHintTypes: mission.type === 'use_hints' ? ['fact'] : [],
    });

    const update = applyRoundToSessionMissions(roundResult);

    expect(update.missionRewards).toEqual([
      expect.objectContaining({
        missionId: mission.id,
        rewardSeeds: mission.rewardSeeds,
      }),
    ]);
    expect(update.nextState.missions.find((entry) => entry.missionId === mission.id)).toMatchObject({
      completed: true,
      claimed: true,
    });
    expect(JSON.parse(localStorage.getItem(BIRD_SCORE_STORAGE_KEY) ?? '{}')).toMatchObject({
      seeds: mission.rewardSeeds,
    });
  });
});