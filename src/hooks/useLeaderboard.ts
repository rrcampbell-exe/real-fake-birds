'use client';

import { useCallback, useEffect, useState } from 'react';
import { fetchWeeklyLeaderboard, type GetLeaderboardResponse } from '@/lib/auth/account-sync';

export function useLeaderboard() {
  const [data, setData] = useState<GetLeaderboardResponse['leaderboard'] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetchWeeklyLeaderboard();
      setData(response.leaderboard);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to load the leaderboard.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return {
    leaderboard: data,
    isLoading,
    error,
    reload: load,
  };
}
