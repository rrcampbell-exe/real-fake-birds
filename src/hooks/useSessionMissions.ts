'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useAccountState } from '@/components/account/AccountStateProvider';
import { useStoredJson } from './useStoredValue';
import { flushQueuedProgressEventsForSignedInUser } from '@/lib/auth/account-session';
import { track } from '@/lib/analytics';
import { DAILY_MISSION_BONUS_SEEDS, SESSION_MISSIONS_STORAGE_KEY } from '@/lib/constants/missions';
import { syncDailyMissionCompletion } from '@/lib/auth/account-sync';
import { queueProgressEvent } from '@/lib/progress/progress-event-outbox';
import {
  DAILY_MISSION_HISTORY_STORAGE_KEY,
  readDailyMissionHistory,
  syncDailyMissionStreaksToBirdScore,
} from '@/lib/utils/daily-mission-history';
import {
  buildMissionRewardGrantEvents,
  createSessionMissionsStateForDate,
  getMissionDefinitionsForState,
  readSessionMissions,
  writeSessionMissions,
} from '@/lib/utils/missions';
import { mergeNonRoundRemoteScore, readBirdScore, writeBirdScore } from '@/lib/utils/player-progress';
import type { DailyMissionHistoryEntry, SessionMissionsState } from '@/types';
import { useLocalMissionDate } from './useLocalMissionDate';

export function useSessionMissions() {
  const { isSignedIn } = useAccountState();
  const today = useLocalMissionDate();
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
    const pendingMissionRewards = missions
      .filter((mission) => mission.completed && !mission.claimed)
      .map((mission) => ({
        missionId: mission.id,
        rewardSeeds: mission.rewardSeeds,
      }));
    const shouldGrantBonus = allCompleted && !storedState.bonusClaimed;

    if (pendingMissionRewards.length === 0 && !shouldGrantBonus) {
      return;
    }

    const totalRewardSeeds = pendingMissionRewards.reduce((total, mission) => total + mission.rewardSeeds, 0)
      + (shouldGrantBonus ? DAILY_MISSION_BONUS_SEEDS : 0);

    if (totalRewardSeeds > 0) {
      const score = readBirdScore();
      writeBirdScore({
        ...score,
        seeds: score.seeds + totalRewardSeeds,
      });
    }

    track('mission_reward_granted', {
      missions_granted: pendingMissionRewards.length,
      reward_seeds: totalRewardSeeds,
      all_missions_complete: allCompleted,
      bonus_seeds: shouldGrantBonus ? DAILY_MISSION_BONUS_SEEDS : 0,
    });

    writeSessionMissions({
      ...storedState,
      missions: storedState.missions.map((mission) =>
        mission.completed ? { ...mission, claimed: true } : mission
      ),
      bonusClaimed: shouldGrantBonus ? true : storedState.bonusClaimed,
    });

    if (!isSignedIn) {
      return;
    }

    buildMissionRewardGrantEvents(storedState.date, {
      missionRewards: missions.filter((mission) => mission.completed && !mission.claimed),
      missionSetBonusSeedsEarned: shouldGrantBonus ? DAILY_MISSION_BONUS_SEEDS : 0,
    }).forEach((missionReward) => {
      queueProgressEvent({
        eventId: missionReward.eventId,
        eventType: 'mission-reward-granted',
        occurredAt: new Date().toISOString(),
        payload: {
          missionDate: storedState.date,
          missionId: missionReward.missionId,
          rewardSeeds: missionReward.rewardSeeds,
        },
      });
    });

    void flushQueuedProgressEventsForSignedInUser();
  }, [allCompleted, isSignedIn, missions, storedState]);

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

  return {
    state: storedState,
    missions,
    allCompleted,
    allClaimed,
    bonusClaimed: storedState.bonusClaimed,
    missionSetBonusSeeds: DAILY_MISSION_BONUS_SEEDS,
  };
}