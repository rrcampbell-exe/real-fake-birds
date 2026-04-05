import { CURRENT_HINTS_STORAGE_KEY } from '@/lib/constants/hints';
import { applyProgressEvents, pullAccountProgress, syncLocalProgress, type LocalProgressPayload } from '@/lib/auth/account-sync';
import { applyPulledAccountProgress } from '@/lib/auth/account-sync-local';
import { clearProgressEventOutbox, readProgressEventOutbox, removeQueuedProgressEvents } from '@/lib/progress/progress-event-outbox';
import { readBirdJournal, writeBirdJournal } from '@/lib/utils/bird-journal';
import {
  getTodayChallengeDate,
  readDailyChallengeHistory,
  resetDailyChallengeState,
  writeDailyChallengeHistory,
} from '@/lib/utils/daily-challenge';
import { readDailyMissionHistory, writeDailyMissionHistory } from '@/lib/utils/daily-mission-history';
import {
  defaultBirdScore,
  getEarnedMilestonesForBirds,
  getUnlockedThemeNames,
  setUnlockedThemeNames,
  writeBirdScore,
  readBirdScore,
} from '@/lib/utils/player-progress';
import { resetSessionMissions } from '@/lib/utils/missions';
import {
  defaultStreakInsuranceState,
  writeStreakInsuranceState,
} from '@/lib/utils/streak-insurance';

export const ACCOUNT_STATE_CHANGED_EVENT = 'rfb-account-state-changed';
let progressFlushPromise: Promise<void> | null = null;

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
  resetSessionMissions(getTodayChallengeDate());
  writeStreakInsuranceState(defaultStreakInsuranceState);
  localStorage.removeItem(`${CURRENT_HINTS_STORAGE_KEY}:classic`);
  localStorage.removeItem(`${CURRENT_HINTS_STORAGE_KEY}:daily`);
}

export async function flushQueuedProgressEventsForSignedInUser(): Promise<void> {
  if (progressFlushPromise) {
    await progressFlushPromise;
    return;
  }

  progressFlushPromise = (async () => {
    while (true) {
      const queuedEvents = readProgressEventOutbox();
      if (queuedEvents.length === 0) {
        return;
      }

      const response = await applyProgressEvents(queuedEvents);
      removeQueuedProgressEvents([...response.appliedEventIds, ...response.ignoredEventIds]);
      writeBirdScore(response.snapshot.score);
      setUnlockedThemeNames(response.snapshot.unlockedThemes);
      writeDailyChallengeHistory(response.snapshot.dailyChallengeHistory);
    }
  })().finally(() => {
    progressFlushPromise = null;
  });

  await progressFlushPromise;
}

export async function hydrateSignedInAccountToLocalState(): Promise<void> {
  resetEphemeralLocalState();
  clearProgressEventOutbox();
  const response = await pullAccountProgress();
  applyPulledAccountProgress({
    ...response.progress,
    lastLocalSyncAt: response.lastLocalSyncAt,
    todayDailyChallenge: response.todayDailyChallenge,
    todayMissionClaims: response.todayMissionClaims,
  });
  notifyAccountStateChanged();
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
  resetEphemeralLocalState();
  clearProgressEventOutbox();
  notifyAccountStateChanged();
}