import { notifyStoredValueChanged } from '@/hooks/useStoredValue';
import type { DailyMissionHistoryEntry } from '@/types';
import { getTodayMissionDate, shiftMissionDate } from './daily-mission-date';
import { readBirdScore, writeBirdScore } from './player-progress';

export const DAILY_MISSION_HISTORY_STORAGE_KEY = 'dailyMissionHistory';
export const DAILY_MISSION_STREAK_MIGRATION_STORAGE_KEY = 'dailyMissionStreakMigration';

interface DailyMissionStreaks {
  currentStreak: number;
  bestStreak: number;
}

interface DailyMissionStreakMigrationState {
  version: 1;
  preservedCurrentStreak: number;
  preservedBestStreak: number;
  graceExpiresOn: string;
}

const settledDailyMissionStreakMigrationState: DailyMissionStreakMigrationState = {
  version: 1,
  preservedCurrentStreak: 0,
  preservedBestStreak: 0,
  graceExpiresOn: '0000-00-00',
};

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

function readDailyMissionStreakMigrationState(): DailyMissionStreakMigrationState | null {
  if (!isBrowser()) {
    return null;
  }

  const raw = window.localStorage.getItem(DAILY_MISSION_STREAK_MIGRATION_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<DailyMissionStreakMigrationState>;
    if (
      parsed.version !== 1
      || typeof parsed.preservedCurrentStreak !== 'number'
      || typeof parsed.preservedBestStreak !== 'number'
      || typeof parsed.graceExpiresOn !== 'string'
    ) {
      return null;
    }

    return {
      version: 1,
      preservedCurrentStreak: parsed.preservedCurrentStreak,
      preservedBestStreak: parsed.preservedBestStreak,
      graceExpiresOn: parsed.graceExpiresOn,
    };
  } catch {
    return null;
  }
}

function writeDailyMissionStreakMigrationState(
  state: DailyMissionStreakMigrationState | null
): DailyMissionStreakMigrationState | null {
  if (!isBrowser()) {
    return state;
  }

  if (!state) {
    window.localStorage.removeItem(DAILY_MISSION_STREAK_MIGRATION_STORAGE_KEY);
    notifyStoredValueChanged(DAILY_MISSION_STREAK_MIGRATION_STORAGE_KEY);
    return null;
  }

  window.localStorage.setItem(DAILY_MISSION_STREAK_MIGRATION_STORAGE_KEY, JSON.stringify(state));
  notifyStoredValueChanged(DAILY_MISSION_STREAK_MIGRATION_STORAGE_KEY);
  return state;
}

function ensureDailyMissionStreakMigrationState(now = new Date()): DailyMissionStreakMigrationState | null {
  const existing = readDailyMissionStreakMigrationState();
  if (existing) {
    return existing;
  }

  if (!isBrowser()) {
    return null;
  }

  const score = readBirdScore();
  if (score.currentDailyStreak <= 0 && score.bestDailyStreak <= 0) {
    return null;
  }

  return writeDailyMissionStreakMigrationState({
    version: 1,
    preservedCurrentStreak: score.currentDailyStreak,
    preservedBestStreak: score.bestDailyStreak,
    graceExpiresOn: shiftMissionDate(getTodayMissionDate(now), 1),
  });
}

function applyDailyMissionStreakMigrationGrace(
  streaks: DailyMissionStreaks,
  now = new Date()
): DailyMissionStreaks {
  const migrationState = ensureDailyMissionStreakMigrationState(now);
  if (!migrationState) {
    return streaks;
  }

  if (getTodayMissionDate(now) > migrationState.graceExpiresOn) {
    writeDailyMissionStreakMigrationState(settledDailyMissionStreakMigrationState);
    return streaks;
  }

  return {
    currentStreak: Math.max(streaks.currentStreak, migrationState.preservedCurrentStreak),
    bestStreak: Math.max(streaks.bestStreak, migrationState.preservedBestStreak),
  };
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
    return applyDailyMissionStreakMigrationGrace({
      currentStreak: 0,
      bestStreak: 0,
    }, now);
  }

  const completedDates = new Set(normalizedHistory.map((entry) => entry.date));
  let currentCursor = getTodayMissionDate(now);
  let currentStreak = 0;

  const todayKey = currentCursor;
  if (!completedDates.has(todayKey)) {
    currentCursor = shiftMissionDate(currentCursor, -1);
  }

  while (completedDates.has(currentCursor)) {
    currentStreak += 1;
    currentCursor = shiftMissionDate(currentCursor, -1);
  }

  const ascending = [...normalizedHistory].sort((left, right) => left.date.localeCompare(right.date));
  let bestStreak = 1;
  let runningStreak = 1;

  for (let index = 1; index < ascending.length; index += 1) {
    if (ascending[index].date === shiftMissionDate(ascending[index - 1].date, 1)) {
      runningStreak += 1;
      bestStreak = Math.max(bestStreak, runningStreak);
      continue;
    }

    runningStreak = 1;
  }

  return applyDailyMissionStreakMigrationGrace({
    currentStreak,
    bestStreak,
  }, now);
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

export function recordDailyMissionCompletion(date = getTodayMissionDate()): DailyMissionHistoryEntry[] {
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
  const nextBestDailyStreak = Math.max(score.bestDailyStreak, bestStreak);

  if (score.currentDailyStreak === currentStreak && score.bestDailyStreak === nextBestDailyStreak) {
    return;
  }

  writeBirdScore(
    {
      ...score,
      currentDailyStreak: currentStreak,
      bestDailyStreak: nextBestDailyStreak,
    },
    false
  );
}