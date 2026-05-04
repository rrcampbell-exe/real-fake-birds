import { describe, expect, it } from 'vitest';
import { formatJoinedMonthYear } from './profile-helpers';

describe('formatJoinedMonthYear', () => {
  it('formats an ISO timestamp as Month Year using UTC', () => {
    expect(formatJoinedMonthYear('2026-04-03T12:00:00Z')).toBe('April 2026');
  });

  it('uses UTC calendar month, not local time (near midnight boundary)', () => {
    // 2026-01-01T00:30:00Z — should be January regardless of local timezone
    expect(formatJoinedMonthYear('2026-01-01T00:30:00Z')).toBe('January 2026');
  });

  it('handles leap year month correctly', () => {
    expect(formatJoinedMonthYear('2024-02-29T06:00:00Z')).toBe('February 2024');
  });

  it('formats December correctly', () => {
    expect(formatJoinedMonthYear('2025-12-15T00:00:00Z')).toBe('December 2025');
  });

  it('returns empty string for an invalid date string', () => {
    expect(formatJoinedMonthYear('not-a-date')).toBe('');
  });
});
