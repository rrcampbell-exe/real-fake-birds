'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useAccountState } from '@/components/account/AccountStateProvider';
import { useStoredJson } from './useStoredValue';
import { flushQueuedProgressEventsForSignedInUser } from '@/lib/auth/account-session';
import { DAILY_MISSION_BONUS_SEEDS, SESSION_MISSIONS_STORAGE_KEY } from '@/lib/constants/missions';
import {
  claimMissionRewardDirect,
  claimMissionSetBonusDirect,
  syncDailyMissionCompletion,
} from '@/lib/auth/account-sync';
import {
  DAILY_MISSION_HISTORY_STORAGE_KEY,
  readDailyMissionHistory,
  syncDailyMissionStreaksToBirdScore,
} from '@/lib/utils/daily-mission-history';
import {
  createSessionMissionsStateForDate,
  claimMissionReward,
  claimMissionSetBonus,
  getMissionDefinitionsForState,
  markMissionRewardClaimed,
  markMissionSetBonusClaimed,
  readSessionMissions,
  writeSessionMissions,
} from '@/lib/utils/missions';
import { getTodayChallengeDate } from '@/lib/utils/daily-challenge';
import { mergeNonRoundRemoteScore, readBirdScore, writeBirdScore } from '@/lib/utils/player-progress';
import type { DailyMissionHistoryEntry, SessionMissionsState } from '@/types';
import { useLocalChallengeDate } from './useLocalChallengeDate';

export function useSessionMissions() {
  const { isSignedIn } = useAccountState();
  const today = useLocalChallengeDate();
  const storedState = useStoredJson<SessionMissionsState>(
    SESSION_MISSIONS_STORAGE_KEY,
    createSessionMissionsStateForDate(today)
  );
  const missionHistory = useStoredJson<DailyMissionHistoryEntry[]>(
    DAILY_MISSION_HISTORY_STORAGE_KEY,
    readDailyMissionHistory()
  );
  const syncedCompletionDateRef = useRef<string | null>(null);

  const missions = useMemo(() => getMissionDefinitionsForState(storedState), [storedState]);
  const allClaimed = missions.length > 0 && missions.every((mission) => mission.claimed);
  const allCompleted = missions.length > 0 && missions.every((mission) => mission.completed);

  useEffect(() => {
    syncDailyMissionStreaksToBirdScore(missionHistory);
  }, [missionHistory]);

  useEffect(() => {
    if (storedState.date !== today) {
      writeSessionMissions(readSessionMissions(today));
    }
  }, [storedState.date, today]);

  useEffect(() => {
    if (!isSignedIn || !allCompleted || syncedCompletionDateRef.current === storedState.date) {
      return;
    }

    syncedCompletionDateRef.current = storedState.date;

    void (async () => {
      try {
        await flushQueuedProgressEventsForSignedInUser();
        const response = await syncDailyMissionCompletion(storedState.date);
        writeBirdScore(mergeNonRoundRemoteScore(response.progressSummary));
      } catch {
        syncedCompletionDateRef.current = null;
      }
    })();
  }, [allCompleted, isSignedIn, storedState.date]);

  const claimMissionRewardAction = async (missionId: string) => {
    const mission = missions.find((entry) => entry.id === missionId);
    if (!mission || !mission.completed || mission.claimed) {
      return storedState;
    }

    if (!isSignedIn) {
      return claimMissionReward(missionId);
    }

    const previousScore = readBirdScore();
    const currentDate = getTodayChallengeDate();
    const previousState = readSessionMissions(currentDate);
    claimMissionReward(missionId);

    try {
      await flushQueuedProgressEventsForSignedInUser();
      const response = await claimMissionRewardDirect({
        claimId: `${currentDate}:${missionId}`,
        rewardSeeds: mission.rewardSeeds,
      });
      writeBirdScore(mergeNonRoundRemoteScore(response.progressSummary));
      return markMissionRewardClaimed(missionId);
    } catch (error) {
      writeBirdScore(previousScore);
      writeSessionMissions(previousState);
      throw error;
    }
  };

  const claimMissionSetBonusAction = async () => {
    if (!allCompleted || storedState.bonusClaimed) {
      return storedState;
    }

    if (!isSignedIn) {
      return claimMissionSetBonus();
    }

    const previousScore = readBirdScore();
    const currentDate = getTodayChallengeDate();
    const previousState = readSessionMissions(currentDate);
    claimMissionSetBonus();

    try {
      await flushQueuedProgressEventsForSignedInUser();
      const response = await claimMissionSetBonusDirect({
        claimId: `${currentDate}:mission-set-bonus`,
        rewardSeeds: DAILY_MISSION_BONUS_SEEDS,
      });
      writeBirdScore(mergeNonRoundRemoteScore(response.progressSummary));
      return markMissionSetBonusClaimed();
    } catch (error) {
      writeBirdScore(previousScore);
      writeSessionMissions(previousState);
      throw error;
    }
  };

  return {
    state: storedState,
    missions,
    allCompleted,
    allClaimed,
    bonusClaimed: storedState.bonusClaimed,
    missionSetBonusSeeds: DAILY_MISSION_BONUS_SEEDS,
    claimMissionReward: claimMissionRewardAction,
    claimMissionSetBonus: claimMissionSetBonusAction,
  };
}