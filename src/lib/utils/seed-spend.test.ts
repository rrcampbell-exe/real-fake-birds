import { describe, expect, it } from 'vitest';
import { refundSeeds, spendSeeds } from './seed-spend';
import { BIRD_SCORE_STORAGE_KEY } from './player-progress';

describe('seed-spend', () => {
  it('deducts seeds when the player can afford the cost', () => {
    localStorage.setItem(
      BIRD_SCORE_STORAGE_KEY,
      JSON.stringify({
        birdsSeen: 0,
        birdsIdentified: 0,
        currentStreak: 0,
        justAchievedStreak: false,
        bestStreak: 0,
        seeds: 60,
      })
    );

    expect(spendSeeds(25)).toBe(true);
    expect(JSON.parse(localStorage.getItem(BIRD_SCORE_STORAGE_KEY) ?? '{}').seeds).toBe(35);
  });

  it('does not deduct seeds when the player cannot afford the cost', () => {
    localStorage.setItem(
      BIRD_SCORE_STORAGE_KEY,
      JSON.stringify({
        birdsSeen: 0,
        birdsIdentified: 0,
        currentStreak: 0,
        justAchievedStreak: false,
        bestStreak: 0,
        seeds: 10,
      })
    );

    expect(spendSeeds(25)).toBe(false);
    expect(JSON.parse(localStorage.getItem(BIRD_SCORE_STORAGE_KEY) ?? '{}').seeds).toBe(10);
  });

  it('returns true and does not mutate storage when the spend cost is not positive', () => {
    localStorage.setItem(
      BIRD_SCORE_STORAGE_KEY,
      JSON.stringify({
        birdsSeen: 0,
        birdsIdentified: 0,
        currentStreak: 0,
        justAchievedStreak: false,
        bestStreak: 0,
        seeds: 10,
      })
    );

    expect(spendSeeds(0)).toBe(true);
    expect(spendSeeds(-5)).toBe(true);
    expect(JSON.parse(localStorage.getItem(BIRD_SCORE_STORAGE_KEY) ?? '{}').seeds).toBe(10);
  });

  it('refunds spent seeds', () => {
    localStorage.setItem(
      BIRD_SCORE_STORAGE_KEY,
      JSON.stringify({
        birdsSeen: 0,
        birdsIdentified: 0,
        currentStreak: 0,
        justAchievedStreak: false,
        bestStreak: 0,
        seeds: 10,
      })
    );

    refundSeeds(50);

    expect(JSON.parse(localStorage.getItem(BIRD_SCORE_STORAGE_KEY) ?? '{}').seeds).toBe(60);
  });

  it('does not mutate storage when the refund cost is not positive', () => {
    localStorage.setItem(
      BIRD_SCORE_STORAGE_KEY,
      JSON.stringify({
        birdsSeen: 0,
        birdsIdentified: 0,
        currentStreak: 0,
        justAchievedStreak: false,
        bestStreak: 0,
        seeds: 10,
      })
    );

    refundSeeds(0);
    refundSeeds(-5);

    expect(JSON.parse(localStorage.getItem(BIRD_SCORE_STORAGE_KEY) ?? '{}').seeds).toBe(10);
  });
});
