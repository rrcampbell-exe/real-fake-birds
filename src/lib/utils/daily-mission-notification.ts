import { notifyStoredValueChanged } from '@/hooks/useStoredValue';

export const DAILY_MISSION_LAST_SEEN_DATE_STORAGE_KEY = 'dailyMissionLastSeenDate';

export function readLastSeenDailyMissionDate(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = window.localStorage.getItem(DAILY_MISSION_LAST_SEEN_DATE_STORAGE_KEY);
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

export function markDailyMissionDateSeen(date: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(DAILY_MISSION_LAST_SEEN_DATE_STORAGE_KEY, JSON.stringify(date));
  notifyStoredValueChanged(DAILY_MISSION_LAST_SEEN_DATE_STORAGE_KEY);
}