import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  claimDailyChallengeBonuses,
  createDailyChallengeState,
  getUnclaimedDailyChallengeRewardSeeds,
  recordDailyChallengeRound,
  writeDailyChallengeState,
} from './daily-challenge';

describe('daily challenge utilities', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-03T12:00:00Z'));
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

  it('claims completion and perfect bonuses once from the rewards flow', () => {
    localStorage.setItem(
      'birdScore',
      JSON.stringify({
        birdsSeen: 0,
        birdsIdentified: 0,
        currentStreak: 0,
        justAchievedStreak: false,
        bestStreak: 0,
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
});