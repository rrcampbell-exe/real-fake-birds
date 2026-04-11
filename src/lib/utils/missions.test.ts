import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  applyJournalClassificationViewToSessionMissions,
  applyRoundToSessionMissions,
  applyStreakInsuranceUseToSessionMissions,
  buildMissionRewardGrantEvents,
  createMissionRewardSummary,
  createSessionMissionsStateForDate,
  getMissionDefinitionsForState,
  getMissionRewardEventId,
  readSessionMissions,
  resetSessionMissions,
  writeSessionMissions,
} from './missions';
import { BIRD_SCORE_STORAGE_KEY, defaultBirdScore } from './player-progress';
import { missionDefinitions } from '@/lib/constants/missions';
import type { GameRoundResult, MissionType } from '@/types';

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function findDateWithMissionIds(missionIds: string[], startDate = '2026-04-01', maxDays = 365): string {
  const cursor = new Date(`${startDate}T12:00:00.000Z`);

  for (let index = 0; index < maxDays; index += 1) {
    const date = formatDate(cursor);
    const missionIdSet = new Set(createSessionMissionsStateForDate(date).missions.map((mission) => mission.missionId));

    if (missionIds.every((missionId) => missionIdSet.has(missionId))) {
      return date;
    }

    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  throw new Error(`Unable to find mission date for: ${missionIds.join(', ')}`);
}

function findDateWithMissionTypes(
  allowedMissionTypes: MissionType[],
  startDate = '2026-04-01',
  maxDays = 365
): string {
  const allowedTypeSet = new Set(allowedMissionTypes);
  const cursor = new Date(`${startDate}T12:00:00.000Z`);

  for (let index = 0; index < maxDays; index += 1) {
    const date = formatDate(cursor);
    const missionTypes = getMissionDefinitionsForState(createSessionMissionsStateForDate(date)).map(
      (mission) => mission.type
    );

    if (missionTypes.every((missionType) => allowedTypeSet.has(missionType))) {
      return date;
    }

    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  throw new Error(`Unable to find mission date for mission types: ${allowedMissionTypes.join(', ')}`);
}

function setupMissionState(missionId: string) {
  const date = findDateWithMissionIds([missionId]);
  vi.setSystemTime(new Date(`${date}T12:00:00.000Z`));
  const baseState = createSessionMissionsStateForDate(date);
  const mission = getMissionDefinitionsForState(baseState).find((definition) => definition.id === missionId);

  if (!mission) {
    throw new Error(`Mission ${missionId} was not present for ${date}`);
  }

  return { date, baseState, mission };
}

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
    previousBestStreak: 1,
    justBrokeBestStreak: false,
    justLostBestStreak: false,
    personalBestRewardSeeds: 0,
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

  it('defines a 20-mission pool', () => {
    expect(missionDefinitions).toHaveLength(20);
    expect(missionDefinitions.some((mission) => mission.id === 'bird-brain')).toBe(true);
    expect(missionDefinitions.some((mission) => mission.id === 'true-colors')).toBe(true);
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
describe('incrementForMission – branch coverage', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(BIRD_SCORE_STORAGE_KEY, JSON.stringify(defaultBirdScore));
  });

  it('correct_without_hints increments for correct answer without hints', () => {
    const { baseState } = setupMissionState('no-peeking');
    writeSessionMissions({
      ...baseState,
      missions: baseState.missions.map((m) =>
        m.missionId === 'no-peeking' ? { ...m, progress: 1 } : m
      ),
    });

    const roundResult = buildRoundResult({ isCorrect: true, usedHintTypes: [] });
    const update = applyRoundToSessionMissions(roundResult);
    const missionEntry = update.nextState.missions.find((m) => m.missionId === 'no-peeking');
    expect(missionEntry?.progress).toBeGreaterThanOrEqual(2);
  });

  it('correct_without_hints does not increment when hints were used', () => {
    const { baseState } = setupMissionState('no-peeking');
    writeSessionMissions({
      ...baseState,
      missions: baseState.missions.map((m) =>
        m.missionId === 'no-peeking' ? { ...m, progress: 0 } : m
      ),
    });

    const roundResult = buildRoundResult({ isCorrect: true, usedHintTypes: ['fact'] });
    const update = applyRoundToSessionMissions(roundResult);
    const missionEntry = update.nextState.missions.find((m) => m.missionId === 'no-peeking');
    expect(missionEntry?.progress).toBe(0);
  });

  it('use_hints increments by the number of hints used', () => {
    const { baseState } = setupMissionState('field-notes');
    writeSessionMissions({
      ...baseState,
      missions: baseState.missions.map((m) =>
        m.missionId === 'field-notes' ? { ...m, progress: 0 } : m
      ),
    });

    const roundResult = buildRoundResult({ usedHintTypes: ['fact', 'sound'] });
    const update = applyRoundToSessionMissions(roundResult);
    const missionEntry = update.nextState.missions.find((m) => m.missionId === 'field-notes');
    expect(missionEntry?.progress).toBe(2);
  });

  it('use_hints does not increment when no hints were used', () => {
    const { baseState } = setupMissionState('field-notes');
    writeSessionMissions({
      ...baseState,
      missions: baseState.missions.map((m) =>
        m.missionId === 'field-notes' ? { ...m, progress: 0 } : m
      ),
    });

    const roundResult = buildRoundResult({ usedHintTypes: [] });
    const update = applyRoundToSessionMissions(roundResult);
    const missionEntry = update.nextState.missions.find((m) => m.missionId === 'field-notes');
    expect(missionEntry?.progress).toBe(0);
  });

  it('identify_fake_birds increments for correct fake bird identification', () => {
    const { baseState } = setupMissionState('fraud-watch');
    writeSessionMissions({
      ...baseState,
      missions: baseState.missions.map((m) =>
        m.missionId === 'fraud-watch' ? { ...m, progress: 1 } : m
      ),
    });

    const roundResult = buildRoundResult({ isCorrect: true, isReal: false });
    const update = applyRoundToSessionMissions(roundResult);
    const missionEntry = update.nextState.missions.find((m) => m.missionId === 'fraud-watch');
    expect(missionEntry?.completed).toBe(true);
  });

  it('identify_fake_birds does not increment for incorrect answer', () => {
    const { baseState } = setupMissionState('fraud-watch');
    writeSessionMissions({
      ...baseState,
      missions: baseState.missions.map((m) =>
        m.missionId === 'fraud-watch' ? { ...m, progress: 0 } : m
      ),
    });

    const roundResult = buildRoundResult({ isCorrect: false, isReal: false });
    const update = applyRoundToSessionMissions(roundResult);
    const missionEntry = update.nextState.missions.find((m) => m.missionId === 'fraud-watch');
    expect(missionEntry?.progress).toBe(0);
  });

  it('identify_real_birds increments for correct real bird identification', () => {
    const { baseState } = setupMissionState('real-deal');
    writeSessionMissions({
      ...baseState,
      missions: baseState.missions.map((m) =>
        m.missionId === 'real-deal' ? { ...m, progress: 1 } : m
      ),
    });

    const roundResult = buildRoundResult({ isCorrect: true, isReal: true });
    const update = applyRoundToSessionMissions(roundResult);
    const missionEntry = update.nextState.missions.find((m) => m.missionId === 'real-deal');
    expect(missionEntry?.completed).toBe(true);
  });

  it('identify_real_birds does not increment for fake bird', () => {
    const { baseState } = setupMissionState('real-deal');
    writeSessionMissions({
      ...baseState,
      missions: baseState.missions.map((m) =>
        m.missionId === 'real-deal' ? { ...m, progress: 0 } : m
      ),
    });

    const roundResult = buildRoundResult({ isCorrect: true, isReal: false });
    const update = applyRoundToSessionMissions(roundResult);
    const missionEntry = update.nextState.missions.find((m) => m.missionId === 'real-deal');
    expect(missionEntry?.progress).toBe(0);
  });

  it('completes the mission set bonus when all missions complete in one round', () => {
    const date = findDateWithMissionTypes([
      'play_rounds',
      'correct_answers',
      'correct_without_hints',
      'earn_seeds',
      'identify_real_birds',
      'identify_new_species',
      'reach_streak',
    ]);
    vi.setSystemTime(new Date(`${date}T12:00:00.000Z`));
    const baseState = createSessionMissionsStateForDate(date);
    const defs = getMissionDefinitionsForState(baseState);
    writeSessionMissions({
      ...baseState,
      missions: baseState.missions.map((m) => {
        const def = defs.find((d) => d.missionId === m.missionId);
        return def ? { ...m, progress: Math.max(0, def.target - 1) } : m;
      }),
    });

    const roundResult = buildRoundResult({
      isCorrect: true,
      isReal: true,
      roundSeedsEarned: 20,
      seedsEarned: 20,
      currentStreak: 20,
      usedHintTypes: [],
    });
    const update = applyRoundToSessionMissions(roundResult, { isNewBirdEncounter: true });
    expect(update.completedDailyMissionSet).toBe(true);
    expect(update.missionSetBonusSeedsEarned).toBeGreaterThan(0);
    expect(update.dailyMissionStreak).toBeGreaterThanOrEqual(1);
  });

  it('increments new-species missions when a round reveals a first-time encounter', () => {
    const { baseState } = setupMissionState('fresh-feathers');
    writeSessionMissions({
      ...baseState,
      missions: baseState.missions.map((mission) =>
        mission.missionId === 'fresh-feathers' ? { ...mission, progress: 1 } : mission
      ),
    });

    const update = applyRoundToSessionMissions(buildRoundResult(), {
      isNewBirdEncounter: true,
    });

    expect(update.nextState.missions.find((mission) => mission.missionId === 'fresh-feathers')).toMatchObject({
      completed: true,
      claimed: true,
    });
  });

  it('completes streak missions when the target streak is reached', () => {
    const { baseState } = setupMissionState('hot-streak');
    writeSessionMissions({
      ...baseState,
      missions: baseState.missions.map((mission) =>
        mission.missionId === 'hot-streak' ? { ...mission, progress: 0 } : mission
      ),
    });

    const update = applyRoundToSessionMissions(buildRoundResult({ currentStreak: 10 }));

    expect(update.nextState.missions.find((mission) => mission.missionId === 'hot-streak')).toMatchObject({
      completed: true,
      claimed: true,
    });
  });

  it('credits journal-classification missions when a journal detail view is opened', () => {
    const { date, baseState } = setupMissionState('journal-check-in');
    writeSessionMissions(baseState);

    const update = applyJournalClassificationViewToSessionMissions(date);

    expect(update.nextState.missions.find((mission) => mission.missionId === 'journal-check-in')).toMatchObject({
      completed: true,
      claimed: true,
    });
  });

  it('includes only missions that can progress from live product actions', () => {
    expect(missionDefinitions.every((mission) => mission.id !== 'daily-dedication')).toBe(true);
    expect(missionDefinitions.every((mission) => mission.id !== 'perfect-plumage')).toBe(true);
  });

  it('credits streak-insurance missions when insurance is armed', () => {
    const { date, baseState } = setupMissionState('insurance-audit');
    writeSessionMissions(baseState);

    const update = applyStreakInsuranceUseToSessionMissions(date);

    expect(update.nextState.missions.find((mission) => mission.missionId === 'insurance-audit')).toMatchObject({
      completed: true,
      claimed: true,
    });
  });
});

describe('mission state storage and helper coverage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.setSystemTime(new Date(2026, 3, 5, 12, 0, 0));
  });

  it('reads a fresh state when storage is missing or invalid', () => {
    expect(readSessionMissions('2026-04-05')).toEqual(createSessionMissionsStateForDate('2026-04-05'));

    localStorage.setItem('sessionMissions', '{bad json');
    expect(readSessionMissions('2026-04-05')).toEqual(createSessionMissionsStateForDate('2026-04-05'));
  });

  it('normalizes stored mission state and resets when the stored date is stale', () => {
    const baseState = createSessionMissionsStateForDate('2026-04-05');
    localStorage.setItem('sessionMissions', JSON.stringify({
      date: '2026-04-05',
      missions: [
        { missionId: baseState.missions[0]?.missionId, progress: 'bad', completed: 'bad', claimed: true },
        { missionId: 'not-a-real-mission', progress: 99, completed: true, claimed: true },
      ],
      bonusClaimed: 'bad',
    }));

    expect(readSessionMissions('2026-04-05')).toEqual({
      date: '2026-04-05',
      missions: baseState.missions.map((mission, index) => index === 0
        ? { missionId: mission.missionId, progress: 0, completed: false, claimed: true }
        : mission),
      bonusClaimed: false,
    });

    localStorage.setItem('sessionMissions', JSON.stringify({
      date: '2026-04-04',
      missions: baseState.missions,
      bonusClaimed: true,
    }));
    expect(readSessionMissions('2026-04-05')).toEqual(createSessionMissionsStateForDate('2026-04-05'));
  });

  it('writes normalized mission state and can reset it', () => {
    const baseState = createSessionMissionsStateForDate('2026-04-05');
    const written = writeSessionMissions({
      date: '2026-04-05',
      missions: [
        { missionId: baseState.missions[0]?.missionId ?? '', progress: 2, completed: true, claimed: false },
      ],
      bonusClaimed: true,
    });

    expect(written.date).toBe('2026-04-05');
    expect(written.missions[0]).toMatchObject({ progress: 2, completed: true, claimed: false });

    const reset = resetSessionMissions('2026-04-06');
    const fresh = createSessionMissionsStateForDate('2026-04-06');
    expect(reset.date).toBe('2026-04-06');
    expect(reset.missions).toHaveLength(fresh.missions.length);
    expect(reset.missions.every((mission) => mission.progress === 0 && !mission.completed && !mission.claimed)).toBe(true);
  });

  it('builds reward ids and summaries for known missions, the mission-set bonus, and unknown ids', () => {
    expect(getMissionRewardEventId('2026-04-05', 'warmup-rounds')).toBe('2026-04-05:warmup-rounds');
    expect(getMissionRewardEventId('2026-04-05', 'mission-set-bonus')).toBe('2026-04-05:mission-set-bonus');

    expect(createMissionRewardSummary('mission-set-bonus')).toEqual({
      missionId: 'mission-set-bonus',
      description: 'Clean sweep bonus',
      toastDescription: 'Clean sweep bonus',
      rewardSeeds: 15,
    });
    expect(createMissionRewardSummary('warmup-rounds')).toMatchObject({
      missionId: 'warmup-rounds',
      rewardSeeds: expect.any(Number),
    });
    expect(createMissionRewardSummary('unknown-mission')).toBeNull();

    expect(buildMissionRewardGrantEvents('2026-04-05', {
      missionRewards: [{ missionId: 'warmup-rounds', description: 'Warmup', toastDescription: 'Warmup', rewardSeeds: 8 }],
      missionSetBonusSeedsEarned: 15,
    })).toEqual([
      { eventId: '2026-04-05:warmup-rounds', missionId: 'warmup-rounds', rewardSeeds: 8 },
      { eventId: '2026-04-05:mission-set-bonus', missionId: 'mission-set-bonus', rewardSeeds: 15 },
    ]);
  });

  it('filters unknown mission ids from mission definitions', () => {
    expect(getMissionDefinitionsForState({
      date: '2026-04-05',
      missions: [
        { missionId: 'warmup-rounds', progress: 1, completed: false, claimed: false },
        { missionId: 'unknown', progress: 1, completed: false, claimed: false },
      ],
      bonusClaimed: false,
    })).toHaveLength(1);
  });

  it('claims an already-completed mission that was still unclaimed', () => {
    vi.setSystemTime(new Date(2026, 3, 6, 12, 0, 0));
    const baseState = createSessionMissionsStateForDate('2026-04-06');
    const missionId = baseState.missions[0]?.missionId ?? '';
    writeSessionMissions({
      ...baseState,
      missions: baseState.missions.map((mission) =>
        mission.missionId === missionId
          ? { ...mission, progress: 999, completed: true, claimed: false }
          : mission
      ),
    });

    const update = applyRoundToSessionMissions(buildRoundResult());
    expect(update.missionRewards[0]).toMatchObject({ missionId });
    expect(update.nextState.missions.find((mission) => mission.missionId === missionId)).toMatchObject({
      completed: true,
      claimed: true,
    });
  });
});
