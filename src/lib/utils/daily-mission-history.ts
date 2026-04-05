import { notifyStoredValueChanged } from '@/hooks/useStoredValue';
import type { DailyMissionHistoryEntry } from '@/types';
import { readBirdScore, writeBirdScore } from './player-progress';
import { getTodayChallengeDate } from './daily-challenge';

export const DAILY_MISSION_HISTORY_STORAGE_KEY = 'dailyMissionHistory';

interface DailyMissionStreaks {
  currentStreak: number;
  bestStreak: number;
}

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

function normalizeHistory(historyLike: DailyMissionHistoryEntry[]): DailyMissionHistoryEntry[] {
  return Array.from(
    new Map(
      historyLike
        .filter((entry) => /^\d{4}-\d{2}-\d{2}$/.test(entry.date))
        .map((entry) => [entry.date, { date: entry.date }])
    ).values()
  ).sort((left, right) => right.date.localeCompare(left.date));
}

export function readDailyMissionHistory(): DailyMissionHistoryEntry[] {
  if (!isBrowser()) {
    return [];
  }

  const raw = window.localStorage.getItem(DAILY_MISSION_HISTORY_STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return normalizeHistory(
      parsed.filter(
        (entry): entry is DailyMissionHistoryEntry =>
          Boolean(entry) && typeof entry === 'object' && typeof (entry as DailyMissionHistoryEntry).date === 'string'
      )
    );
  } catch {
    return [];
  }
}

export function getDailyMissionStreaks(
  history = readDailyMissionHistory(),
  now = new Date()
): DailyMissionStreaks {
  const normalizedHistory = normalizeHistory(history);
  if (normalizedHistory.length === 0) {
    return {
      currentStreak: 0,
      bestStreak: 0,
    };
  }

  const completedDates = new Set(normalizedHistory.map((entry) => entry.date));
  const currentCursor = new Date(`${getTodayChallengeDate(now)}T12:00:00`);
  let currentStreak = 0;

  const todayKey = getTodayChallengeDate(currentCursor);
  if (!completedDates.has(todayKey)) {
    currentCursor.setDate(currentCursor.getDate() - 1);
  }

  while (completedDates.has(getTodayChallengeDate(currentCursor))) {
    currentStreak += 1;
    currentCursor.setDate(currentCursor.getDate() - 1);
  }

  const ascending = [...normalizedHistory].sort((left, right) => left.date.localeCompare(right.date));
  let bestStreak = 1;
  let runningStreak = 1;

  for (let index = 1; index < ascending.length; index += 1) {
    const previous = new Date(`${ascending[index - 1].date}T12:00:00`);
    previous.setDate(previous.getDate() + 1);

    if (ascending[index].date === getTodayChallengeDate(previous)) {
      runningStreak += 1;
      bestStreak = Math.max(bestStreak, runningStreak);
      continue;
    }

    runningStreak = 1;
  }

  return {
    currentStreak,
    bestStreak,
  };
}

export function writeDailyMissionHistory(history: DailyMissionHistoryEntry[]): DailyMissionHistoryEntry[] {
  const normalizedHistory = normalizeHistory(history);

  if (!isBrowser()) {
    return normalizedHistory;
  }

  window.localStorage.setItem(DAILY_MISSION_HISTORY_STORAGE_KEY, JSON.stringify(normalizedHistory));
  syncDailyMissionStreaksToBirdScore(normalizedHistory);
  notifyStoredValueChanged(DAILY_MISSION_HISTORY_STORAGE_KEY);
  return normalizedHistory;
}

export function hasCompletedDailyMissions(date: string, history = readDailyMissionHistory()): boolean {
  return history.some((entry) => entry.date === date);
}

export function recordDailyMissionCompletion(date = getTodayChallengeDate()): DailyMissionHistoryEntry[] {
  if (hasCompletedDailyMissions(date)) {
    return readDailyMissionHistory();
  }

  return writeDailyMissionHistory([{ date }, ...readDailyMissionHistory()]);
}

export function syncDailyMissionStreaksToBirdScore(history = readDailyMissionHistory()): void {
  if (!isBrowser()) {
    return;
  }

  const score = readBirdScore();
  const { currentStreak, bestStreak } = getDailyMissionStreaks(history);

  if (score.currentDailyStreak === currentStreak && score.bestDailyStreak === bestStreak) {
    return;
  }

  writeBirdScore(
    {
      ...score,
      currentDailyStreak: currentStreak,
      bestDailyStreak: bestStreak,
    },
    false
  );
}