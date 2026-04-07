import { notifyStoredValueChanged } from '@/hooks/useStoredValue';
import {
  DAILY_MISSION_BONUS_SEEDS,
  DAILY_MISSION_COUNT,
  SESSION_MISSIONS_STORAGE_KEY,
  missionDefinitions,
} from '@/lib/constants/missions';
import type { GameRoundResult, MissionDefinition, SessionMissionsState } from '@/types';
import { getTodayChallengeDate } from './daily-challenge';
import { recordDailyMissionCompletion, syncDailyMissionStreaksToBirdScore } from './daily-mission-history';
import { readBirdScore, writeBirdScore } from './player-progress';

function hashValue(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

function getMissionDefinitionById(missionId: string): MissionDefinition | undefined {
  return missionDefinitions.find((mission) => mission.id === missionId);
}

export function createSessionMissionsStateForDate(date = getTodayChallengeDate()): SessionMissionsState {
  const selectedMissions = [...missionDefinitions]
    .sort((left, right) => hashValue(`${date}:${left.id}`) - hashValue(`${date}:${right.id}`))
    .slice(0, DAILY_MISSION_COUNT)
    .map((mission) => ({
      missionId: mission.id,
      progress: 0,
      completed: false,
      claimed: false,
    }));

  return {
    date,
    missions: selectedMissions,
    bonusClaimed: false,
  };
}

function normalizeState(
  stateLike: Partial<SessionMissionsState> | null | undefined,
  fallbackDate = getTodayChallengeDate()
): SessionMissionsState {
  const baseState = createSessionMissionsStateForDate(fallbackDate);
  if (!stateLike || typeof stateLike !== 'object') {
    return baseState;
  }

  const selectedIds = new Set(baseState.missions.map((mission) => mission.missionId));

  const parsedMissions = Array.isArray(stateLike.missions)
    ? stateLike.missions
        .filter(
          (mission): mission is SessionMissionsState['missions'][number] =>
            Boolean(mission) &&
            typeof mission === 'object' &&
            typeof mission.missionId === 'string' &&
            selectedIds.has(mission.missionId)
        )
        .map((mission) => ({
          missionId: mission.missionId,
          progress: typeof mission.progress === 'number' ? mission.progress : 0,
          completed: typeof mission.completed === 'boolean' ? mission.completed : false,
          claimed: typeof mission.claimed === 'boolean' ? mission.claimed : false,
        }))
    : [];
  const parsedMissionMap = new Map(parsedMissions.map((mission) => [mission.missionId, mission]));

  return {
    date: typeof stateLike.date === 'string' ? stateLike.date : fallbackDate,
    missions: baseState.missions.map((mission) => parsedMissionMap.get(mission.missionId) ?? mission),
    bonusClaimed: typeof stateLike.bonusClaimed === 'boolean' ? stateLike.bonusClaimed : false,
  };
}

export function readSessionMissions(date = getTodayChallengeDate()): SessionMissionsState {
  if (!isBrowser()) {
    return createSessionMissionsStateForDate(date);
  }

  const raw = localStorage.getItem(SESSION_MISSIONS_STORAGE_KEY);
  if (!raw) {
    return createSessionMissionsStateForDate(date);
  }

  try {
    const parsed = normalizeState(JSON.parse(raw) as Partial<SessionMissionsState>, date);
    if (parsed.date !== date) {
      syncDailyMissionStreaksToBirdScore();
      return createSessionMissionsStateForDate(date);
    }

    return parsed;
  } catch {
    return createSessionMissionsStateForDate(date);
  }
}

export function writeSessionMissions(stateLike: Partial<SessionMissionsState>): SessionMissionsState {
  const state = normalizeState(stateLike);
  localStorage.setItem(SESSION_MISSIONS_STORAGE_KEY, JSON.stringify(state));
  notifyStoredValueChanged(SESSION_MISSIONS_STORAGE_KEY);
  return state;
}

export function resetSessionMissions(date = getTodayChallengeDate()): SessionMissionsState {
  return writeSessionMissions(createSessionMissionsStateForDate(date));
}

function incrementForMission(definition: MissionDefinition, roundResult: GameRoundResult): number {
  switch (definition.type) {
    case 'play_rounds':
      return 1;
    case 'correct_answers':
      return roundResult.isCorrect ? 1 : 0;
    case 'correct_without_hints':
      return roundResult.isCorrect && roundResult.usedHintTypes.length === 0 ? 1 : 0;
    case 'use_hints':
      return roundResult.usedHintTypes.length > 0 ? roundResult.usedHintTypes.length : 0;
    case 'earn_seeds':
      return roundResult.seedsEarned;
    case 'identify_real_birds':
      return roundResult.isCorrect && roundResult.isReal ? 1 : 0;
    case 'identify_fake_birds':
      return roundResult.isCorrect && !roundResult.isReal ? 1 : 0;
    default:
      return 0;
  }
}

export function applyRoundToSessionMissions(roundResult: GameRoundResult): {
  nextState: SessionMissionsState;
  newlyCompletedMissionIds: string[];
} {
  const current = readSessionMissions();
  const newlyCompletedMissionIds: string[] = [];

  const nextState = writeSessionMissions({
    ...current,
    missions: current.missions.map((missionState) => {
      const definition = getMissionDefinitionById(missionState.missionId);
      if (!definition || missionState.completed) {
        return missionState;
      }

      const nextProgress = Math.min(
        definition.target,
        missionState.progress + incrementForMission(definition, roundResult)
      );
      const completed = nextProgress >= definition.target;
      if (completed && !missionState.completed) {
        newlyCompletedMissionIds.push(missionState.missionId);
      }

      return {
        ...missionState,
        progress: nextProgress,
        completed,
      };
    }),
  });

  if (nextState.missions.every((mission) => mission.completed)) {
    recordDailyMissionCompletion(nextState.date);
  }

  return {
    nextState,
    newlyCompletedMissionIds,
  };
}

export function claimMissionReward(missionId: string): SessionMissionsState {
  const current = readSessionMissions();
  const missionState = current.missions.find((mission) => mission.missionId === missionId);
  const definition = getMissionDefinitionById(missionId);

  if (!missionState || !definition || !missionState.completed || missionState.claimed) {
    return current;
  }

  const score = readBirdScore();
  writeBirdScore({
    ...score,
    seeds: score.seeds + definition.rewardSeeds,
  });

  return writeSessionMissions({
    ...current,
    missions: current.missions.map((mission) =>
      mission.missionId === missionId ? { ...mission, claimed: true } : mission
    ),
  });
}

export function claimMissionSetBonus(): SessionMissionsState {
  const current = readSessionMissions();
  const allCompleted = current.missions.every((mission) => mission.completed);

  if (!allCompleted || current.bonusClaimed) {
    return current;
  }

  const score = readBirdScore();
  writeBirdScore({
    ...score,
    seeds: score.seeds + DAILY_MISSION_BONUS_SEEDS,
  });

  return writeSessionMissions({
    ...current,
    bonusClaimed: true,
  });
}

export function markMissionRewardClaimed(missionId: string): SessionMissionsState {
  const current = readSessionMissions();

  return writeSessionMissions({
    ...current,
    missions: current.missions.map((mission) =>
      mission.missionId === missionId ? { ...mission, claimed: true } : mission
    ),
  });
}

export function markMissionSetBonusClaimed(): SessionMissionsState {
  const current = readSessionMissions();

  return writeSessionMissions({
    ...current,
    bonusClaimed: true,
  });
}

export function getMissionDefinitionsForState(state: SessionMissionsState = readSessionMissions()) {
  return state.missions
    .map((missionState) => {
      const definition = getMissionDefinitionById(missionState.missionId);
      if (!definition) {
        return null;
      }

      return {
        ...definition,
        ...missionState,
      };
    })
    .filter((mission): mission is MissionDefinition & SessionMissionsState['missions'][number] => mission !== null);
}