import { getUnclaimedDailyChallengeRewardSeeds } from './daily-challenge';
import type { DailyChallengeState, SessionMissionsState } from '@/types';

export function hasPendingMissionSetBonus(_state: SessionMissionsState): boolean {
  void _state;
  return false;
}

export function hasPendingMissionRewards(_state: SessionMissionsState): boolean {
  void _state;
  return false;
}

export function getPendingRewardClaimCount(
  dailyState: DailyChallengeState,
  _missionState: SessionMissionsState
): number {
  void _missionState;
  const pendingDailyClaims = getUnclaimedDailyChallengeRewardSeeds(dailyState) > 0 ? 1 : 0;

  return pendingDailyClaims;
}

export function hasPendingRewards(
  dailyState: DailyChallengeState,
  missionState: SessionMissionsState
): boolean {
  return getUnclaimedDailyChallengeRewardSeeds(dailyState) > 0 || hasPendingMissionRewards(missionState);
}