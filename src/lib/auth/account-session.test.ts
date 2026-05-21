import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ProgressEvent } from '@/lib/progress/progress-events';

const {
  applyProgressEventsMock,
  pullAccountProgressMock,
  syncBirdhouseMock,
  syncBirdJournalMock,
  syncLocalProgressMock,
  applyPulledAccountProgressMock,
  clearProgressEventOutboxMock,
  readProgressEventOutboxMock,
  removeQueuedProgressEventsMock,
  clearDirtyBirdJournalKeysMock,
  getDirtyBirdJournalEntriesMock,
  readBirdhouseMock,
  readBirdJournalMock,
  writeBirdhouseMock,
  writeBirdJournalMock,
  getTodayMissionDateMock,
  readDailyMissionHistoryMock,
  writeDailyMissionHistoryMock,
  getEarnedMilestonesForBirdsMock,
  getUnlockedThemeNamesMock,
  setUnlockedThemeNamesMock,
  writeBirdScoreMock,
  readBirdScoreMock,
  resetSessionMissionsMock,
  writeStreakInsuranceStateMock,
} = vi.hoisted(() => ({
  applyProgressEventsMock: vi.fn(),
  pullAccountProgressMock: vi.fn(),
  syncBirdhouseMock: vi.fn(),
  syncBirdJournalMock: vi.fn(),
  syncLocalProgressMock: vi.fn(),
  applyPulledAccountProgressMock: vi.fn(),
  clearProgressEventOutboxMock: vi.fn(),
  readProgressEventOutboxMock: vi.fn(),
  removeQueuedProgressEventsMock: vi.fn(),
  clearDirtyBirdJournalKeysMock: vi.fn(),
  getDirtyBirdJournalEntriesMock: vi.fn(),
  readBirdhouseMock: vi.fn(),
  readBirdJournalMock: vi.fn(),
  writeBirdhouseMock: vi.fn(),
  writeBirdJournalMock: vi.fn(),
  getTodayMissionDateMock: vi.fn(),
  readDailyMissionHistoryMock: vi.fn(),
  writeDailyMissionHistoryMock: vi.fn(),
  getEarnedMilestonesForBirdsMock: vi.fn(),
  getUnlockedThemeNamesMock: vi.fn(),
  setUnlockedThemeNamesMock: vi.fn(),
  writeBirdScoreMock: vi.fn(),
  readBirdScoreMock: vi.fn(),
  resetSessionMissionsMock: vi.fn(),
  writeStreakInsuranceStateMock: vi.fn(),
}));

vi.mock('@/lib/auth/account-sync', () => ({
  applyProgressEvents: applyProgressEventsMock,
  pullAccountProgress: pullAccountProgressMock,
  syncBirdhouse: syncBirdhouseMock,
  syncBirdJournal: syncBirdJournalMock,
  syncLocalProgress: syncLocalProgressMock,
}));

vi.mock('@/lib/auth/account-sync-local', () => ({
  applyPulledAccountProgress: applyPulledAccountProgressMock,
}));

vi.mock('@/lib/progress/progress-event-outbox', () => ({
  clearProgressEventOutbox: clearProgressEventOutboxMock,
  readProgressEventOutbox: readProgressEventOutboxMock,
  removeQueuedProgressEvents: removeQueuedProgressEventsMock,
}));

vi.mock('@/lib/utils/bird-journal', () => ({
  clearDirtyBirdJournalKeys: clearDirtyBirdJournalKeysMock,
  getDirtyBirdJournalEntries: getDirtyBirdJournalEntriesMock,
  readBirdJournal: readBirdJournalMock,
  writeBirdJournal: writeBirdJournalMock,
}));

vi.mock('@/lib/utils/birdhouse', () => ({
  readBirdhouse: readBirdhouseMock,
  writeBirdhouse: writeBirdhouseMock,
}));

vi.mock('@/lib/utils/daily-mission-date', () => ({
  getTodayMissionDate: getTodayMissionDateMock,
}));

