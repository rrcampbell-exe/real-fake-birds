import { describe, expect, it } from 'vitest';
import {
  PROFILE_REPORT_NOTE_MAX_LENGTH,
  isProfileReportReason,
  normalizeProfileReportNote,
  parseProfileReportInput,
} from './profile-reports';

describe('profile-reports', () => {
  it('recognizes supported report reasons', () => {
    expect(isProfileReportReason('spam')).toBe(true);
    expect(isProfileReportReason('made_up')).toBe(false);
  });

  it('normalizes optional notes', () => {
    expect(normalizeProfileReportNote('  repeated abuse  ')).toBe('repeated abuse');
    expect(normalizeProfileReportNote('')).toBeNull();
    expect(normalizeProfileReportNote(null)).toBeNull();
    expect(normalizeProfileReportNote(42)).toBeNull();
    expect(normalizeProfileReportNote('x'.repeat(PROFILE_REPORT_NOTE_MAX_LENGTH + 1))).toBeNull();
  });

  it('parses valid report input with optional note', () => {
    expect(
      parseProfileReportInput({ reason: 'harassment', note: '  abusive profile  ' }),
    ).toEqual({
      reason: 'harassment',
      note: 'abusive profile',
    });

    expect(parseProfileReportInput({ reason: 'other' })).toEqual({
      reason: 'other',
      note: null,
    });
  });

  it('rejects invalid payload shapes', () => {
    expect(parseProfileReportInput(null)).toBeNull();
    expect(parseProfileReportInput({})).toBeNull();
    expect(parseProfileReportInput({ reason: 'made_up' })).toBeNull();
    expect(parseProfileReportInput({ reason: 'spam', note: 123 })).toBeNull();
    expect(
      parseProfileReportInput({
        reason: 'spam',
        note: 'x'.repeat(PROFILE_REPORT_NOTE_MAX_LENGTH + 1),
      }),
    ).toBeNull();
  });
});
