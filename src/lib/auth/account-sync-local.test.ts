import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  notifyStoredValueChangedMock,
  getTodayChallengeDateMock,
  readDailyChallengeHistoryMock,
  resetDailyChallengeStateMock,
  writeDailyChallengeHistoryMock,
  writeDailyChallengeStateMock,
  getTodayMissionDateMock,
  readDailyMissionHistoryMock,
  writeDailyMissionHistoryMock,
  mergeBirdJournalStoresMock,
  readBirdJournalMock,
  writeBirdJournalMock,
  mergeNonRoundRemoteScoreMock,
  setUnlockedThemeNamesMock,
  getUnlockedThemeNamesMock,
  writeBirdScoreMock,
  getMissionDefinitionsForStateMock,
  readSessionMissionsMock,
  resetSessionMissionsMock,
  writeSessionMissionsMock,
} = vi.hoisted(() => ({
  notifyStoredValueChangedMock: vi.fn(),
  getTodayChallengeDateMock: vi.fn(),
  readDailyChallengeHistoryMock: vi.fn(),
  resetDailyChallengeStateMock: vi.fn(),
  writeDailyChallengeHistoryMock: vi.fn(),
  writeDailyChallengeStateMock: vi.fn(),
  getTodayMissionDateMock: vi.fn(),
  readDailyMissionHistoryMock: vi.fn(),
  writeDailyMissionHistoryMock: vi.fn(),
  mergeBirdJournalStoresMock: vi.fn(),
  readBirdJournalMock: vi.fn(),
  writeBirdJournalMock: vi.fn(),
  mergeNonRoundRemoteScoreMock: vi.fn(),
  setUnlockedThemeNamesMock: vi.fn(),
  getUnlockedThemeNamesMock: vi.fn(),
  writeBirdScoreMock: vi.fn(),
  getMissionDefinitionsForStateMock: vi.fn(),
  readSessionMissionsMock: vi.fn(),
  resetSessionMissionsMock: vi.fn(),
  writeSessionMissionsMock: vi.fn(),
}));

vi.mock('@/hooks/useStoredValue', () => ({
  notifyStoredValueChanged: notifyStoredValueChangedMock,
}));

vi.mock('@/lib/utils/daily-challenge', () => ({
  getTodayChallengeDate: getTodayChallengeDateMock,
  readDailyChallengeHistory: readDailyChallengeHistoryMock,
  resetDailyChallengeState: resetDailyChallengeStateMock,
  writeDailyChallengeHistory: writeDailyChallengeHistoryMock,
  writeDailyChallengeState: writeDailyChallengeStateMock,
}));

vi.mock('@/lib/utils/daily-mission-date', () => ({
  getTodayMissionDate: getTodayMissionDateMock,
}));

vi.mock('@/lib/utils/daily-mission-history', () => ({
  DAILY_MISSION_HISTORY_STORAGE_KEY: 'dailyMissionHistory',
  readDailyMissionHistory: readDailyMissionHistoryMock,
  writeDailyMissionHistory: writeDailyMissionHistoryMock,
}));

vi.mock('@/lib/utils/bird-journal', () => ({
  BIRD_JOURNAL_STORAGE_KEY: 'birdJournal',
  mergeBirdJournalStores: mergeBirdJournalStoresMock,
  readBirdJournal: readBirdJournalMock,
  writeBirdJournal: writeBirdJournalMock,
}));

vi.mock('@/lib/utils/player-progress', () => ({
  BIRD_SCORE_STORAGE_KEY: 'birdScore',
  UNLOCKED_THEMES_STORAGE_KEY: 'unlockedThemes',
  mergeNonRoundRemoteScore: mergeNonRoundRemoteScoreMock,
  setUnlockedThemeNames: setUnlockedThemeNamesMock,
  getUnlockedThemeNames: getUnlockedThemeNamesMock,
  writeBirdScore: writeBirdScoreMock,
}));

vi.mock('@/lib/utils/missions', () => ({
  getMissionDefinitionsForState: getMissionDefinitionsForStateMock,
  readSessionMissions: readSessionMissionsMock,
  resetSessionMissions: resetSessionMissionsMock,
  writeSessionMissions: writeSessionMissionsMock,
}));

import {
  ACCOUNT_SYNC_META_STORAGE_KEY,
  applyPulledAccountProgress,
  readAccountSyncMeta,
  writeAccountSyncMeta,
} from './account-sync-local';

