import { notifyStoredValueChanged } from '@/hooks/useStoredValue';
import { getTodayMissionDate } from '@/lib/utils/daily-mission-date';
import {
  DAILY_MISSION_HISTORY_STORAGE_KEY,
  readDailyMissionHistory,
  writeDailyMissionHistory,
} from '@/lib/utils/daily-mission-history';
import {
  BIRD_JOURNAL_STORAGE_KEY,
  mergeBirdJournalStores,
  readBirdJournal,
  writeBirdJournal,
} from '@/lib/utils/bird-journal';
import {
  BIRDHOUSE_FAKE_CAP,
  BIRDHOUSE_REAL_CAP,
  BIRDHOUSE_STORAGE_KEY,
  normalizeBirdhouseStore,
  readBirdhouse,
  writeBirdhouse,
} from '@/lib/utils/birdhouse';
import {
  BIRD_SCORE_STORAGE_KEY,
  mergeNonRoundRemoteScore,
  setUnlockedThemeNames,
  UNLOCKED_THEMES_STORAGE_KEY,
  getUnlockedThemeNames,
  writeBirdScore,
} from '@/lib/utils/player-progress';
import { getMissionDefinitionsForState, readSessionMissions, resetSessionMissions, writeSessionMissions } from '@/lib/utils/missions';
import type { BirdJournalEntry, BirdScore, DailyMissionHistoryEntry } from '@/types';
import type { BirdhouseStore } from '@/types';

export const ACCOUNT_SYNC_META_STORAGE_KEY = 'accountSyncMeta';
export const JOURNAL_SUMMARY_STORAGE_KEY = 'journalSummary';

export interface AccountSyncMeta {
  lastServerSyncAt: string | null;
  lastPulledAt: string | null;
  lastPushedAt: string | null;
}

export interface PulledAccountProgress {
  score: BirdScore;
  unlockedThemes: string[];
  dailyMissionHistory: DailyMissionHistoryEntry[];
  milestones: number[];
  journalEntries: BirdJournalEntry[];
  birdhouse: BirdhouseStore;
  journalSummary: {
    uniqueBirdCount: number;
    realBirdCount: number;
    fakeBirdCount: number;
    totalSeen: number;
    totalCorrect: number;
  };
  lastLocalSyncAt: string | null;
  todayMissionClaims: {
    date: string;
    claimedMissionIds: string[];
    bonusClaimed: boolean;
  } | null;
}

const defaultAccountSyncMeta: AccountSyncMeta = {
  lastServerSyncAt: null,
  lastPulledAt: null,
  lastPushedAt: null,
};

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

function mergeDailyMissionHistory(
  localHistory: DailyMissionHistoryEntry[],
  remoteHistory: DailyMissionHistoryEntry[]
): DailyMissionHistoryEntry[] {
  return Array.from(
    new Map(
      [...localHistory, ...remoteHistory].map((entry) => [entry.date, { date: entry.date }])
    ).values()
  ).sort((left, right) => right.date.localeCompare(left.date));
}

export function readAccountSyncMeta(): AccountSyncMeta {
  if (!isBrowser()) {
    return defaultAccountSyncMeta;
  }

  const raw = window.localStorage.getItem(ACCOUNT_SYNC_META_STORAGE_KEY);
  if (!raw) {
    return defaultAccountSyncMeta;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<AccountSyncMeta>;
    return {
      lastServerSyncAt: typeof parsed.lastServerSyncAt === 'string' ? parsed.lastServerSyncAt : null,
      lastPulledAt: typeof parsed.lastPulledAt === 'string' ? parsed.lastPulledAt : null,
      lastPushedAt: typeof parsed.lastPushedAt === 'string' ? parsed.lastPushedAt : null,
    };
  } catch {
    return defaultAccountSyncMeta;
  }
}

export function writeAccountSyncMeta(metaLike: Partial<AccountSyncMeta>): AccountSyncMeta {
  const nextMeta: AccountSyncMeta = {
    ...readAccountSyncMeta(),
    ...metaLike,
  };

  window.localStorage.setItem(ACCOUNT_SYNC_META_STORAGE_KEY, JSON.stringify(nextMeta));
  notifyStoredValueChanged(ACCOUNT_SYNC_META_STORAGE_KEY);
  return nextMeta;
}

