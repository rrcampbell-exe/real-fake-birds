import { describe, expect, it } from 'vitest';
import { applyProgressEvents, createProgressSnapshot, type ProgressEvent } from './progress-events';

describe('applyProgressEvents', () => {
  it('applies correct rounds and hint spend/refund without mutating mission-based daily streaks', () => {
    const events: ProgressEvent[] = [
      {
        eventId: '1',
        eventType: 'hint-spent',
        occurredAt: '2026-04-04T12:00:00.000Z',
        payload: { mode: 'classic', cost: 10 },
      },
      {
        eventId: '2',
        eventType: 'round-resolved',
        occurredAt: '2026-04-04T12:00:01.000Z',
        payload: { mode: 'daily', isCorrect: true, streakProtected: false, challengeDate: '2026-04-04' },
      },
      {
        eventId: '3',
        eventType: 'hint-refunded',
        occurredAt: '2026-04-04T12:00:02.000Z',
        payload: { mode: 'classic', cost: 10 },
      },
      {
        eventId: '4',
        eventType: 'round-resolved',
        occurredAt: '2026-04-04T12:00:03.000Z',
        payload: { mode: 'classic', isCorrect: false, streakProtected: false },
      },
    ];

    const snapshot = applyProgressEvents(
      createProgressSnapshot({
        score: {
          birdsSeen: 9,
          birdsIdentified: 9,
          currentStreak: 9,
          justAchievedStreak: false,
          bestStreak: 9,
          currentDailyStreak: 0,
          bestDailyStreak: 0,
          seeds: 20,
        },
      }),
      events
    );

    expect(snapshot.score).toMatchObject({
      birdsSeen: 11,
      birdsIdentified: 10,
      currentStreak: 0,
      bestStreak: 10,
      currentDailyStreak: 0,
      bestDailyStreak: 0,
      seeds: 33,
    });
    expect(snapshot.unlockedThemes).toContain('Raven');
    expect(snapshot.milestoneValues).toContain(10);
    expect(snapshot.dailyChallengeHistory[0]).toEqual({
      date: '2026-04-04',
      correctAnswers: 1,
      roundsPlayed: 1,
      completed: false,
    });
  });

  it('adds mission reward grant events to the player seed total', () => {
    const events: ProgressEvent[] = [
      {
        eventId: 'mission-1',
        eventType: 'mission-reward-granted',
        occurredAt: '2026-04-04T12:00:00.000Z',
        payload: {
          missionDate: '2026-04-04',
          missionId: 'warmup-rounds',
          rewardSeeds: 8,
        },
      },
    ];

    const snapshot = applyProgressEvents(
      createProgressSnapshot({
        score: {
          birdsSeen: 0,
          birdsIdentified: 0,
          currentStreak: 0,
          justAchievedStreak: false,
          bestStreak: 0,
          currentDailyStreak: 0,
          bestDailyStreak: 0,
          seeds: 3,
        },
      }),
      events
    );

    expect(snapshot.score.seeds).toBe(11);
  });
});
