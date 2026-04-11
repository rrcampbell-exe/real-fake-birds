import { notifyStoredValueChanged } from '@/hooks/useStoredValue';

const CENTRAL_TIME_ZONE = 'America/Chicago';
const WEEKDAY_INDEX: Record<string, number> = {
  Mon: 0,
  Tue: 1,
  Wed: 2,
  Thu: 3,
  Fri: 4,
  Sat: 5,
  Sun: 6,
};

const CENTRAL_DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  timeZone: CENTRAL_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  weekday: 'short',
});

const CENTRAL_OFFSET_FORMATTER = new Intl.DateTimeFormat('en-US', {
  timeZone: CENTRAL_TIME_ZONE,
  timeZoneName: 'shortOffset',
});

export const LEADERBOARD_LAST_SEEN_WEEK_STORAGE_KEY = 'leaderboardLastSeenWeek';
export const WEEKLY_RECAP_LAST_SEEN_WEEK_STORAGE_KEY = 'weeklyChallengeRecapLastSeenWeek';

function getCentralParts(date: Date): { year: number; month: number; day: number; weekday: number } {
  const parts = CENTRAL_DATE_FORMATTER.formatToParts(date);
  const year = Number.parseInt(parts.find((part) => part.type === 'year')?.value ?? '0', 10);
  const month = Number.parseInt(parts.find((part) => part.type === 'month')?.value ?? '1', 10);
  const day = Number.parseInt(parts.find((part) => part.type === 'day')?.value ?? '1', 10);
  const weekdayToken = parts.find((part) => part.type === 'weekday')?.value ?? 'Mon';

  return {
    year,
    month,
    day,
    weekday: WEEKDAY_INDEX[weekdayToken] ?? 0,
  };
}

function parseOffsetMinutes(token: string): number {
  const match = /GMT([+-])(\d{1,2})(?::?(\d{2}))?/.exec(token);
  if (!match) {
    return 0;
  }

  const sign = match[1] === '-' ? -1 : 1;
  const hours = Number.parseInt(match[2], 10);
  const minutes = Number.parseInt(match[3] ?? '0', 10);
  return sign * ((hours * 60) + minutes);
}

function getCentralOffsetMinutes(date: Date): number {
  const token = CENTRAL_OFFSET_FORMATTER.formatToParts(date).find((part) => part.type === 'timeZoneName')?.value ?? 'GMT+0';
  return parseOffsetMinutes(token);
}

function shiftIsoDateByDays(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split('-').map((value) => Number.parseInt(value, 10));
  const utcDate = new Date(Date.UTC(year, month - 1, day, 12));
  utcDate.setUTCDate(utcDate.getUTCDate() + days);
  return utcDate.toISOString().slice(0, 10);
}

function localMidnightInCentralToUtc(isoDate: string): Date {
  const [year, month, day] = isoDate.split('-').map((value) => Number.parseInt(value, 10));
  const approxUtc = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
  const offsetMinutes = getCentralOffsetMinutes(approxUtc);
  return new Date(approxUtc.getTime() - (offsetMinutes * 60 * 1000));
}

export function getCurrentWeekStart(date = new Date()): string {
  const parts = getCentralParts(date);
  const localDate = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 12));
  localDate.setUTCDate(localDate.getUTCDate() - parts.weekday);
  return localDate.toISOString().slice(0, 10);
}

export function getPreviousWeekStart(date = new Date()): string {
  return shiftIsoDateByDays(getCurrentWeekStart(date), -7);
}

export function getNextWeekStart(weekStart: string): string {
  return shiftIsoDateByDays(weekStart, 7);
}

export function getWeekEndDate(weekStart: string): string {
  return getNextWeekStart(weekStart);
}

export function getWeekEndTimestamp(weekStart: string): string {
  return localMidnightInCentralToUtc(getNextWeekStart(weekStart)).toISOString();
}

export function getTimeRemainingInWeek(now = new Date(), weekStart = getCurrentWeekStart(now)): {
  totalMs: number;
  days: number;
  hours: number;
  minutes: number;
} {
  const remainingMs = Math.max(0, localMidnightInCentralToUtc(getNextWeekStart(weekStart)).getTime() - now.getTime());
  const totalMinutes = Math.floor(remainingMs / (60 * 1000));
  const days = Math.floor(totalMinutes / (24 * 60));
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
  const minutes = totalMinutes % 60;

  return {
    totalMs: remainingMs,
    days,
    hours,
    minutes,
  };
}

export function readLastSeenLeaderboardWeek(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = window.localStorage.getItem(LEADERBOARD_LAST_SEEN_WEEK_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    return typeof parsed === 'string' ? parsed : raw;
  } catch {
    return raw;
  }
}

export function markLeaderboardWeekSeen(weekStart: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(LEADERBOARD_LAST_SEEN_WEEK_STORAGE_KEY, JSON.stringify(weekStart));
  notifyStoredValueChanged(LEADERBOARD_LAST_SEEN_WEEK_STORAGE_KEY);
}

export function readLastSeenWeeklyRecapWeek(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = window.localStorage.getItem(WEEKLY_RECAP_LAST_SEEN_WEEK_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    return typeof parsed === 'string' ? parsed : raw;
  } catch {
    return raw;
  }
}

export function markWeeklyRecapWeekSeen(weekStart: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(WEEKLY_RECAP_LAST_SEEN_WEEK_STORAGE_KEY, JSON.stringify(weekStart));
  notifyStoredValueChanged(WEEKLY_RECAP_LAST_SEEN_WEEK_STORAGE_KEY);
}

export function hasUnseenLeaderboardWeek(currentWeekStart: string): boolean {
  const lastSeenWeek = readLastSeenLeaderboardWeek();
  return lastSeenWeek !== currentWeekStart;
}
