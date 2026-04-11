import { CURRENT_HINTS_STORAGE_KEY } from '@/lib/constants/hints';
import { track } from '@/lib/analytics';
import { applyProgressEvents, pullAccountProgress, syncBirdJournal, syncLocalProgress, type LocalProgressPayload } from '@/lib/auth/account-sync';
import { applyPulledAccountProgress } from '@/lib/auth/account-sync-local';
import type { ProgressEvent } from '@/lib/progress/progress-events';
import { clearProgressEventOutbox, readProgressEventOutbox, removeQueuedProgressEvents } from '@/lib/progress/progress-event-outbox';
import { clearDirtyBirdJournalKeys, getDirtyBirdJournalEntries, readBirdJournal, writeBirdJournal } from '@/lib/utils/bird-journal';
import {
  getTodayChallengeDate,
  readDailyChallengeHistory,
  resetDailyChallengeState,
  writeDailyChallengeHistory,
} from '@/lib/utils/daily-challenge';
import { getTodayMissionDate } from '@/lib/utils/daily-mission-date';
import { readDailyMissionHistory, writeDailyMissionHistory } from '@/lib/utils/daily-mission-history';
import {
  defaultBirdScore,
  getEarnedMilestonesForBirds,
  getUnlockedThemeNames,
  mergeBirdScore,
  setUnlockedThemeNames,
  writeBirdScore,
  readBirdScore,
} from '@/lib/utils/player-progress';
import type { BirdScore } from '@/types';
import { resetSessionMissions } from '@/lib/utils/missions';
import {
  defaultStreakInsuranceState,
  writeStreakInsuranceState,
} from '@/lib/utils/streak-insurance';

export const ACCOUNT_STATE_CHANGED_EVENT = 'rfb-account-state-changed';
let progressFlushPromise: Promise<void> | null = null;
let signedInSyncPromise: Promise<void> | null = null;

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

export function notifyAccountStateChanged(): void {
  if (!isBrowser()) {
    return;
  }

  window.dispatchEvent(new Event(ACCOUNT_STATE_CHANGED_EVENT));
}

function readLocalProgressPayload(): LocalProgressPayload {
  const score = readBirdScore();

  return {
    score,
    unlockedThemes: getUnlockedThemeNames(score),
    dailyChallengeHistory: readDailyChallengeHistory(),
    dailyMissionHistory: readDailyMissionHistory(),
    milestones: getEarnedMilestonesForBirds(score.birdsIdentified).map((milestone) => milestone.value),
    journalEntries: Object.values(readBirdJournal()),
  };
}

function resetEphemeralLocalState(): void {
  if (!isBrowser()) {
    return;
  }

  resetDailyChallengeState(getTodayChallengeDate());
  resetSessionMissions(getTodayMissionDate());
  writeStreakInsuranceState(defaultStreakInsuranceState);
  localStorage.removeItem(`${CURRENT_HINTS_STORAGE_KEY}:classic`);
  localStorage.removeItem(`${CURRENT_HINTS_STORAGE_KEY}:daily`);
}

async function pushDirtyBirdJournalEntriesToAccount(): Promise<void> {
  const dirtyJournalEntries = getDirtyBirdJournalEntries();
  if (dirtyJournalEntries.length === 0) {
    return;
  }

  const response = await syncBirdJournal(dirtyJournalEntries);
  if (response.journalCount > 0) {
    clearDirtyBirdJournalKeys(dirtyJournalEntries.map((entry) => entry.birdKey));
  }
}

export function mergeFlushedProgressScore(
  localScore: BirdScore,
  remoteScoreLike: Partial<BirdScore>,
  flushedEvents: ProgressEvent[]
): BirdScore {
  const remoteScore = mergeBirdScore(remoteScoreLike, defaultBirdScore);
  const batchCanResetStreak = flushedEvents.some(
    (event) =>
      event.eventType === 'round-resolved' && !event.payload.isCorrect && !event.payload.streakProtected
  );

  return mergeBirdScore(
    {
      ...remoteScore,
      birdsSeen: Math.max(localScore.birdsSeen, remoteScore.birdsSeen),
      birdsIdentified: Math.max(localScore.birdsIdentified, remoteScore.birdsIdentified),
      currentStreak: batchCanResetStreak
        ? remoteScore.currentStreak
        : Math.max(localScore.currentStreak, remoteScore.currentStreak),
      justAchievedStreak: localScore.justAchievedStreak || remoteScore.justAchievedStreak,
      bestStreak: Math.max(localScore.bestStreak, remoteScore.bestStreak),
      currentDailyStreak: Math.max(localScore.currentDailyStreak, remoteScore.currentDailyStreak),
      bestDailyStreak: Math.max(localScore.bestDailyStreak, remoteScore.bestDailyStreak),
    },
    localScore
  );
}

