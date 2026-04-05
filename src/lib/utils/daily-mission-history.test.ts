import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DAILY_MISSION_HISTORY_STORAGE_KEY,
  getDailyMissionStreaks,
  recordDailyMissionCompletion,
  writeDailyMissionHistory,
} from './daily-mission-history';
import { BIRD_SCORE_STORAGE_KEY, defaultBirdScore } from './player-progress';

describe('daily mission history', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(BIRD_SCORE_STORAGE_KEY, JSON.stringify(defaultBirdScore));
    vi.useRealTimers();
  });

  it('computes current and best streaks from completed mission days', () => {
    const history = [
      { date: '2026-04-05' },
      { date: '2026-04-04' },
      { date: '2026-04-03' },
      { date: '2026-04-01' },
    ];

    expect(getDailyMissionStreaks(history, new Date('2026-04-05T12:00:00'))).toEqual({
      currentStreak: 3,
      bestStreak: 3,
    });
  });

  it('records a completed mission day once and syncs the streak to birdScore', () => {
    vi.setSystemTime(new Date('2026-04-05T12:00:00'));

    recordDailyMissionCompletion();
    recordDailyMissionCompletion();

    expect(JSON.parse(localStorage.getItem(DAILY_MISSION_HISTORY_STORAGE_KEY) ?? '[]')).toEqual([
      { date: '2026-04-05' },
    ]);
    expect(JSON.parse(localStorage.getItem(BIRD_SCORE_STORAGE_KEY) ?? '{}')).toMatchObject({
      currentDailyStreak: 1,
      bestDailyStreak: 1,
    });
  });

  it('normalizes and stores mission history in reverse chronological order', () => {
    writeDailyMissionHistory([
      { date: '2026-04-03' },
      { date: '2026-04-05' },
      { date: '2026-04-03' },
      { date: '2026-04-04' },
    ]);

    expect(JSON.parse(localStorage.getItem(DAILY_MISSION_HISTORY_STORAGE_KEY) ?? '[]')).toEqual([
      { date: '2026-04-05' },
      { date: '2026-04-04' },
      { date: '2026-04-03' },
    ]);
  });
});
