import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getNextMissionMidnightDelayMs,
  getTodayMissionDate,
  shiftMissionDate,
} from './daily-mission-date';

describe('daily-mission-date', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('getTodayMissionDate', () => {
    it('returns the local date as YYYY-MM-DD', () => {
      vi.setSystemTime(new Date(2026, 3, 9, 14, 30, 0)); // April 9, 2026
      expect(getTodayMissionDate()).toBe('2026-04-09');
    });

    it('uses the provided date when given', () => {
      expect(getTodayMissionDate(new Date(2026, 0, 1, 0, 0, 0))).toBe('2026-01-01');
    });
  });

  describe('shiftMissionDate', () => {
    it('shifts forward by a positive number of days', () => {
      expect(shiftMissionDate('2026-04-05', 2)).toBe('2026-04-07');
    });

    it('shifts backward by a negative number of days', () => {
      expect(shiftMissionDate('2026-04-05', -1)).toBe('2026-04-04');
    });

    it('handles month boundary correctly', () => {
      expect(shiftMissionDate('2026-03-31', 2)).toBe('2026-04-02');
    });

    it('handles year boundary correctly', () => {
      expect(shiftMissionDate('2025-12-30', 3)).toBe('2026-01-02');
    });
  });

  describe('getNextMissionMidnightDelayMs', () => {
    it('returns ms until next local midnight', () => {
      vi.setSystemTime(new Date(2026, 3, 9, 23, 59, 50)); // 10s before midnight
      const delay = getNextMissionMidnightDelayMs();
      expect(delay).toBeGreaterThan(0);
      expect(delay).toBeLessThan(15_000);
    });

    it('returns at least 50ms', () => {
      vi.setSystemTime(new Date(2026, 3, 9, 0, 0, 0, 0)); // exactly midnight
      const delay = getNextMissionMidnightDelayMs();
      expect(delay).toBeGreaterThanOrEqual(50);
    });
  });
});
