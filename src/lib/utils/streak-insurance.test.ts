import { describe, expect, it } from 'vitest';
import {
  consumeStreakInsurance,
  defaultStreakInsuranceState,
  getStreakInsuranceCost,
  isStreakInsuranceExpired,
  purchaseStreakInsurance,
  readStreakInsuranceState,
} from './streak-insurance';

describe('streak insurance', () => {
  it('prices protection from the current streak', () => {
    expect(getStreakInsuranceCost(5)).toBe(35);
    expect(getStreakInsuranceCost(12)).toBe(49);
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
      cost: 37,
      purchasedAtStreak: 6,
    });
    expect(JSON.parse(localStorage.getItem('birdScore') ?? '{}').seeds).toBe(63);
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
          cost: 35,
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
        cost: 35,
        purchasedAtStreak: 5,
      })
    );

    expect(consumeStreakInsurance()).toBe(false);
    expect(readStreakInsuranceState()).toEqual(defaultStreakInsuranceState);
  });
});