import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DAILY_MISSION_HISTORY_STORAGE_KEY,
  DAILY_MISSION_STREAK_MIGRATION_STORAGE_KEY,
  getDailyMissionStreaks,
  readDailyMissionHistory,
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

    expect(getDailyMissionStreaks(history, new Date(2026, 3, 5, 12, 0, 0))).toEqual({
      currentStreak: 3,
      bestStreak: 3,
    });
  });

  it('records a completed mission day once and syncs the streak to birdScore', () => {
    vi.setSystemTime(new Date(2026, 3, 5, 12, 0, 0));

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

  it('preserves an active daily streak through the one-time local-date migration grace window', () => {
    localStorage.setItem(
      BIRD_SCORE_STORAGE_KEY,
      JSON.stringify({
        ...defaultBirdScore,
        currentDailyStreak: 4,
        bestDailyStreak: 6,
      })
    );

    expect(getDailyMissionStreaks([], new Date(2026, 3, 5, 12, 0, 0))).toEqual({
      currentStreak: 4,
      bestStreak: 6,
    });

    expect(getDailyMissionStreaks([], new Date(2026, 3, 7, 12, 0, 0))).toEqual({
      currentStreak: 0,
      bestStreak: 0,
    });
  });

  it('returns an empty array when stored history is not a JSON array', () => {
    localStorage.setItem(DAILY_MISSION_HISTORY_STORAGE_KEY, JSON.stringify({ not: 'an array' }));
    expect(readDailyMissionHistory()).toEqual([]);
  });

  it('returns an empty array when stored history is invalid JSON', () => {
    localStorage.setItem(DAILY_MISSION_HISTORY_STORAGE_KEY, '{bad json');
    expect(readDailyMissionHistory()).toEqual([]);
  });

  it('returns null when stored migration state has an unexpected version', () => {
    localStorage.setItem(
      DAILY_MISSION_STREAK_MIGRATION_STORAGE_KEY,
      JSON.stringify({
        version: 2,
        preservedCurrentStreak: 3,
        preservedBestStreak: 5,
        graceExpiresOn: '2026-04-10',
      })
    );
    // getDailyMissionStreaks calls readDailyMissionStreakMigrationState internally;
    // with an invalid version it treats the state as absent (no preserved streak used)
    expect(getDailyMissionStreaks([], new Date(2026, 3, 5, 12, 0, 0))).toEqual({
      currentStreak: 0,
      bestStreak: 0,
    });
  });

  it('returns null when stored migration state is invalid JSON', () => {
    localStorage.setItem(DAILY_MISSION_STREAK_MIGRATION_STORAGE_KEY, '{invalid');
    expect(getDailyMissionStreaks([], new Date(2026, 3, 5, 12, 0, 0))).toEqual({
      currentStreak: 0,
      bestStreak: 0,
    });
  });

  it('skips the streak sync when birdScore already matches the computed streaks', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 3, 5, 12, 0, 0));
    const history = [{ date: '2026-04-05' }, { date: '2026-04-04' }];
    // Pre-set the birdScore with the matching streaks so writeDailyMissionHistory skips the update
    localStorage.setItem(BIRD_SCORE_STORAGE_KEY, JSON.stringify({
      ...defaultBirdScore,
      currentDailyStreak: 2,
      bestDailyStreak: 2,
    }));
    writeDailyMissionHistory(history);
    // Writing again with the same history should not change the stored streak
    writeDailyMissionHistory(history);
    const stored = JSON.parse(localStorage.getItem(BIRD_SCORE_STORAGE_KEY) ?? '{}') as Record<string, unknown>;
    expect(stored.currentDailyStreak).toBe(2);
  });
});
