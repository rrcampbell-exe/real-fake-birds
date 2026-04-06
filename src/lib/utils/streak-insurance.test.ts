import { describe, expect, it } from 'vitest';
import {
  consumeStreakInsurance,
  defaultStreakInsuranceState,
  expireStreakInsuranceAfterGuess,
  getStreakInsuranceCost,
  isStreakInsuranceExpired,
  purchaseStreakInsurance,
  readStreakInsuranceState,
} from './streak-insurance';

describe('streak insurance', () => {
  it('prices protection in streak bands', () => {
    expect(getStreakInsuranceCost(5)).toBe(10);
    expect(getStreakInsuranceCost(12)).toBe(14);
    expect(getStreakInsuranceCost(18)).toBe(18);
    expect(getStreakInsuranceCost(27)).toBe(24);
    expect(getStreakInsuranceCost(38)).toBe(32);
    expect(getStreakInsuranceCost(52)).toBe(42);
    expect(getStreakInsuranceCost(80)).toBe(55);
  });

  it('purchases one protected miss when the player has a qualifying streak', () => {
    localStorage.setItem(
      'birdScore',
      JSON.stringify({
        birdsSeen: 14,
        birdsIdentified: 10,
        currentStreak: 6,
        justAchievedStreak: false,
        bestStreak: 6,
        seeds: 100,
      })
    );

    const result = purchaseStreakInsurance();

    expect(result.ok).toBe(true);
    expect(readStreakInsuranceState()).toEqual({
      active: true,
      protectedMissesRemaining: 1,
      cost: 10,
      purchasedAtStreak: 6,
    });
    expect(JSON.parse(localStorage.getItem('birdScore') ?? '{}').seeds).toBe(90);
  });

  it('refuses to purchase protection before the minimum streak', () => {
    localStorage.setItem(
      'birdScore',
      JSON.stringify({
        birdsSeen: 5,
        birdsIdentified: 3,
        currentStreak: 3,
        justAchievedStreak: false,
        bestStreak: 4,
        seeds: 100,
      })
    );

    const result = purchaseStreakInsurance();

    expect(result.ok).toBe(false);
    expect(result.state).toEqual(defaultStreakInsuranceState);
  });

  it('expires coverage after the streak advances beyond the purchased level', () => {
    expect(
      isStreakInsuranceExpired(
        {
          active: true,
          protectedMissesRemaining: 1,
          cost: 10,
          purchasedAtStreak: 5,
        },
        6
      )
    ).toBe(true);

    localStorage.setItem(
      'birdScore',
      JSON.stringify({
        birdsSeen: 7,
        birdsIdentified: 5,
        currentStreak: 6,
        justAchievedStreak: false,
        bestStreak: 6,
        seeds: 100,
      })
    );
    localStorage.setItem(
      'streakInsurance',
      JSON.stringify({
        active: true,
        protectedMissesRemaining: 1,
        cost: 10,
        purchasedAtStreak: 5,
      })
    );

    expect(consumeStreakInsurance()).toBe(false);
    expect(readStreakInsuranceState()).toEqual(defaultStreakInsuranceState);
  });

  it('expires coverage after the next correct guess', () => {
    localStorage.setItem(
      'birdScore',
      JSON.stringify({
        birdsSeen: 14,
        birdsIdentified: 10,
        currentStreak: 6,
        justAchievedStreak: false,
        bestStreak: 6,
        seeds: 100,
      })
    );
    localStorage.setItem(
      'streakInsurance',
      JSON.stringify({
        active: true,
        protectedMissesRemaining: 1,
        cost: 10,
        purchasedAtStreak: 6,
      })
    );

    expireStreakInsuranceAfterGuess();

    expect(readStreakInsuranceState()).toEqual(defaultStreakInsuranceState);
  });
});