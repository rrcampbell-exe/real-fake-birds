import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  useAccountStateMock,
  useStoredJsonMock,
  useLocalMissionDateMock,
  flushQueuedProgressEventsForSignedInUserMock,
  syncDailyMissionCompletionMock,
  queueProgressEventMock,
  syncDailyMissionStreaksToBirdScoreMock,
  readSessionMissionsMock,
  writeSessionMissionsMock,
  createMissionRewardSummaryMock,
  getMissionRewardEventIdMock,
  readBirdScoreMock,
  writeBirdScoreMock,
  mergeNonRoundRemoteScoreMock,
} = vi.hoisted(() => ({
  useAccountStateMock: vi.fn(),
  useStoredJsonMock: vi.fn(),
  useLocalMissionDateMock: vi.fn(),
  flushQueuedProgressEventsForSignedInUserMock: vi.fn(),
  syncDailyMissionCompletionMock: vi.fn(),
  queueProgressEventMock: vi.fn(),
  syncDailyMissionStreaksToBirdScoreMock: vi.fn(),
  readSessionMissionsMock: vi.fn(),
  writeSessionMissionsMock: vi.fn((state) => state),
  createMissionRewardSummaryMock: vi.fn((id) => id === 'mission-set-bonus'
    ? { missionId: 'mission-set-bonus', rewardSeeds: 15 }
    : null),
  getMissionRewardEventIdMock: vi.fn((date, missionId) => `${date}:${missionId}`),
  readBirdScoreMock: vi.fn(),
  writeBirdScoreMock: vi.fn(),
  mergeNonRoundRemoteScoreMock: vi.fn((score) => score),
}));

vi.mock('@/components/account/AccountStateProvider', () => ({
  useAccountState: useAccountStateMock,
}));

vi.mock('./useStoredValue', () => ({
  useStoredJson: useStoredJsonMock,
}));

vi.mock('./useLocalMissionDate', () => ({
  useLocalMissionDate: useLocalMissionDateMock,
}));

vi.mock('@/lib/auth/account-session', () => ({
  flushQueuedProgressEventsForSignedInUser: flushQueuedProgressEventsForSignedInUserMock,
}));

vi.mock('@/lib/auth/account-sync', () => ({
  syncDailyMissionCompletion: syncDailyMissionCompletionMock,
}));

vi.mock('@/lib/progress/progress-event-outbox', () => ({
  queueProgressEvent: queueProgressEventMock,
}));

vi.mock('@/lib/utils/daily-mission-history', () => ({
  DAILY_MISSION_HISTORY_STORAGE_KEY: 'dailyMissionHistory',
  readDailyMissionHistory: vi.fn(() => []),
  syncDailyMissionStreaksToBirdScore: syncDailyMissionStreaksToBirdScoreMock,
}));

vi.mock('@/lib/utils/missions', () => ({
  createMissionRewardSummary: createMissionRewardSummaryMock,
  createSessionMissionsStateForDate: (date: string) => ({ date, missions: [], bonusClaimed: false }),
  getMissionRewardEventId: getMissionRewardEventIdMock,
  getMissionDefinitionsForState: (state: { missions: unknown[] }) => state.missions,
  readSessionMissions: readSessionMissionsMock,
  writeSessionMissions: writeSessionMissionsMock,
}));

vi.mock('@/lib/utils/player-progress', () => ({
  mergeNonRoundRemoteScore: mergeNonRoundRemoteScoreMock,
  readBirdScore: readBirdScoreMock,
  writeBirdScore: writeBirdScoreMock,
}));

import { useSessionMissions } from './useSessionMissions';