export async function flushQueuedProgressEventsForSignedInUser(): Promise<void> {
  if (progressFlushPromise) {
    await progressFlushPromise;
    return;
  }

  progressFlushPromise = (async () => {
    let syncStartTracked = false;
    while (true) {
      const queuedEvents = readProgressEventOutbox();
      if (queuedEvents.length === 0) {
        return;
      }

      if (!syncStartTracked) {
        syncStartTracked = true;
        track('account_sync_started', { event_count: queuedEvents.length });
      }

      const response = await applyProgressEvents(queuedEvents);
      removeQueuedProgressEvents([...response.appliedEventIds, ...response.ignoredEventIds]);
      writeBirdScore(mergeFlushedProgressScore(readBirdScore(), response.snapshot.score, queuedEvents));
      setUnlockedThemeNames(response.snapshot.unlockedThemes);
      writeDailyChallengeHistory(response.snapshot.dailyChallengeHistory);
      await pushDirtyBirdJournalEntriesToAccount();
    }
  })().finally(() => {
    progressFlushPromise = null;
  });

  await progressFlushPromise;
}

export async function hydrateSignedInAccountToLocalState(options?: { notify?: boolean }): Promise<void> {
  resetEphemeralLocalState();

  if (readProgressEventOutbox().length > 0) {
    try {
      await flushQueuedProgressEventsForSignedInUser();
    } catch {
      // Keep queued events in place so a later sync can retry.
    }
  }

  const response = await pullAccountProgress(getTodayMissionDate());
  applyPulledAccountProgress({
    ...response.progress,
    lastLocalSyncAt: response.lastLocalSyncAt,
    todayMissionClaims: response.todayMissionClaims,
  });
  if (options?.notify !== false) {
    notifyAccountStateChanged();
  }
}

export async function syncSignedInAccountToLocalState(options?: { notify?: boolean }): Promise<void> {
  if (signedInSyncPromise) {
    await signedInSyncPromise;
    return;
  }

  signedInSyncPromise = (async () => {
    try {
      await flushQueuedProgressEventsForSignedInUser();
    } catch {
      // Pull the latest snapshot even if local event flush fails.
    }

    try {
      await pushDirtyBirdJournalEntriesToAccount();
    } catch {
      // Keep unsynced journal updates so the next sync attempt can retry.
    }

    const response = await pullAccountProgress(getTodayMissionDate());
    applyPulledAccountProgress({
      ...response.progress,
      lastLocalSyncAt: response.lastLocalSyncAt,
      todayMissionClaims: response.todayMissionClaims,
    });
    if (options?.notify !== false) {
      notifyAccountStateChanged();
    }
  })().finally(() => {
    signedInSyncPromise = null;
  });

  await signedInSyncPromise;
}

export async function pushCurrentLocalProgressToAccount(): Promise<void> {
  await syncLocalProgress(readLocalProgressPayload());
  notifyAccountStateChanged();
}

export async function prepareSignedInSessionForSignOut(): Promise<void> {
  try {
    await flushQueuedProgressEventsForSignedInUser();
  } catch {
    // Best effort only. Sign-out should not be blocked by sync failures.
  }

  try {
    await pushCurrentLocalProgressToAccount();
  } catch {
    // Best effort only. Sign-out should not be blocked by sync failures.
  }
}

export function resetLocalStateForGuestSession(): void {
  writeBirdScore(defaultBirdScore);
  setUnlockedThemeNames([]);
  writeDailyChallengeHistory([]);
  writeDailyMissionHistory([]);
  writeBirdJournal({});
  clearDirtyBirdJournalKeys();
  resetEphemeralLocalState();
  clearProgressEventOutbox();
  notifyAccountStateChanged();
}