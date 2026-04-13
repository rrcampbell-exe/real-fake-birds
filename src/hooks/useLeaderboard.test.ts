import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/auth/account-sync', () => ({
  fetchWeeklyLeaderboard: vi.fn(),
}));

import { fetchWeeklyLeaderboard } from '@/lib/auth/account-sync';
import type { GetLeaderboardResponse } from '@/lib/auth/account-sync';
import { useLeaderboard } from './useLeaderboard';

describe('useLeaderboard', () => {
  beforeEach(() => {
    vi.mocked(fetchWeeklyLeaderboard).mockReset();
  });

  it('loads leaderboard data on mount and exposes reload', async () => {
    const leaderboard: GetLeaderboardResponse['leaderboard'] = {
      weekStart: '2026-04-06',
      endsAt: '2026-04-13T05:00:00.000Z',
      challenge: {
        id: 'seed-collector',
        name: 'Seed Collector',
        description: 'Gather more seeds this week than anyone else.',
        icon: 'sprout',
        primaryLabel: 'Seeds earned',
        tiebreakerLabel: 'Accuracy',
        metric: 'weeklySeedsEarned',
        tiebreakerMetric: 'accuracy',
      },
      entries: [],
      currentUserEntry: null,
    };

    vi.mocked(fetchWeeklyLeaderboard).mockResolvedValue({ action: 'get-leaderboard', leaderboard });

    const { result } = renderHook(() => useLeaderboard());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.leaderboard).toEqual(leaderboard);
    expect(result.current.error).toBeNull();

    await result.current.reload();
    expect(fetchWeeklyLeaderboard).toHaveBeenCalledTimes(2);
  });

  it('surfaces Error messages from failed loads', async () => {
    vi.mocked(fetchWeeklyLeaderboard).mockRejectedValue(new Error('Network down'));

    const { result } = renderHook(() => useLeaderboard());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBe('Network down');
    expect(result.current.leaderboard).toBeNull();
  });

  it('falls back to the default error message for non-Error failures', async () => {
    vi.mocked(fetchWeeklyLeaderboard).mockRejectedValue('boom');

    const { result } = renderHook(() => useLeaderboard());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBe('Unable to load the leaderboard.');
  });
});