vi.mock('@/lib/utils/daily-mission-history', () => ({
  readDailyMissionHistory: readDailyMissionHistoryMock,
  writeDailyMissionHistory: writeDailyMissionHistoryMock,
}));

vi.mock('@/lib/utils/player-progress', async () => {
  const actual = await vi.importActual<typeof import('@/lib/utils/player-progress')>('@/lib/utils/player-progress');
  return {
    ...actual,
    getEarnedMilestonesForBirds: getEarnedMilestonesForBirdsMock,
    getUnlockedThemeNames: getUnlockedThemeNamesMock,
    setUnlockedThemeNames: setUnlockedThemeNamesMock,
    writeBirdScore: writeBirdScoreMock,
    readBirdScore: readBirdScoreMock,
  };
});

vi.mock('@/lib/utils/missions', () => ({
  resetSessionMissions: resetSessionMissionsMock,
}));

vi.mock('@/lib/utils/streak-insurance', async () => {
  const actual = await vi.importActual<typeof import('@/lib/utils/streak-insurance')>('@/lib/utils/streak-insurance');
  return {
    ...actual,
    writeStreakInsuranceState: writeStreakInsuranceStateMock,
  };
});

import {
  ACCOUNT_STATE_CHANGED_EVENT,
  flushQueuedProgressEventsForSignedInUser,
  hydrateSignedInAccountToLocalState,
  mergeFlushedProgressScore,
  notifyAccountStateChanged,
  prepareSignedInSessionForSignOut,
  pushCurrentLocalProgressToAccount,
  resetLocalStateForGuestSession,
  syncSignedInAccountToLocalState,
} from './account-session';
import { defaultBirdScore } from '@/lib/utils/player-progress';

