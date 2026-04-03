import { DAILY_MISSION_BONUS_SEEDS } from '@/lib/constants/missions';
import { getUnclaimedDailyChallengeRewardSeeds } from './daily-challenge';
import type { DailyChallengeState, SessionMissionsState } from '@/types';

export function hasPendingMissionSetBonus(state: SessionMissionsState): boolean {
  return state.missions.length > 0
    && state.missions.every((mission) => mission.claimed)
    && !state.bonusClaimed
    && DAILY_MISSION_BONUS_SEEDS > 0;
}

export function hasPendingMissionRewards(state: SessionMissionsState): boolean {
  const hasMissionClaims = state.missions.some((mission) => mission.completed && !mission.claimed);
  const hasMissionSetBonus = hasPendingMissionSetBonus(state);

  return hasMissionClaims || hasMissionSetBonus;
}

export function getPendingRewardClaimCount(
  dailyState: DailyChallengeState,
  missionState: SessionMissionsState
): number {
  const pendingDailyClaims = getUnclaimedDailyChallengeRewardSeeds(dailyState) > 0 ? 1 : 0;
  const pendingMissionClaims = missionState.missions.filter(
    (mission) => mission.completed && !mission.claimed
  ).length;
  const pendingMissionSetBonus = hasPendingMissionSetBonus(missionState) ? 1 : 0;

  return pendingDailyClaims + pendingMissionClaims + pendingMissionSetBonus;
}

export function hasPendingRewards(
  dailyState: DailyChallengeState,
  missionState: SessionMissionsState
): boolean {
  return getUnclaimedDailyChallengeRewardSeeds(dailyState) > 0 || hasPendingMissionRewards(missionState);
}