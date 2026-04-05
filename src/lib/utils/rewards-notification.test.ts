import { describe, expect, it } from 'vitest';
import {
  getPendingRewardClaimCount,
  hasPendingMissionRewards,
  hasPendingRewards,
} from './rewards-notification';

describe('rewards notification helpers', () => {
  it('returns true when the daily challenge has unclaimed seeds', () => {
    expect(
      hasPendingRewards(
        {
          date: '2026-04-03',
          roundsPlayed: 5,
          correctAnswers: 4,
          completed: true,
          completionBonusAwarded: false,
          perfectBonusAwarded: false,
          bonusSeedsAwarded: 25,
          roundResults: [true, true, true, true, false],
        },
        {
          date: '2026-04-03',
          missions: [],
          bonusClaimed: false,
        }
      )
    ).toBe(true);
  });

  it('returns true when a mission reward is ready to claim', () => {
    expect(
      hasPendingMissionRewards({
        date: '2026-04-03',
        missions: [
          {
            missionId: 'warmup-rounds',
            progress: 3,
            completed: true,
            claimed: false,
          },
        ],
        bonusClaimed: false,
      })
    ).toBe(true);
  });

  it('returns true when the mission set bonus is ready after all missions are claimed', () => {
    expect(
      hasPendingMissionRewards({
        date: '2026-04-03',
        missions: [
          {
            missionId: 'warmup-rounds',
            progress: 3,
            completed: true,
            claimed: true,
          },
          {
            missionId: 'sharp-eyes',
            progress: 3,
            completed: true,
            claimed: true,
          },
        ],
        bonusClaimed: false,
      })
    ).toBe(true);
  });

  it('returns false when there are no pending claims', () => {
    expect(
      hasPendingRewards(
        {
          date: '2026-04-03',
          roundsPlayed: 5,
          correctAnswers: 4,
          completed: true,
          completionBonusAwarded: true,
          perfectBonusAwarded: false,
          bonusSeedsAwarded: 25,
          roundResults: [true, true, true, true, false],
        },
        {
          date: '2026-04-03',
          missions: [
            {
              missionId: 'warmup-rounds',
              progress: 3,
              completed: true,
              claimed: true,
            },
          ],
          bonusClaimed: true,
        }
      )
    ).toBe(false);
  });

  it('counts pending daily, mission, and mission-bonus claims', () => {
    expect(
      getPendingRewardClaimCount(
        {
          date: '2026-04-03',
          roundsPlayed: 5,
          correctAnswers: 5,
          completed: true,
          completionBonusAwarded: false,
          perfectBonusAwarded: false,
          bonusSeedsAwarded: 75,
          roundResults: [true, true, true, true, true],
        },
        {
          date: '2026-04-03',
          missions: [
            {
              missionId: 'warmup-rounds',
              progress: 3,
              completed: true,
              claimed: false,
            },
            {
              missionId: 'sharp-eyes',
              progress: 3,
              completed: true,
              claimed: true,
            },
          ],
          bonusClaimed: false,
        }
      )
    ).toBe(3);
  });
});