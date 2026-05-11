export const PROFILE_REPORT_REASONS = [
  'harassment',
  'spam',
  'impersonation',
  'inappropriate_profile',
  'other',
] as const;

export type ProfileReportReason = typeof PROFILE_REPORT_REASONS[number];

export const PROFILE_REPORT_NOTE_MAX_LENGTH = 500;

export interface ParsedProfileReportInput {
  reason: ProfileReportReason;
  note: string | null;
}

export function isProfileReportReason(value: unknown): value is ProfileReportReason {
  return typeof value === 'string'
    && (PROFILE_REPORT_REASONS as readonly string[]).includes(value);
}

export function normalizeProfileReportNote(value: unknown): string | null {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.length > PROFILE_REPORT_NOTE_MAX_LENGTH) {
    return null;
  }

  return trimmed;
}

export function parseProfileReportInput(body: unknown): ParsedProfileReportInput | null {
  if (!body || typeof body !== 'object') {
    return null;
  }

  const candidate = body as Record<string, unknown>;
  if (!isProfileReportReason(candidate.reason)) {
    return null;
  }

  if (
    candidate.note !== undefined
    && candidate.note !== null
    && candidate.note !== ''
    && typeof candidate.note !== 'string'
  ) {
    return null;
  }

  if (typeof candidate.note === 'string' && candidate.note.trim().length > PROFILE_REPORT_NOTE_MAX_LENGTH) {
    return null;
  }

  return {
    reason: candidate.reason,
    note: normalizeProfileReportNote(candidate.note),
  };
}
