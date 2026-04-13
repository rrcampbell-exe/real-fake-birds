import { describe, expect, it } from 'vitest';
import {
  getPendingRewardClaimCount,
  hasPendingMissionRewards,
  hasPendingMissionSetBonus,
  hasPendingRewards,
} from './rewards-notification';
import type { DailyChallengeState, SessionMissionsState } from '@/types';

const emptyMissionState: SessionMissionsState = {
  date: '2026-04-13',
  missions: [],
  bonusClaimed: false,
};

function makeCompletedDailyState(overrides: Partial<DailyChallengeState> = {}): DailyChallengeState {
  return {
    date: '2026-04-13',
    roundsPlayed: 10,
    correctAnswers: 10,
    completed: true,
    completionBonusAwarded: false,
    perfectBonusAwarded: false,
    bonusSeedsAwarded: 0,
    roundResults: [],
    ...overrides,
  };
}

function makeIncompleteDailyState(): DailyChallengeState {
  return {
    date: '2026-04-13',
    roundsPlayed: 3,
    correctAnswers: 2,
    completed: false,
    completionBonusAwarded: false,
    perfectBonusAwarded: false,
    bonusSeedsAwarded: 0,
    roundResults: [],
  };
}

describe('rewards-notification utilities', () => {
  describe('hasPendingMissionSetBonus', () => {
    it('always returns false', () => {
      expect(hasPendingMissionSetBonus(emptyMissionState)).toBe(false);
    });
  });

  describe('hasPendingMissionRewards', () => {
    it('always returns false', () => {
      expect(hasPendingMissionRewards(emptyMissionState)).toBe(false);
    });
  });

  describe('getPendingRewardClaimCount', () => {
    it('returns 1 when daily challenge has unclaimed rewards', () => {
      const dailyState = makeCompletedDailyState();
      expect(getPendingRewardClaimCount(dailyState, emptyMissionState)).toBe(1);
    });

    it('returns 0 when daily challenge has no unclaimed rewards', () => {
      const dailyState = makeIncompleteDailyState();
      expect(getPendingRewardClaimCount(dailyState, emptyMissionState)).toBe(0);
    });
  });

  describe('hasPendingRewards', () => {
    it('returns true when daily challenge has unclaimed rewards', () => {
      const dailyState = makeCompletedDailyState();
      expect(hasPendingRewards(dailyState, emptyMissionState)).toBe(true);
    });

    it('returns false when no pending rewards', () => {
      const dailyState = makeIncompleteDailyState();
      expect(hasPendingRewards(dailyState, emptyMissionState)).toBe(false);
    });
  });
});
