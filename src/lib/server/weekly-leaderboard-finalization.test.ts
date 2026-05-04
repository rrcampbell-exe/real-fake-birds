import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  getCurrentWeekStartMock,
  getWeeklyChallengeForWeekMock,
  getWeeklyRewardSeedsMock,
  normalizeWeeklySeenBirdKeysMock,
  qualifiesForWeeklyChallengeMock,
  rankWeeklyLeaderboardRowsMock,
} = vi.hoisted(() => ({
  getCurrentWeekStartMock: vi.fn(),
  getWeeklyChallengeForWeekMock: vi.fn(),
  getWeeklyRewardSeedsMock: vi.fn(),
  normalizeWeeklySeenBirdKeysMock: vi.fn(),
  qualifiesForWeeklyChallengeMock: vi.fn(),
  rankWeeklyLeaderboardRowsMock: vi.fn(),
}));

vi.mock('@/lib/utils/weekly-leaderboard', () => ({
  getCurrentWeekStart: getCurrentWeekStartMock,
}));

vi.mock('@/lib/constants/weekly-challenges', () => ({
  getWeeklyChallengeForWeek: getWeeklyChallengeForWeekMock,
}));

vi.mock('@/lib/server/weekly-leaderboard', () => ({
  getWeeklyRewardSeeds: getWeeklyRewardSeedsMock,
  normalizeWeeklySeenBirdKeys: normalizeWeeklySeenBirdKeysMock,
  qualifiesForWeeklyChallenge: qualifiesForWeeklyChallengeMock,
  rankWeeklyLeaderboardRows: rankWeeklyLeaderboardRowsMock,
}));

import {
  createWeeklyResetState,
  finalizeExpiredWeeklyLeaderboards,
  mapLeaderboardStatsRow,
} from './weekly-leaderboard-finalization';

type QueryResult = { data?: unknown; error?: { message?: string; code?: string } | null; count?: number | null };

function createMockAdmin(options?: {
  staleRowsResult?: QueryResult;
  progressRowsResult?: QueryResult;
  progressEventInsertResults?: QueryResult[];
  progressUpdateResults?: QueryResult[];
  leaderboardUpdateResults?: QueryResult[];
}) {
  const staleRowsResult = options?.staleRowsResult ?? { data: [], error: null };
  const progressRowsResult = options?.progressRowsResult ?? { data: [], error: null };
  const progressEventInsertResults = options?.progressEventInsertResults ?? [{ error: null }];
  const progressUpdateResults = options?.progressUpdateResults ?? [{ error: null }];
  const leaderboardUpdateResults = options?.leaderboardUpdateResults ?? [{ count: 1, error: null }];

  let insertIndex = 0;
  let progressUpdateIndex = 0;
  let leaderboardUpdateIndex = 0;

  const staleLtMock = vi.fn().mockResolvedValue(staleRowsResult);
  const staleNotMock = vi.fn(() => ({ lt: staleLtMock }));
  const staleSelectMock = vi.fn(() => ({ not: staleNotMock }));

  const progressInMock = vi.fn().mockResolvedValue(progressRowsResult);
  const progressSelectMock = vi.fn(() => ({ in: progressInMock }));

  const progressUpdateEqMock = vi.fn().mockImplementation(() => {
    const result = progressUpdateResults[Math.min(progressUpdateIndex, progressUpdateResults.length - 1)];
    progressUpdateIndex += 1;
    return Promise.resolve(result);
  });
  const progressUpdateMock = vi.fn(() => ({ eq: progressUpdateEqMock }));

  const progressEventInsertMock = vi.fn().mockImplementation(() => {
    const result = progressEventInsertResults[Math.min(insertIndex, progressEventInsertResults.length - 1)];
    insertIndex += 1;
    return Promise.resolve(result);
  });

  const leaderboardUpdateLtMock = vi.fn().mockImplementation(() => {
    const result = leaderboardUpdateResults[Math.min(leaderboardUpdateIndex, leaderboardUpdateResults.length - 1)];
    leaderboardUpdateIndex += 1;
    return Promise.resolve(result);
  });
  const leaderboardUpdateEqMock = vi.fn(() => ({ lt: leaderboardUpdateLtMock }));
  const leaderboardUpdateMock = vi.fn(() => ({ eq: leaderboardUpdateEqMock }));

  const fromMock = vi.fn((table: string) => {
    if (table === 'leaderboard_stats') {
      return {
        select: staleSelectMock,
        update: leaderboardUpdateMock,
      };
    }

    if (table === 'player_progress') {
      return {
        select: progressSelectMock,
        update: progressUpdateMock,
      };
    }

    if (table === 'progress_event_log') {
      return {
        insert: progressEventInsertMock,
      };
    }

    throw new Error(`Unexpected table ${table}`);
  });

  return {
    admin: { from: fromMock },
    mocks: {
      fromMock,
      staleSelectMock,
      staleNotMock,
      staleLtMock,
      progressSelectMock,
      progressInMock,
      progressEventInsertMock,
      progressUpdateMock,
      progressUpdateEqMock,
      leaderboardUpdateMock,
      leaderboardUpdateEqMock,
      leaderboardUpdateLtMock,
    },
  };
}