describe('account-session', () => {
  const queuedEvent: ProgressEvent = {
    eventId: 'round-1',
    eventType: 'round-resolved',
    occurredAt: '2026-04-06T10:00:00.000Z',
    payload: {
      mode: 'classic',
      isCorrect: true,
      streakProtected: false,
      currentStreak: 6,
      seedsEarned: 1,
    },
  };

  beforeEach(() => {
    localStorage.clear();
    applyProgressEventsMock.mockReset();
    pullAccountProgressMock.mockReset();
    syncBirdhouseMock.mockReset();
    syncBirdhouseMock.mockResolvedValue({ birdhouse: { real: [], fake: [], updatedAt: new Date(0).toISOString() } });
    syncBirdJournalMock.mockReset();
    syncBirdJournalMock.mockResolvedValue({ journalCount: 0 });
    syncLocalProgressMock.mockReset();
    applyPulledAccountProgressMock.mockReset();
    clearProgressEventOutboxMock.mockReset();
    readProgressEventOutboxMock.mockReset();
    readProgressEventOutboxMock.mockReturnValue([]);
    removeQueuedProgressEventsMock.mockReset();
    clearDirtyBirdJournalKeysMock.mockReset();
    getDirtyBirdJournalEntriesMock.mockReset();
    getDirtyBirdJournalEntriesMock.mockReturnValue([]);
    readBirdhouseMock.mockReset();
    readBirdhouseMock.mockReturnValue({ real: [], fake: [], updatedAt: '2026-04-07T00:00:00.000Z' });
    readBirdJournalMock.mockReset();
    readBirdJournalMock.mockReturnValue({ bird1: { birdKey: 'bird1' } });
    writeBirdhouseMock.mockReset();
    writeBirdJournalMock.mockReset();
    getTodayMissionDateMock.mockReset();
    getTodayMissionDateMock.mockReturnValue('2026-04-07');
    readDailyMissionHistoryMock.mockReset();
    readDailyMissionHistoryMock.mockReturnValue([{ date: '2026-04-06' }]);
    writeDailyMissionHistoryMock.mockReset();
    getEarnedMilestonesForBirdsMock.mockReset();
    getEarnedMilestonesForBirdsMock.mockReturnValue([{ value: 10 }]);
    getUnlockedThemeNamesMock.mockReset();
    getUnlockedThemeNamesMock.mockReturnValue(['Finch', 'Robin']);
    setUnlockedThemeNamesMock.mockReset();
    writeBirdScoreMock.mockReset();
    readBirdScoreMock.mockReset();
    readBirdScoreMock.mockReturnValue({
      birdsSeen: 12,
      birdsIdentified: 7,
      currentStreak: 2,
      justAchievedStreak: false,
      bestStreak: 6,
      activePersonalBestTarget: null,
      currentDailyStreak: 1,
      bestDailyStreak: 2,
      seeds: 18,
    });
    resetSessionMissionsMock.mockReset();
    writeStreakInsuranceStateMock.mockReset();
  });

  it('preserves a higher local streak when a correct-only flush returns a stale snapshot', () => {
    const merged = mergeFlushedProgressScore(
      {
        birdsSeen: 12,
        birdsIdentified: 12,
        currentStreak: 6,
        justAchievedStreak: false,
        bestStreak: 6,
        activePersonalBestTarget: 5,
        currentDailyStreak: 0,
        bestDailyStreak: 0,
        seeds: 18,
      },
      {
        birdsSeen: 7,
        birdsIdentified: 7,
        currentStreak: 0,
        bestStreak: 5,
        currentDailyStreak: 0,
        bestDailyStreak: 0,
        seeds: 18,
      },
      [queuedEvent]
    );

    expect(merged).toMatchObject({
      birdsSeen: 12,
      birdsIdentified: 12,
      currentStreak: 6,
      bestStreak: 6,
      activePersonalBestTarget: 5,
    });
  });

  it('allows a flushed miss to keep the lower server streak result', () => {
    const merged = mergeFlushedProgressScore(
      {
        birdsSeen: 12,
        birdsIdentified: 11,
        currentStreak: 0,
        justAchievedStreak: false,
        bestStreak: 6,
        activePersonalBestTarget: null,
        currentDailyStreak: 0,
        bestDailyStreak: 0,
        seeds: 18,
      },
      {
        birdsSeen: 12,
        birdsIdentified: 11,
        currentStreak: 0,
        bestStreak: 6,
        activePersonalBestTarget: null,
        currentDailyStreak: 0,
        bestDailyStreak: 0,
        seeds: 18,
      },
      [
        {
          ...queuedEvent,
          eventId: 'round-2',
          payload: {
            ...queuedEvent.payload,
            isCorrect: false,
            currentStreak: 0,
            seedsEarned: 0,
          },
        },
      ]
    );

    expect(merged.currentStreak).toBe(0);
  });

  it('dispatches the account state change event', () => {
    const listener = vi.fn();
    window.addEventListener(ACCOUNT_STATE_CHANGED_EVENT, listener);

    notifyAccountStateChanged();

    expect(listener).toHaveBeenCalledTimes(1);
    window.removeEventListener(ACCOUNT_STATE_CHANGED_EVENT, listener);
  });

  it('returns early when there are no queued progress events to flush', async () => {
    await flushQueuedProgressEventsForSignedInUser();

    expect(applyProgressEventsMock).not.toHaveBeenCalled();
    expect(removeQueuedProgressEventsMock).not.toHaveBeenCalled();
  });

  it('flushes queued progress events and persists the returned snapshot', async () => {
    readProgressEventOutboxMock
      .mockReturnValueOnce([queuedEvent])
      .mockReturnValueOnce([]);
    applyProgressEventsMock.mockResolvedValue({
      appliedEventIds: ['round-1'],
      ignoredEventIds: ['skip-1'],
      snapshot: {
        score: {
          birdsSeen: 15,
          birdsIdentified: 10,
          currentStreak: 4,
          bestStreak: 6,
          currentDailyStreak: 1,
          bestDailyStreak: 2,
          seeds: 22,
        },
        unlockedThemes: ['Robin'],
      },
    });

    await flushQueuedProgressEventsForSignedInUser();

    expect(applyProgressEventsMock).toHaveBeenCalledWith([queuedEvent], { keepalive: undefined });
    expect(removeQueuedProgressEventsMock).toHaveBeenCalledWith(['round-1', 'skip-1']);
    expect(writeBirdScoreMock).toHaveBeenCalled();
    expect(setUnlockedThemeNamesMock).toHaveBeenCalledWith(['Robin']);
    expect(syncBirdJournalMock).not.toHaveBeenCalled();
    expect(syncBirdhouseMock).toHaveBeenCalledWith({ real: [], fake: [], updatedAt: '2026-04-07T00:00:00.000Z' });
  });

  it('pushes dirty bird journal entries after flushing progress events', async () => {
    getDirtyBirdJournalEntriesMock.mockReturnValue([
      {
        birdKey: 'real:blue-jay',
        birdName: 'Blue Jay',
        isReal: true,
        seenCount: 2,
        correctCount: 1,
        incorrectCount: 1,
        lastSeenAt: '2026-04-07T10:00:00.000Z',
        metadata: {},
      },
    ]);
    readProgressEventOutboxMock
      .mockReturnValueOnce([queuedEvent])
      .mockReturnValueOnce([]);
    applyProgressEventsMock.mockResolvedValue({
      appliedEventIds: ['round-1'],
      ignoredEventIds: [],
      snapshot: {
        score: defaultBirdScore,
        unlockedThemes: [],
      },
    });
    syncBirdJournalMock.mockResolvedValue({ journalCount: 1 });

    await flushQueuedProgressEventsForSignedInUser();

    expect(syncBirdJournalMock).toHaveBeenCalledWith([
      expect.objectContaining({ birdKey: 'real:blue-jay' }),
    ]);
    expect(clearDirtyBirdJournalKeysMock).toHaveBeenCalledWith(['real:blue-jay']);
    expect(syncBirdhouseMock).toHaveBeenCalled();
  });

  it('hydrates local state from the signed-in account and resets ephemeral state first', async () => {
    localStorage.setItem('currentHints:classic', '1');
    localStorage.setItem('currentHints:daily', '1');
    const listener = vi.fn();
    window.addEventListener(ACCOUNT_STATE_CHANGED_EVENT, listener);
    pullAccountProgressMock.mockResolvedValue({
      progress: { score: { seeds: 22 } },
      journalSummary: undefined,
      lastLocalSyncAt: '2026-04-07T10:00:00.000Z',
      todayMissionClaims: null,
    });

    await hydrateSignedInAccountToLocalState();

    expect(resetSessionMissionsMock).toHaveBeenCalledWith('2026-04-07');
    expect(writeStreakInsuranceStateMock).toHaveBeenCalled();
    expect(localStorage.getItem('currentHints:classic')).toBeNull();
    expect(localStorage.getItem('currentHints:daily')).toBeNull();
    expect(pullAccountProgressMock).toHaveBeenCalledWith('2026-04-07');
    expect(applyPulledAccountProgressMock).toHaveBeenCalledWith({
      score: { seeds: 22 },
      journalSummary: undefined,
      lastLocalSyncAt: '2026-04-07T10:00:00.000Z',
      todayMissionClaims: null,
    });
    expect(listener).toHaveBeenCalledTimes(1);
    window.removeEventListener(ACCOUNT_STATE_CHANGED_EVENT, listener);
  });

  it('syncs signed-in state even when flushing queued events fails, and deduplicates concurrent syncs', async () => {
    vi.useFakeTimers();
    readProgressEventOutboxMock.mockReturnValue([queuedEvent]);
    applyProgressEventsMock.mockRejectedValue(new Error('flush failed'));

    let resolvePull: ((value: unknown) => void) | undefined;
    pullAccountProgressMock.mockReturnValue(new Promise((resolve) => {
      resolvePull = resolve;
    }));

    const first = syncSignedInAccountToLocalState({ notify: false });
    const second = syncSignedInAccountToLocalState({ notify: false });

    await vi.runAllTimersAsync();

    resolvePull?.({
      progress: { score: { seeds: 30 } },
      lastLocalSyncAt: '2026-04-07T11:00:00.000Z',
      todayMissionClaims: null,
    });

    await Promise.all([first, second]);
    vi.useRealTimers();

    expect(pullAccountProgressMock).toHaveBeenCalledTimes(1);
    expect(applyPulledAccountProgressMock).toHaveBeenCalled();
  });

  it('pushes dirty bird journal entries before pulling signed-in account progress', async () => {
    getDirtyBirdJournalEntriesMock.mockReturnValue([
      {
        birdKey: 'real:blue-jay',
        birdName: 'Blue Jay',
        isReal: true,
        seenCount: 2,
        correctCount: 1,
        incorrectCount: 1,
        lastSeenAt: '2026-04-07T10:00:00.000Z',
        metadata: {},
      },
    ]);
    syncBirdJournalMock.mockResolvedValue({ journalCount: 1 });
    pullAccountProgressMock.mockResolvedValue({
      progress: { score: { seeds: 30 } },
      journalSummary: undefined,
      lastLocalSyncAt: '2026-04-07T11:00:00.000Z',
      todayMissionClaims: null,
    });

    await syncSignedInAccountToLocalState({ notify: false });

    expect(syncBirdJournalMock).toHaveBeenCalledWith([
      expect.objectContaining({ birdKey: 'real:blue-jay' }),
    ]);
    expect(clearDirtyBirdJournalKeysMock).toHaveBeenCalledWith(['real:blue-jay']);
    expect(syncBirdhouseMock).toHaveBeenCalled();
    expect(pullAccountProgressMock).toHaveBeenCalledWith('2026-04-07');
  });

  it('pushes the current local payload to the account and notifies listeners', async () => {
    const listener = vi.fn();
    window.addEventListener(ACCOUNT_STATE_CHANGED_EVENT, listener);

    await pushCurrentLocalProgressToAccount();

    expect(syncLocalProgressMock).toHaveBeenCalledWith(
      expect.objectContaining({
        score: expect.objectContaining({ seeds: 18 }),
        unlockedThemes: ['Finch', 'Robin'],
        dailyMissionHistory: [{ date: '2026-04-06' }],
        milestones: [10],
      }),
      '2026-04-07',
    );
    expect(listener).toHaveBeenCalledTimes(1);
    window.removeEventListener(ACCOUNT_STATE_CHANGED_EVENT, listener);
  });

  it('swallows sync failures while preparing the signed-in session for sign-out', async () => {
    vi.useFakeTimers();
    readProgressEventOutboxMock.mockReturnValue([queuedEvent]);
    applyProgressEventsMock.mockRejectedValue(new Error('flush failed'));
    syncLocalProgressMock.mockRejectedValue(new Error('push failed'));

    const pendingSignOut = prepareSignedInSessionForSignOut();
    await vi.runAllTimersAsync();
    await expect(pendingSignOut).resolves.toBeUndefined();
    vi.useRealTimers();
  });

  it('resets local state for the guest session', () => {
    const listener = vi.fn();
    window.addEventListener(ACCOUNT_STATE_CHANGED_EVENT, listener);

    resetLocalStateForGuestSession();

    expect(writeBirdScoreMock).toHaveBeenCalledWith(defaultBirdScore);
    expect(setUnlockedThemeNamesMock).toHaveBeenCalledWith([]);
    expect(writeDailyMissionHistoryMock).toHaveBeenCalledWith([]);
    expect(writeBirdJournalMock).toHaveBeenCalledWith({});
    expect(writeBirdhouseMock).toHaveBeenCalledWith({ real: [], fake: [], updatedAt: new Date(0).toISOString() });
    expect(clearDirtyBirdJournalKeysMock).toHaveBeenCalled();
    expect(clearProgressEventOutboxMock).toHaveBeenCalled();
    expect(resetSessionMissionsMock).toHaveBeenCalledWith('2026-04-07');
    expect(listener).toHaveBeenCalledTimes(1);
    window.removeEventListener(ACCOUNT_STATE_CHANGED_EVENT, listener);
  });
});