export function applyPulledAccountProgress(progress: PulledAccountProgress): void {
  writeBirdScore(mergeNonRoundRemoteScore(progress.score));
  setUnlockedThemeNames([...getUnlockedThemeNames(), ...progress.unlockedThemes]);
  writeDailyMissionHistory(
    mergeDailyMissionHistory(readDailyMissionHistory(), progress.dailyMissionHistory)
  );
  const mergedJournal = mergeBirdJournalStores(
    readBirdJournal(),
    Object.fromEntries(progress.journalEntries.map((entry) => [entry.birdKey, entry]))
  );
  writeBirdJournal(mergedJournal);
  const localBirdhouse = readBirdhouse();
  const remoteBirdhouse = normalizeBirdhouseStore(progress.birdhouse);
  const toEpochMs = (timestamp: string): number => {
    const parsed = Date.parse(timestamp);
    return Number.isNaN(parsed) ? 0 : parsed;
  };
  const localIsNewer = toEpochMs(localBirdhouse.updatedAt) >= toEpochMs(remoteBirdhouse.updatedAt);
  const acceptedBirdhouse = localIsNewer
    ? {
        real: localBirdhouse.real.slice(0, BIRDHOUSE_REAL_CAP),
        fake: localBirdhouse.fake.slice(0, BIRDHOUSE_FAKE_CAP),
        updatedAt: localBirdhouse.updatedAt,
      }
    : {
        real: remoteBirdhouse.real.slice(0, BIRDHOUSE_REAL_CAP),
        fake: remoteBirdhouse.fake.slice(0, BIRDHOUSE_FAKE_CAP),
        updatedAt: remoteBirdhouse.updatedAt,
      };
  writeBirdhouse(
    acceptedBirdhouse,
    false
  );

  const today = getTodayMissionDate();

  if (progress.todayMissionClaims?.date === today) {
    const baseState = readSessionMissions(today);
    const missionTargetMap = new Map(
      getMissionDefinitionsForState(baseState).map((mission) => [mission.id, mission.target])
    );
    const hasCompletedToday = progress.dailyMissionHistory.some((entry) => entry.date === today);
    const claimedMissionIds = progress.todayMissionClaims.bonusClaimed
      ? baseState.missions.map((mission) => mission.missionId)
      : progress.todayMissionClaims.claimedMissionIds;
    const claimedMissionIdSet = new Set(claimedMissionIds);

    writeSessionMissions({
      ...baseState,
      missions: baseState.missions.map((mission) => ({
        ...mission,
        progress: hasCompletedToday || claimedMissionIdSet.has(mission.missionId)
          ? (missionTargetMap.get(mission.missionId) ?? mission.progress)
          : mission.progress,
        completed: hasCompletedToday || claimedMissionIdSet.has(mission.missionId) ? true : mission.completed,
        claimed: claimedMissionIdSet.has(mission.missionId) ? true : mission.claimed,
      })),
      bonusClaimed: progress.todayMissionClaims.bonusClaimed,
    });
  } else {
    resetSessionMissions(today);
  }

  notifyStoredValueChanged(BIRD_SCORE_STORAGE_KEY);
  notifyStoredValueChanged(BIRD_JOURNAL_STORAGE_KEY);
  notifyStoredValueChanged(BIRDHOUSE_STORAGE_KEY);
  notifyStoredValueChanged(UNLOCKED_THEMES_STORAGE_KEY);
  notifyStoredValueChanged(DAILY_MISSION_HISTORY_STORAGE_KEY);
  window.localStorage.setItem(JOURNAL_SUMMARY_STORAGE_KEY, JSON.stringify(progress.journalSummary));
  notifyStoredValueChanged(JOURNAL_SUMMARY_STORAGE_KEY);

  writeAccountSyncMeta({
    lastServerSyncAt: progress.lastLocalSyncAt,
    lastPulledAt: new Date().toISOString(),
  });
}