describe('weekly-leaderboard-finalization', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    getCurrentWeekStartMock.mockReturnValue('2026-05-04');
    getWeeklyChallengeForWeekMock.mockReturnValue({ id: 'fake-spotter' });
    normalizeWeeklySeenBirdKeysMock.mockImplementation((value: unknown) => {
      if (!Array.isArray(value)) {
        return [];
      }
      return Array.from(new Set(value.filter((item): item is string => typeof item === 'string').sort()));
    });
    qualifiesForWeeklyChallengeMock.mockReturnValue(true);
    rankWeeklyLeaderboardRowsMock.mockReturnValue({
      rankedRows: [],
      entries: [],
      currentUserEntry: null,
    });
    getWeeklyRewardSeedsMock.mockImplementation((rank: number | null) => {
      if (rank === 1) {
        return 500;
      }
      if (rank === 2) {
        return 350;
      }
      return 0;
    });

    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  it('returns early when stale leaderboard query fails', async () => {
    const { admin } = createMockAdmin({
      staleRowsResult: {
        data: null,
        error: { message: 'db unavailable', code: 'PGRST' },
      },
    });

    const result = await finalizeExpiredWeeklyLeaderboards(admin as never);

    expect(result).toEqual({
      currentWeekStart: '2026-05-04',
      staleRowCount: 0,
      weeksProcessed: [],
    });
    expect(console.error).toHaveBeenCalledWith(
      '[weekly-leaderboard] failed to query stale leaderboard rows',
      expect.objectContaining({ error: 'db unavailable', code: 'PGRST' })
    );
  });

  it('returns early when no stale rows exist', async () => {
    const { admin, mocks } = createMockAdmin();

    const result = await finalizeExpiredWeeklyLeaderboards(admin as never);

    expect(result).toEqual({
      currentWeekStart: '2026-05-04',
      staleRowCount: 0,
      weeksProcessed: [],
    });
    expect(mocks.progressSelectMock).not.toHaveBeenCalled();
    expect(mocks.leaderboardUpdateMock).not.toHaveBeenCalled();
  });

  it('finalizes stale rows, credits rewards, and updates progress stats', async () => {
    const staleRows = [
      {
        user_id: 'user-1',
        username_canonical: 'alpha',
        current_week_start: '2026-04-27',
        weekly_birds_seen: 25,
        weekly_birds_identified: 21,
        weekly_seen_bird_keys: ['hawk', 'hawk', 'owl'],
      },
      {
        user_id: 'user-2',
        username_canonical: 'bravo',
        current_week_start: '2026-04-27',
        weekly_birds_seen: 0,
        weekly_birds_identified: 0,
        weekly_seen_bird_keys: [],
      },
    ];

    rankWeeklyLeaderboardRowsMock.mockReturnValue({
      rankedRows: [
        { userId: 'user-1', entry: { rank: 1 } },
      ],
      entries: [],
      currentUserEntry: null,
    });
    qualifiesForWeeklyChallengeMock.mockImplementation((row: { userId: string }) => row.userId === 'user-1');

    const { admin, mocks } = createMockAdmin({
      staleRowsResult: { data: staleRows, error: null },
      progressRowsResult: {
        data: [
          {
            user_id: 'user-1',
            seeds: 100,
            best_weekly_placement: 2,
            first_place_count: 3,
            second_place_count: 1,
            third_place_count: 0,
          },
        ],
        error: null,
      },
      progressEventInsertResults: [{ error: null }],
      leaderboardUpdateResults: [{ count: 1, error: null }, { count: 1, error: null }],
    });

    const result = await finalizeExpiredWeeklyLeaderboards(admin as never);

    expect(result).toEqual({
      currentWeekStart: '2026-05-04',
      staleRowCount: 2,
      weeksProcessed: ['2026-04-27'],
    });

    expect(mocks.progressEventInsertMock).toHaveBeenCalledTimes(1);
    expect(mocks.progressUpdateMock).toHaveBeenCalledTimes(1);
    expect(mocks.progressUpdateMock).toHaveBeenCalledWith(expect.objectContaining({
      seeds: 600,
      best_weekly_placement: 1,
      first_place_count: 4,
      second_place_count: 1,
      third_place_count: 0,
    }));
    expect(mocks.leaderboardUpdateMock).toHaveBeenCalledTimes(2);
  });

  it('logs when progress lookup fails and reward event insert is rejected', async () => {
    const staleRows = [
      {
        user_id: 'user-7',
        username_canonical: 'charlie',
        current_week_start: '2026-04-27',
        weekly_birds_seen: 14,
        weekly_birds_identified: 9,
        weekly_seen_bird_keys: ['sparrow'],
      },
    ];

    rankWeeklyLeaderboardRowsMock.mockReturnValue({
      rankedRows: [{ userId: 'user-7', entry: { rank: 2 } }],
      entries: [],
      currentUserEntry: null,
    });
    qualifiesForWeeklyChallengeMock.mockReturnValue(true);

    const { admin, mocks } = createMockAdmin({
      staleRowsResult: { data: staleRows, error: null },
      progressRowsResult: { data: null, error: { message: 'progress read failed', code: '42501' } },
      progressEventInsertResults: [{ error: { message: 'duplicate' } }],
      leaderboardUpdateResults: [{ count: 0, error: null }],
    });

    const result = await finalizeExpiredWeeklyLeaderboards(admin as never);

    expect(result.staleRowCount).toBe(1);
    expect(mocks.progressUpdateMock).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledWith(
      '[weekly-leaderboard] failed to query player_progress for reward credits',
      expect.objectContaining({ error: 'progress read failed', code: '42501' })
    );
    expect(console.warn).toHaveBeenCalledWith(
      '[weekly-leaderboard] finalization update matched 0 rows',
      expect.objectContaining({ userId: 'user-7' })
    );
  });

  it('logs errors when reward credit or row finalization update fails', async () => {
    const staleRows = [
      {
        user_id: 'user-9',
        username_canonical: 'delta',
        current_week_start: '2026-04-27',
        weekly_birds_seen: 18,
        weekly_birds_identified: 14,
        weekly_seen_bird_keys: ['heron'],
      },
    ];

    rankWeeklyLeaderboardRowsMock.mockReturnValue({
      rankedRows: [{ userId: 'user-9', entry: { rank: 1 } }],
      entries: [],
      currentUserEntry: null,
    });
    qualifiesForWeeklyChallengeMock.mockReturnValue(true);

    const { admin } = createMockAdmin({
      staleRowsResult: { data: staleRows, error: null },
      progressRowsResult: {
        data: [{ user_id: 'user-9', seeds: 20, best_weekly_placement: null, first_place_count: 0, second_place_count: 0, third_place_count: 0 }],
        error: null,
      },
      progressEventInsertResults: [{ error: null }],
      progressUpdateResults: [{ error: { message: 'progress update failed', code: 'XX001' } }],
      leaderboardUpdateResults: [{ error: { message: 'leaderboard update failed', code: 'XX002' }, count: null }],
    });

    await finalizeExpiredWeeklyLeaderboards(admin as never);

    expect(console.error).toHaveBeenCalledWith(
      '[weekly-leaderboard] failed to credit reward seeds',
      expect.objectContaining({ userId: 'user-9', error: 'progress update failed', code: 'XX001' })
    );
    expect(console.error).toHaveBeenCalledWith(
      '[weekly-leaderboard] failed to finalize leaderboard row',
      expect.objectContaining({ userId: 'user-9', error: 'leaderboard update failed', code: 'XX002' })
    );
  });

  it('maps rows and builds a reset payload with safe defaults', () => {
    const mapped = mapLeaderboardStatsRow({
      user_id: 'user-3',
      username_canonical: 'echo',
      current_week_start: '2026-04-27',
      weekly_birds_seen: 11,
      weekly_seen_bird_keys: ['b', 'a', 'a'],
      previous_week_participated: 1,
      previous_week_qualified: 0,
      previous_week_rank: 4,
      previous_week_reward_seeds: 100,
      previous_week_finalized_at: '2026-05-04T00:00:00.000Z',
    });

    expect(mapped).toEqual(expect.objectContaining({
      userId: 'user-3',
      usernameCanonical: 'echo',
      currentWeekStart: '2026-04-27',
      weeklyBirdsSeen: 11,
      weeklyBirdsIdentified: 0,
      weeklySeenBirdKeys: ['a', 'b'],
      previousWeekParticipated: true,
      previousWeekQualified: false,
      previousWeekRank: 4,
      previousWeekRewardSeeds: 100,
      previousWeekFinalizedAt: '2026-05-04T00:00:00.000Z',
    }));

    expect(createWeeklyResetState('2026-05-04')).toEqual({
      current_week_start: '2026-05-04',
      weekly_birds_seen: 0,
      weekly_birds_identified: 0,
      weekly_seeds_earned: 0,
      weekly_best_streak: 0,
      weekly_new_birds_discovered: 0,
      weekly_fake_birds_identified: 0,
      weekly_real_birds_identified: 0,
      weekly_unique_birds_seen: 0,
      weekly_seen_bird_keys: [],
      weekly_last_played_at: null,
    });
  });
});
