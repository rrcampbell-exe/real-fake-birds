import { describe, expect, it } from 'vitest';
import { mergeFlushedProgressScore } from './account-session';
import type { ProgressEvent } from '@/lib/progress/progress-events';

describe('account-session', () => {
  it('preserves a higher local streak when a correct-only flush returns a stale snapshot', () => {
    const merged = mergeFlushedProgressScore(
      {
        birdsSeen: 12,
        birdsIdentified: 12,
        currentStreak: 6,
        justAchievedStreak: false,
        bestStreak: 6,
        currentDailyStreak: 0,
        bestDailyStreak: 0,
        seeds: 18,
      },
      {
        birdsSeen: 7,
        birdsIdentified: 7,
        currentStreak: 0,
        bestStreak: 5,
        currentDailyStreak: 0,
        bestDailyStreak: 0,
        seeds: 18,
      },
      [
        {
          eventId: 'round-1',
          eventType: 'round-resolved',
          occurredAt: '2026-04-06T10:00:00.000Z',
          payload: {
            mode: 'classic',
            isCorrect: true,
            streakProtected: false,
            currentStreak: 6,
            seedsEarned: 1,
          },
        } satisfies ProgressEvent,
      ]
    );

    expect(merged).toMatchObject({
      birdsSeen: 12,
      birdsIdentified: 12,
      currentStreak: 6,
      bestStreak: 6,
    });
  });

  it('allows a flushed miss to keep the lower server streak result', () => {
    const merged = mergeFlushedProgressScore(
      {
        birdsSeen: 12,
        birdsIdentified: 11,
        currentStreak: 0,
        justAchievedStreak: false,
        bestStreak: 6,
        currentDailyStreak: 0,
        bestDailyStreak: 0,
        seeds: 18,
      },
      {
        birdsSeen: 12,
        birdsIdentified: 11,
        currentStreak: 0,
        bestStreak: 6,
        currentDailyStreak: 0,
        bestDailyStreak: 0,
        seeds: 18,
      },
      [
        {
          eventId: 'round-2',
          eventType: 'round-resolved',
          occurredAt: '2026-04-06T10:01:00.000Z',
          payload: {
            mode: 'classic',
            isCorrect: false,
            streakProtected: false,
            currentStreak: 0,
            seedsEarned: 0,
          },
        } satisfies ProgressEvent,
      ]
    );

    expect(merged.currentStreak).toBe(0);
  });
});