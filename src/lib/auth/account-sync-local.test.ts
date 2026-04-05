import { describe, expect, it, vi } from 'vitest';
import { applyPulledAccountProgress, readAccountSyncMeta } from './account-sync-local';

describe('account-sync-local', () => {
  it('applies pulled server progress into local storage and records sync meta', () => {
    vi.setSystemTime(new Date('2026-04-04T15:00:00.000Z'));

    applyPulledAccountProgress({
      score: {
        birdsSeen: 15,
        birdsIdentified: 11,
        currentStreak: 3,
        justAchievedStreak: false,
        bestStreak: 7,
        currentDailyStreak: 2,
        bestDailyStreak: 4,
        seeds: 28,
      },
      unlockedThemes: ['Finch', 'Raven'],
      dailyChallengeHistory: [
        { date: '2026-04-04', correctAnswers: 5, roundsPlayed: 5, completed: true },
        { date: '2026-04-03', correctAnswers: 5, roundsPlayed: 5, completed: true },
        { date: '2026-04-02', correctAnswers: 5, roundsPlayed: 5, completed: true },
        { date: '2026-04-01', correctAnswers: 5, roundsPlayed: 5, completed: true },
      ],
      dailyMissionHistory: [
        { date: '2026-04-04' },
        { date: '2026-04-03' },
      ],
      milestones: [10],
      journalEntries: [],
      lastLocalSyncAt: '2026-04-04T14:45:00.000Z',
      todayDailyChallenge: null,
      todayMissionClaims: null,
    });

    expect(JSON.parse(localStorage.getItem('birdScore') ?? '{}')).toMatchObject({
      birdsIdentified: 11,
      bestDailyStreak: 4,
      seeds: 28,
    });
    expect(JSON.parse(localStorage.getItem('unlockedThemes') ?? '[]')).toEqual(['Raven']);
    expect(JSON.parse(localStorage.getItem('dailyChallengeHistory') ?? '[]')).toHaveLength(4);
    expect(readAccountSyncMeta()).toMatchObject({
      lastServerSyncAt: '2026-04-04T14:45:00.000Z',
      lastPulledAt: '2026-04-04T15:00:00.000Z',
    });
  });

  it('restores today\'s daily challenge and claimed mission rewards after sign-in', () => {
    vi.setSystemTime(new Date('2026-04-04T15:00:00.000Z'));

    applyPulledAccountProgress({
      score: {
        birdsSeen: 15,
        birdsIdentified: 11,
        currentStreak: 3,
        justAchievedStreak: false,
        bestStreak: 7,
        currentDailyStreak: 2,
        bestDailyStreak: 4,
        seeds: 28,
      },
      unlockedThemes: ['Finch', 'Raven'],
      dailyChallengeHistory: [
        { date: '2026-04-04', correctAnswers: 5, roundsPlayed: 5, completed: true },
      ],
      dailyMissionHistory: [{ date: '2026-04-04' }],
      milestones: [10],
      journalEntries: [],
      lastLocalSyncAt: '2026-04-04T14:45:00.000Z',
      todayDailyChallenge: {
        date: '2026-04-04',
        roundsPlayed: 5,
        correctAnswers: 5,
        bonusSeedsAwarded: 75,
        claimed: true,
      },
      todayMissionClaims: {
        date: '2026-04-04',
        claimedMissionIds: ['no-peeking'],
        bonusClaimed: false,
      },
    });

    expect(JSON.parse(localStorage.getItem('dailyChallenge') ?? '{}')).toMatchObject({
      date: '2026-04-04',
      completed: true,
      roundsPlayed: 5,
      correctAnswers: 5,
      completionBonusAwarded: true,
      perfectBonusAwarded: true,
      bonusSeedsAwarded: 75,
    });

    expect(JSON.parse(localStorage.getItem('sessionMissions') ?? '{}')).toMatchObject({
      date: '2026-04-04',
      bonusClaimed: false,
    });

    expect(JSON.parse(localStorage.getItem('sessionMissions') ?? '{}').missions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          missionId: 'no-peeking',
          completed: true,
          claimed: true,
        }),
        expect.objectContaining({
          completed: true,
        }),
      ])
    );
  });
});