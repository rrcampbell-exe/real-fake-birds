'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useStoredJson } from './useStoredValue';
import { flushQueuedProgressEventsForSignedInUser } from '@/lib/auth/account-session';
import { DAILY_MISSION_BONUS_SEEDS, SESSION_MISSIONS_STORAGE_KEY } from '@/lib/constants/missions';
import {
  claimMissionRewardDirect,
  claimMissionSetBonusDirect,
  syncDailyMissionCompletion,
} from '@/lib/auth/account-sync';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { hasSupabaseEnv } from '@/lib/supabase/env';
import {
  DAILY_MISSION_HISTORY_STORAGE_KEY,
  readDailyMissionHistory,
  syncDailyMissionStreaksToBirdScore,
} from '@/lib/utils/daily-mission-history';
import {
  claimMissionReward,
  claimMissionSetBonus,
  getMissionDefinitionsForState,
  markMissionRewardClaimed,
  markMissionSetBonusClaimed,
  readSessionMissions,
  writeSessionMissions,
} from '@/lib/utils/missions';
import { readBirdScore, writeBirdScore } from '@/lib/utils/player-progress';
import type { DailyMissionHistoryEntry, SessionMissionsState } from '@/types';

export function useSessionMissions() {
  const supabaseReady = hasSupabaseEnv();
  const storedState = useStoredJson<SessionMissionsState>(
    SESSION_MISSIONS_STORAGE_KEY,
    readSessionMissions()
  );
  const missionHistory = useStoredJson<DailyMissionHistoryEntry[]>(
    DAILY_MISSION_HISTORY_STORAGE_KEY,
    readDailyMissionHistory()
  );
  const [isSignedIn, setIsSignedIn] = useState(false);
  const syncedCompletionDateRef = useRef<string | null>(null);

  const missions = useMemo(() => getMissionDefinitionsForState(storedState), [storedState]);
  const allClaimed = missions.length > 0 && missions.every((mission) => mission.claimed);
  const allCompleted = missions.length > 0 && missions.every((mission) => mission.completed);

  useEffect(() => {
    syncDailyMissionStreaksToBirdScore(missionHistory);
  }, [missionHistory]);

  useEffect(() => {
    if (!supabaseReady) {
      setIsSignedIn(false);
      return;
    }

    const supabase = getSupabaseBrowserClient();
    let active = true;

    const refreshSession = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (active) {
          setIsSignedIn(Boolean(data.session?.user));
        }
      } catch {
        if (active) {
          setIsSignedIn(false);
        }
      }
    };

    void refreshSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void refreshSession();
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [supabaseReady]);

  useEffect(() => {
    if (!isSignedIn || !allCompleted || syncedCompletionDateRef.current === storedState.date) {
      return;
    }

    syncedCompletionDateRef.current = storedState.date;

    void (async () => {
      try {
        await flushQueuedProgressEventsForSignedInUser();
        const response = await syncDailyMissionCompletion(storedState.date);
        writeBirdScore({
          birdsSeen: response.progressSummary.birdsSeen,
          birdsIdentified: response.progressSummary.birdsIdentified,
          currentStreak: response.progressSummary.currentStreak,
          seeds: response.progressSummary.seeds,
          bestStreak: response.progressSummary.bestStreak,
          currentDailyStreak: response.progressSummary.currentDailyStreak,
          bestDailyStreak: response.progressSummary.bestDailyStreak,
        });
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
    const previousState = readSessionMissions(storedState.date);
    claimMissionReward(missionId);

    try {
      await flushQueuedProgressEventsForSignedInUser();
      const response = await claimMissionRewardDirect({
        claimId: `${storedState.date}:${missionId}`,
        rewardSeeds: mission.rewardSeeds,
      });
      writeBirdScore({
        birdsSeen: response.progressSummary.birdsSeen,
        birdsIdentified: response.progressSummary.birdsIdentified,
        currentStreak: response.progressSummary.currentStreak,
        seeds: response.progressSummary.seeds,
        bestStreak: response.progressSummary.bestStreak,
        currentDailyStreak: response.progressSummary.currentDailyStreak,
        bestDailyStreak: response.progressSummary.bestDailyStreak,
      });
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
    const previousState = readSessionMissions(storedState.date);
    claimMissionSetBonus();

    try {
      await flushQueuedProgressEventsForSignedInUser();
      const response = await claimMissionSetBonusDirect({
        claimId: `${storedState.date}:mission-set-bonus`,
        rewardSeeds: DAILY_MISSION_BONUS_SEEDS,
      });
      writeBirdScore({
        birdsSeen: response.progressSummary.birdsSeen,
        birdsIdentified: response.progressSummary.birdsIdentified,
        currentStreak: response.progressSummary.currentStreak,
        seeds: response.progressSummary.seeds,
        bestStreak: response.progressSummary.bestStreak,
        currentDailyStreak: response.progressSummary.currentDailyStreak,
        bestDailyStreak: response.progressSummary.bestDailyStreak,
      });
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