describe('useSessionMissions', () => {
  beforeEach(() => {
    useAccountStateMock.mockReset();
    useStoredJsonMock.mockReset();
    useLocalMissionDateMock.mockReset();
    flushQueuedProgressEventsForSignedInUserMock.mockReset();
    flushQueuedProgressEventsForSignedInUserMock.mockResolvedValue(undefined);
    syncDailyMissionCompletionMock.mockReset();
    syncDailyMissionCompletionMock.mockResolvedValue({ progressSummary: { seeds: 99 } });
    queueProgressEventMock.mockReset();
    syncDailyMissionStreaksToBirdScoreMock.mockReset();
    readSessionMissionsMock.mockReset();
    writeSessionMissionsMock.mockClear();
    createMissionRewardSummaryMock.mockClear();
    getMissionRewardEventIdMock.mockClear();
    readBirdScoreMock.mockReset();
    readBirdScoreMock.mockReturnValue({ seeds: 5 });
    writeBirdScoreMock.mockReset();
    mergeNonRoundRemoteScoreMock.mockReset();
    mergeNonRoundRemoteScoreMock.mockImplementation((score) => score);
    useLocalMissionDateMock.mockReturnValue('2026-04-07');
  });

  it('resets stale mission state when the stored date does not match today', async () => {
    const nextState = { date: '2026-04-07', missions: [], bonusClaimed: false };
    useAccountStateMock.mockReturnValue({ isSignedIn: false });
    useStoredJsonMock
      .mockReturnValueOnce({ date: '2026-04-06', missions: [], bonusClaimed: false })
      .mockReturnValueOnce([]);
    readSessionMissionsMock.mockReturnValue(nextState);

    renderHook(() => useSessionMissions());

    await waitFor(() => {
      expect(writeSessionMissionsMock).toHaveBeenCalledWith(nextState);
    });
    expect(syncDailyMissionStreaksToBirdScoreMock).toHaveBeenCalledWith([]);
  });

  it('auto-claims pending rewards and the set bonus for guests without queueing sync events', async () => {
    const storedState = {
      date: '2026-04-07',
      bonusClaimed: false,
      missions: [
        { id: 'm1', missionId: 'm1', description: 'One', rewardSeeds: 8, progress: 1, target: 1, completed: true, claimed: false },
        { id: 'm2', missionId: 'm2', description: 'Two', rewardSeeds: 6, progress: 1, target: 1, completed: true, claimed: false },
      ],
    };
    useAccountStateMock.mockReturnValue({ isSignedIn: false });
    useStoredJsonMock
      .mockReturnValueOnce(storedState)
      .mockReturnValueOnce([]);

    renderHook(() => useSessionMissions());

    await waitFor(() => {
      expect(writeBirdScoreMock).toHaveBeenCalledWith({ seeds: 34 });
    });
    expect(writeSessionMissionsMock).toHaveBeenCalledWith({
      ...storedState,
      missions: storedState.missions.map((mission) => ({ ...mission, claimed: true })),
      bonusClaimed: true,
    });
    expect(queueProgressEventMock).not.toHaveBeenCalled();
    expect(flushQueuedProgressEventsForSignedInUserMock).not.toHaveBeenCalled();
  });

  it('queues reward events and syncs completion when the user is signed in', async () => {
    const storedState = {
      date: '2026-04-07',
      bonusClaimed: false,
      missions: [
        { id: 'm1', missionId: 'm1', description: 'One', rewardSeeds: 8, progress: 1, target: 1, completed: true, claimed: false },
      ],
    };
    useAccountStateMock.mockReturnValue({ isSignedIn: true });
    useStoredJsonMock
      .mockReturnValueOnce(storedState)
      .mockReturnValueOnce([]);

    renderHook(() => useSessionMissions());

    await waitFor(() => {
      expect(queueProgressEventMock).toHaveBeenCalledTimes(2);
    });
    expect(queueProgressEventMock).toHaveBeenNthCalledWith(1, expect.objectContaining({
      eventId: '2026-04-07:m1',
      eventType: 'mission-reward-granted',
    }));
    expect(queueProgressEventMock).toHaveBeenNthCalledWith(2, expect.objectContaining({
      eventId: '2026-04-07:mission-set-bonus',
      eventType: 'mission-reward-granted',
    }));

    await waitFor(() => {
      expect(syncDailyMissionCompletionMock).toHaveBeenCalledWith('2026-04-07');
    });
    expect(flushQueuedProgressEventsForSignedInUserMock).toHaveBeenCalled();
    expect(mergeNonRoundRemoteScoreMock).toHaveBeenCalledWith({ seeds: 99 });
    expect(writeBirdScoreMock).toHaveBeenLastCalledWith({ seeds: 99 });
  });
});
