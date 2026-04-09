import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DAILY_CHALLENGE_CONFIG, DAILY_CHALLENGE_HISTORY_STORAGE_KEY, DAILY_CHALLENGE_STORAGE_KEY } from '@/lib/constants/daily-challenge';
import {
  claimDailyChallengeBonuses,
  createDailyChallengeState,
  getDailyChallengeRewardSeeds,
  getDailyChallengeStreaks,
  getTodayChallengeDate,
  getUnclaimedDailyChallengeRewardSeeds,
  markDailyChallengeBonusesClaimed,
  readDailyChallengeHistory,
  readDailyChallengeState,
  recordDailyChallengeRound,
  writeDailyChallengeState,
  writeDailyChallengeHistory,
} from './daily-challenge';

describe('daily challenge utilities', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-03T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('reads a fresh state when storage is missing, stale, or invalid', () => {
    expect(readDailyChallengeState('2026-04-03')).toEqual(createDailyChallengeState('2026-04-03'));

    localStorage.setItem(DAILY_CHALLENGE_STORAGE_KEY, JSON.stringify({ date: '2026-04-02', roundsPlayed: 5 }));
    expect(readDailyChallengeState('2026-04-03')).toEqual(createDailyChallengeState('2026-04-03'));

    localStorage.setItem(DAILY_CHALLENGE_STORAGE_KEY, '{bad json');
    expect(readDailyChallengeState('2026-04-03')).toEqual(createDailyChallengeState('2026-04-03'));
  });

  it('normalizes stored challenge state and history records', () => {
    const state = writeDailyChallengeState({
      date: '2026-04-03',
      roundsPlayed: 2,
      correctAnswers: 1,
      completed: false,
      roundResults: [true, 'bad', false] as never,
    });
    localStorage.setItem(DAILY_CHALLENGE_HISTORY_STORAGE_KEY, JSON.stringify([
      { date: '2026-04-03', correctAnswers: 4, roundsPlayed: 5, completed: true },
      { bad: true },
    ]));

    expect(state.roundResults).toEqual([true, false]);
    expect(readDailyChallengeHistory()).toEqual([
      { date: '2026-04-03', correctAnswers: 4, roundsPlayed: 5, completed: true },
    ]);
  });

  it('marks the challenge complete after five recorded rounds', () => {
    writeDailyChallengeState(createDailyChallengeState('2026-04-03'));

    recordDailyChallengeRound(true);
    recordDailyChallengeRound(false);
    recordDailyChallengeRound(true);
    recordDailyChallengeRound(true);
    const finalState = recordDailyChallengeRound(true);

    expect(finalState.completed).toBe(true);
    expect(finalState.roundsPlayed).toBe(5);
    expect(finalState.correctAnswers).toBe(4);
  });

  it('does not mutate the challenge once it is already complete', () => {
    writeDailyChallengeState({
      date: '2026-04-03',
      roundsPlayed: 5,
      correctAnswers: 4,
      completed: true,
      completionBonusAwarded: false,
      perfectBonusAwarded: false,
      bonusSeedsAwarded: 25,
      roundResults: [true, true, true, true, false],
    });

    expect(recordDailyChallengeRound(true)).toMatchObject({
      roundsPlayed: 5,
      correctAnswers: 4,
      completed: true,
    });
  });

  it('claims completion and perfect bonuses once from the rewards flow', () => {
    localStorage.setItem(
      'birdScore',
      JSON.stringify({
        birdsSeen: 0,
        birdsIdentified: 0,
        currentStreak: 0,
        justAchievedStreak: false,
        bestStreak: 0,
        currentDailyStreak: 0,
        bestDailyStreak: 0,
        seeds: 10,
      })
    );
    writeDailyChallengeState({
      date: '2026-04-03',
      roundsPlayed: 5,
      correctAnswers: 5,
      completed: true,
      completionBonusAwarded: false,
      perfectBonusAwarded: false,
      bonusSeedsAwarded: 0,
      roundResults: [true, true, true, true, true],
    });

    expect(getUnclaimedDailyChallengeRewardSeeds()).toBe(75);

    const bonusState = claimDailyChallengeBonuses();

    expect(bonusState.bonusSeedsAwarded).toBe(75);
    expect(JSON.parse(localStorage.getItem('birdScore') ?? '{}').seeds).toBe(85);
    expect(getUnclaimedDailyChallengeRewardSeeds()).toBe(0);

    const repeatedState = claimDailyChallengeBonuses();
    expect(repeatedState.bonusSeedsAwarded).toBe(75);
    expect(JSON.parse(localStorage.getItem('birdScore') ?? '{}').seeds).toBe(85);
  });

  it('handles reward calculations for incomplete and partially claimed challenges', () => {
    expect(getDailyChallengeRewardSeeds(createDailyChallengeState('2026-04-03'))).toBe(0);
    expect(getUnclaimedDailyChallengeRewardSeeds(createDailyChallengeState('2026-04-03'))).toBe(0);

    const completionOnly = {
      date: '2026-04-03',
      roundsPlayed: 5,
      correctAnswers: 4,
      completed: true,
      completionBonusAwarded: false,
      perfectBonusAwarded: false,
      bonusSeedsAwarded: 0,
      roundResults: [true, true, true, true, false],
    };

    expect(getDailyChallengeRewardSeeds(completionOnly)).toBe(DAILY_CHALLENGE_CONFIG.completionBonusSeeds);
    expect(getUnclaimedDailyChallengeRewardSeeds({
      ...completionOnly,
      completionBonusAwarded: true,
    })).toBe(0);
    expect(getUnclaimedDailyChallengeRewardSeeds({
      ...completionOnly,
      correctAnswers: DAILY_CHALLENGE_CONFIG.roundCount,
      perfectBonusAwarded: false,
      completionBonusAwarded: true,
    })).toBe(DAILY_CHALLENGE_CONFIG.perfectBonusSeeds);
  });

  it('marks bonuses claimed only when the challenge is complete', () => {
    writeDailyChallengeState(createDailyChallengeState('2026-04-03'));
    expect(markDailyChallengeBonusesClaimed()).toMatchObject({
      completed: false,
      completionBonusAwarded: false,
    });

    writeDailyChallengeState({
      date: '2026-04-03',
      roundsPlayed: 5,
      correctAnswers: 4,
      completed: true,
      completionBonusAwarded: false,
      perfectBonusAwarded: false,
      bonusSeedsAwarded: 0,
      roundResults: [true, true, true, true, false],
    });

    expect(markDailyChallengeBonusesClaimed()).toMatchObject({
      completionBonusAwarded: true,
      perfectBonusAwarded: false,
      bonusSeedsAwarded: DAILY_CHALLENGE_CONFIG.completionBonusSeeds,
    });
  });

  it('computes both current and best daily streaks from history', () => {
    const streaks = getDailyChallengeStreaks(
      [
        { date: '2026-03-28', correctAnswers: 5, roundsPlayed: 5, completed: true },
        { date: '2026-03-29', correctAnswers: 4, roundsPlayed: 5, completed: true },
        { date: '2026-03-30', correctAnswers: 4, roundsPlayed: 5, completed: true },
        { date: '2026-04-01', correctAnswers: 4, roundsPlayed: 5, completed: true },
        { date: '2026-04-02', correctAnswers: 4, roundsPlayed: 5, completed: true },
      ],
      new Date('2026-04-03T12:00:00Z')
    );

    expect(streaks).toEqual({
      currentStreak: 2,
      bestStreak: 3,
    });
  });

  it('returns zero streaks when no completed history exists', () => {
    expect(getDailyChallengeStreaks([], new Date('2026-04-03T12:00:00Z'))).toEqual({
      currentStreak: 0,
      bestStreak: 0,
    });
  });

  it('uses a UTC day key so two devices agree on the same challenge date', () => {
    expect(getTodayChallengeDate(new Date('2026-04-03T00:30:00.000Z'))).toBe('2026-04-03');
    expect(getTodayChallengeDate(new Date('2026-04-02T17:30:00.000-07:00'))).toBe('2026-04-03');
    expect(getTodayChallengeDate(new Date('2026-04-03T09:30:00.000+09:00'))).toBe('2026-04-03');
  });

  it('stores challenge history without mutating the mission-based daily streak fields', () => {
    localStorage.setItem(
      'birdScore',
      JSON.stringify({
        birdsSeen: 12,
        birdsIdentified: 8,
        currentStreak: 2,
        justAchievedStreak: false,
        bestStreak: 4,
        currentDailyStreak: 0,
        bestDailyStreak: 0,
        seeds: 10,
      })
    );

    writeDailyChallengeHistory([
      { date: '2026-04-03', correctAnswers: 4, roundsPlayed: 5, completed: true },
      { date: '2026-04-02', correctAnswers: 5, roundsPlayed: 5, completed: true },
      { date: '2026-03-30', correctAnswers: 5, roundsPlayed: 5, completed: true },
      { date: '2026-03-29', correctAnswers: 5, roundsPlayed: 5, completed: true },
    ]);

    expect(JSON.parse(localStorage.getItem('birdScore') ?? '{}')).toMatchObject({
      currentDailyStreak: 0,
      bestDailyStreak: 0,
    });
  });
});