describe('account-sync-local', () => {
  beforeEach(() => {
    localStorage.clear();
    notifyStoredValueChangedMock.mockReset();
    getTodayChallengeDateMock.mockReset();
    getTodayChallengeDateMock.mockReturnValue('2026-04-07');
    readDailyChallengeHistoryMock.mockReset();
    readDailyChallengeHistoryMock.mockReturnValue([{ date: '2026-04-05', correctAnswers: 2, roundsPlayed: 5, completed: true }]);
    resetDailyChallengeStateMock.mockReset();
    writeDailyChallengeHistoryMock.mockReset();
    writeDailyChallengeStateMock.mockReset();
    getTodayMissionDateMock.mockReset();
    getTodayMissionDateMock.mockReturnValue('2026-04-07');
    readDailyMissionHistoryMock.mockReset();
    readDailyMissionHistoryMock.mockReturnValue([{ date: '2026-04-05' }]);
    writeDailyMissionHistoryMock.mockReset();
    mergeBirdJournalStoresMock.mockReset();
    mergeBirdJournalStoresMock.mockReturnValue({ merged: true });
    readBirdJournalMock.mockReset();
    readBirdJournalMock.mockReturnValue({ local: true });
    writeBirdJournalMock.mockReset();
    mergeNonRoundRemoteScoreMock.mockReset();
    mergeNonRoundRemoteScoreMock.mockImplementation((score) => ({ ...score, merged: true }));
    setUnlockedThemeNamesMock.mockReset();
    getUnlockedThemeNamesMock.mockReset();
    getUnlockedThemeNamesMock.mockReturnValue(['Finch']);
    writeBirdScoreMock.mockReset();
    getMissionDefinitionsForStateMock.mockReset();
    getMissionDefinitionsForStateMock.mockReturnValue([
      { id: 'm1', target: 2 },
      { id: 'm2', target: 3 },
    ]);
    readSessionMissionsMock.mockReset();
    readSessionMissionsMock.mockReturnValue({
      date: '2026-04-07',
      missions: [
        { missionId: 'm1', progress: 0, completed: false, claimed: false },
        { missionId: 'm2', progress: 1, completed: false, claimed: false },
      ],
      bonusClaimed: false,
    });
    resetSessionMissionsMock.mockReset();
    writeSessionMissionsMock.mockReset();
  });

  it('reads account sync meta with defaults, parsed values, and invalid JSON fallback', () => {
    expect(readAccountSyncMeta()).toEqual({
      lastServerSyncAt: null,
      lastPulledAt: null,
      lastPushedAt: null,
    });

    localStorage.setItem(ACCOUNT_SYNC_META_STORAGE_KEY, JSON.stringify({
      lastServerSyncAt: '2026-04-07T10:00:00.000Z',
      lastPulledAt: '2026-04-07T11:00:00.000Z',
      lastPushedAt: '2026-04-07T12:00:00.000Z',
    }));
    expect(readAccountSyncMeta()).toEqual({
      lastServerSyncAt: '2026-04-07T10:00:00.000Z',
      lastPulledAt: '2026-04-07T11:00:00.000Z',
      lastPushedAt: '2026-04-07T12:00:00.000Z',
    });

    localStorage.setItem(ACCOUNT_SYNC_META_STORAGE_KEY, '{bad json');
    expect(readAccountSyncMeta()).toEqual({
      lastServerSyncAt: null,
      lastPulledAt: null,
      lastPushedAt: null,
    });
  });

  it('writes merged sync meta and notifies listeners', () => {
    localStorage.setItem(ACCOUNT_SYNC_META_STORAGE_KEY, JSON.stringify({
      lastServerSyncAt: '2026-04-07T10:00:00.000Z',
      lastPulledAt: null,
      lastPushedAt: null,
    }));

    expect(writeAccountSyncMeta({ lastPushedAt: '2026-04-07T12:00:00.000Z' })).toEqual({
      lastServerSyncAt: '2026-04-07T10:00:00.000Z',
      lastPulledAt: null,
      lastPushedAt: '2026-04-07T12:00:00.000Z',
    });
    expect(notifyStoredValueChangedMock).toHaveBeenCalledWith(ACCOUNT_SYNC_META_STORAGE_KEY);
  });

  it('applies pulled progress when today challenge and mission claims match the current day', () => {
    applyPulledAccountProgress({
      score: { seeds: 20 },
      unlockedThemes: ['Robin'],
      dailyChallengeHistory: [{ date: '2026-04-06', correctAnswers: 4, roundsPlayed: 5, completed: true }],
      dailyMissionHistory: [{ date: '2026-04-06' }],
      milestones: [10],
      journalEntries: [{ birdKey: 'bird-a' }],
      lastLocalSyncAt: '2026-04-07T10:00:00.000Z',
      todayDailyChallenge: {
        date: '2026-04-07',
        roundsPlayed: 5,
        correctAnswers: 5,
        bonusSeedsAwarded: 25,
        claimed: true,
      },
      todayMissionClaims: {
        date: '2026-04-07',
        claimedMissionIds: ['m1'],
        bonusClaimed: false,
      },
    } as never);

    expect(writeBirdScoreMock).toHaveBeenCalledWith({ seeds: 20, merged: true });
    expect(setUnlockedThemeNamesMock).toHaveBeenCalledWith(['Finch', 'Robin']);
    expect(writeDailyChallengeHistoryMock).toHaveBeenCalled();
    expect(writeDailyMissionHistoryMock).toHaveBeenCalled();
    expect(mergeBirdJournalStoresMock).toHaveBeenCalledWith({ local: true }, { 'bird-a': { birdKey: 'bird-a' } });
    expect(writeBirdJournalMock).toHaveBeenCalledWith({ merged: true });
    expect(writeDailyChallengeStateMock).toHaveBeenCalledWith({
      date: '2026-04-07',
      roundsPlayed: 5,
      correctAnswers: 5,
      completed: true,
      completionBonusAwarded: true,
      perfectBonusAwarded: true,
      bonusSeedsAwarded: 25,
      roundResults: [],
    });
    expect(writeSessionMissionsMock).toHaveBeenCalledWith({
      date: '2026-04-07',
      missions: [
        { missionId: 'm1', progress: 2, completed: true, claimed: true },
        { missionId: 'm2', progress: 1, completed: false, claimed: false },
      ],
      bonusClaimed: false,
    });
    expect(notifyStoredValueChangedMock).toHaveBeenCalledWith('birdScore');
    expect(notifyStoredValueChangedMock).toHaveBeenCalledWith('birdJournal');
    expect(notifyStoredValueChangedMock).toHaveBeenCalledWith('unlockedThemes');
    expect(notifyStoredValueChangedMock).toHaveBeenCalledWith('dailyChallengeHistory');
    expect(notifyStoredValueChangedMock).toHaveBeenCalledWith('dailyMissionHistory');
    const meta = JSON.parse(localStorage.getItem(ACCOUNT_SYNC_META_STORAGE_KEY) ?? '{}');
    expect(meta.lastServerSyncAt).toBe('2026-04-07T10:00:00.000Z');
    expect(typeof meta.lastPulledAt).toBe('string');
  });

  it('resets today state when the pulled progress does not match today and marks all missions when the bonus was claimed', () => {
    readDailyMissionHistoryMock.mockReturnValue([{ date: '2026-04-07' }]);

    applyPulledAccountProgress({
      score: { seeds: 20 },
      unlockedThemes: ['Robin'],
      dailyChallengeHistory: [],
      dailyMissionHistory: [{ date: '2026-04-07' }],
      milestones: [],
      journalEntries: [],
      lastLocalSyncAt: null,
      todayDailyChallenge: {
        date: '2026-04-06',
        roundsPlayed: 5,
        correctAnswers: 4,
        bonusSeedsAwarded: 25,
        claimed: false,
      },
      todayMissionClaims: {
        date: '2026-04-07',
        claimedMissionIds: [],
        bonusClaimed: true,
      },
    } as never);

    expect(resetDailyChallengeStateMock).toHaveBeenCalledWith('2026-04-07');
    expect(writeSessionMissionsMock).toHaveBeenCalledWith({
      date: '2026-04-07',
      missions: [
        { missionId: 'm1', progress: 2, completed: true, claimed: true },
        { missionId: 'm2', progress: 3, completed: true, claimed: true },
      ],
      bonusClaimed: true,
    });
    expect(resetSessionMissionsMock).not.toHaveBeenCalled();
  });

  it('resets session missions when there is no matching mission-claim payload for today', () => {
    applyPulledAccountProgress({
      score: { seeds: 20 },
      unlockedThemes: [],
      dailyChallengeHistory: [],
      dailyMissionHistory: [],
      milestones: [],
      journalEntries: [],
      lastLocalSyncAt: null,
      todayDailyChallenge: null,
      todayMissionClaims: null,
    } as never);

    expect(resetDailyChallengeStateMock).toHaveBeenCalledWith('2026-04-07');
    expect(resetSessionMissionsMock).toHaveBeenCalledWith('2026-04-07');
  });
});
