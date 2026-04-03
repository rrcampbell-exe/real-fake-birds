'use client';

import { useMemo } from 'react';
import { useStoredJson } from './useStoredValue';
import { DAILY_MISSION_BONUS_SEEDS, SESSION_MISSIONS_STORAGE_KEY } from '@/lib/constants/missions';
import {
  claimMissionReward,
  claimMissionSetBonus,
  getMissionDefinitionsForState,
  readSessionMissions,
} from '@/lib/utils/missions';
import type { SessionMissionsState } from '@/types';

export function useSessionMissions() {
  const storedState = useStoredJson<SessionMissionsState>(
    SESSION_MISSIONS_STORAGE_KEY,
    readSessionMissions()
  );

  const missions = useMemo(() => getMissionDefinitionsForState(storedState), [storedState]);
  const allClaimed = missions.length > 0 && missions.every((mission) => mission.claimed);
  const allCompleted = missions.length > 0 && missions.every((mission) => mission.completed);

  return {
    state: storedState,
    missions,
    allCompleted,
    allClaimed,
    bonusClaimed: storedState.bonusClaimed,
    missionSetBonusSeeds: DAILY_MISSION_BONUS_SEEDS,
    claimMissionReward,
    claimMissionSetBonus,
  };
}