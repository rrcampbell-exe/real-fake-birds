import { beforeEach, describe, expect, it } from 'vitest';
import {
  DAILY_MISSION_LAST_SEEN_DATE_STORAGE_KEY,
  markDailyMissionDateSeen,
  readLastSeenDailyMissionDate,
} from './daily-mission-notification';

describe('daily mission notification utilities', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('reads null when no seen date is stored', () => {
    expect(readLastSeenDailyMissionDate()).toBeNull();
  });

  it('stores and reads the seen mission date', () => {
    markDailyMissionDateSeen('2026-04-11');

    expect(localStorage.getItem(DAILY_MISSION_LAST_SEEN_DATE_STORAGE_KEY)).toBe('"2026-04-11"');
    expect(readLastSeenDailyMissionDate()).toBe('2026-04-11');
  });

  it('falls back to raw string storage when the value is not valid json', () => {
    localStorage.setItem(DAILY_MISSION_LAST_SEEN_DATE_STORAGE_KEY, '2026-04-12');

    expect(readLastSeenDailyMissionDate()).toBe('2026-04-12');
  });
});