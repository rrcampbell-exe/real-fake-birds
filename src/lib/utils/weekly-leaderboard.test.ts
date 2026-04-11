import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getCurrentWeekStart,
  getNextWeekStart,
  getPreviousWeekStart,
  getTimeRemainingInWeek,
  getWeekEndDate,
  getWeekEndTimestamp,
  hasUnseenLeaderboardWeek,
  LEADERBOARD_LAST_SEEN_WEEK_STORAGE_KEY,
  markLeaderboardWeekSeen,
  markWeeklyRecapWeekSeen,
  readLastSeenLeaderboardWeek,
  readLastSeenWeeklyRecapWeek,
  WEEKLY_RECAP_LAST_SEEN_WEEK_STORAGE_KEY,
} from './weekly-leaderboard';

vi.mock('@/hooks/useStoredValue', () => ({
  notifyStoredValueChanged: vi.fn(),
}));

describe('weekly-leaderboard', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getCurrentWeekStart', () => {
    it('returns the Monday of the current week in Central Time (Mon)', () => {
      // 2026-04-06 is a Monday in central time
      const result = getCurrentWeekStart(new Date('2026-04-06T18:00:00.000Z'));
      expect(result).toBe('2026-04-06');
    });

    it('returns the Monday of the current week when date is mid-week (Wed)', () => {
      // 2026-04-08 is a Wednesday central time
      const result = getCurrentWeekStart(new Date('2026-04-08T18:00:00.000Z'));
      expect(result).toBe('2026-04-06');
    });

    it('returns the Monday of the current week when date is Sunday', () => {
      // 2026-04-12 is a Sunday central time
      const result = getCurrentWeekStart(new Date('2026-04-12T18:00:00.000Z'));
      expect(result).toBe('2026-04-06');
    });
  });

  describe('getPreviousWeekStart', () => {
    it('returns the Monday 7 days before the current week start', () => {
      const result = getPreviousWeekStart(new Date('2026-04-08T18:00:00.000Z'));
      expect(result).toBe('2026-03-30');
    });
  });

  describe('getNextWeekStart', () => {
    it('returns the Monday 7 days after the given week start', () => {
      expect(getNextWeekStart('2026-04-06')).toBe('2026-04-13');
    });
  });

  describe('getWeekEndDate', () => {
    it('is the same as getNextWeekStart', () => {
      expect(getWeekEndDate('2026-04-06')).toBe('2026-04-13');
    });
  });

  describe('getWeekEndTimestamp', () => {
    it('returns an ISO timestamp for midnight Central at the start of next week', () => {
      const ts = getWeekEndTimestamp('2026-04-06');
      // Should be an ISO string that is sometime on 2026-04-13
      expect(ts).toMatch(/^2026-04-13T/);
    });
  });

  describe('getTimeRemainingInWeek', () => {
    it('returns days/hours/minutes with positive totalMs when time remains', () => {
      // Monday at noon central = plenty of time left in the week
      const now = new Date('2026-04-06T18:00:00.000Z'); // noon-ish central
      const result = getTimeRemainingInWeek(now);
      expect(result.totalMs).toBeGreaterThan(0);
      expect(result.days).toBeGreaterThanOrEqual(0);
      expect(result.hours).toBeGreaterThanOrEqual(0);
      expect(result.minutes).toBeGreaterThanOrEqual(0);
    });

    it('returns zero totalMs and zero breakdown when week is over', () => {
      // Pass a now that is far past the week end
      const weekStart = '2026-04-06';
      const now = new Date('2026-05-01T00:00:00.000Z');
      const result = getTimeRemainingInWeek(now, weekStart);
      expect(result.totalMs).toBe(0);
      expect(result.days).toBe(0);
      expect(result.hours).toBe(0);
      expect(result.minutes).toBe(0);
    });

    it('computes days/hours/minutes correctly for a known remaining duration', () => {
      const weekStart = '2026-04-06';
      // end of week is early 2026-04-13 (midnight central = ~05:00 UTC in CDT)
      // Set now to exactly 2 days 3 hours before that
      const weekEndTs = getWeekEndTimestamp(weekStart);
      const weekEndMs = new Date(weekEndTs).getTime();
      const now = new Date(weekEndMs - (2 * 24 * 60 + 3 * 60 + 15) * 60 * 1000);
      const result = getTimeRemainingInWeek(now, weekStart);
      expect(result.days).toBe(2);
      expect(result.hours).toBe(3);
      expect(result.minutes).toBe(15);
    });
  });

  describe('readLastSeenLeaderboardWeek', () => {
    it('returns null when localStorage is empty', () => {
      expect(readLastSeenLeaderboardWeek()).toBeNull();
    });

    it('returns the parsed string when stored as JSON string', () => {
      localStorage.setItem(LEADERBOARD_LAST_SEEN_WEEK_STORAGE_KEY, JSON.stringify('2026-04-06'));
      expect(readLastSeenLeaderboardWeek()).toBe('2026-04-06');
    });

    it('returns raw value when stored value is not a string after parsing', () => {
      localStorage.setItem(LEADERBOARD_LAST_SEEN_WEEK_STORAGE_KEY, JSON.stringify({ bad: true }));
      expect(readLastSeenLeaderboardWeek()).toBe(JSON.stringify({ bad: true }));
    });

    it('returns raw value when JSON.parse throws', () => {
      localStorage.setItem(LEADERBOARD_LAST_SEEN_WEEK_STORAGE_KEY, '{not-valid-json');
      expect(readLastSeenLeaderboardWeek()).toBe('{not-valid-json');
    });
  });

  describe('markLeaderboardWeekSeen', () => {
    it('writes the week start as JSON to localStorage', () => {
      markLeaderboardWeekSeen('2026-04-06');
      expect(localStorage.getItem(LEADERBOARD_LAST_SEEN_WEEK_STORAGE_KEY)).toBe('"2026-04-06"');
    });
  });

  describe('hasUnseenLeaderboardWeek', () => {
    it('returns true when the current week has not been seen', () => {
      expect(hasUnseenLeaderboardWeek('2026-04-06')).toBe(true);
    });

    it('returns false when the current week matches the last seen week', () => {
      markLeaderboardWeekSeen('2026-04-06');
      expect(hasUnseenLeaderboardWeek('2026-04-06')).toBe(false);
    });

    it('returns true when a different week was last seen', () => {
      markLeaderboardWeekSeen('2026-03-30');
      expect(hasUnseenLeaderboardWeek('2026-04-06')).toBe(true);
    });
  });

  describe('markWeeklyRecapWeekSeen', () => {
    it('stores and reads the last seen recap week', () => {
      markWeeklyRecapWeekSeen('2026-03-30');

      expect(localStorage.getItem(WEEKLY_RECAP_LAST_SEEN_WEEK_STORAGE_KEY)).toBe(JSON.stringify('2026-03-30'));
      expect(readLastSeenWeeklyRecapWeek()).toBe('2026-03-30');
    });
  });
});
