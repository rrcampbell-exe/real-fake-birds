import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/components/account/AccountStateProvider', () => ({
  useAccountState: vi.fn(() => ({
    isSignedIn: false,
  })),
}));

import { useSessionMissions } from './useSessionMissions';
import { readSessionMissions, writeSessionMissions } from '@/lib/utils/missions';

describe('useSessionMissions midnight rollover', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 3, 6, 23, 59, 50));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('resets mission state to a fresh local day after midnight', async () => {
    const previousState = readSessionMissions('2026-04-06');
    writeSessionMissions({
      ...previousState,
      date: '2026-04-06',
      missions: previousState.missions.map((mission) => ({
        ...mission,
        progress: 999,
        completed: true,
        claimed: true,
      })),
      bonusClaimed: true,
    });

    const { result } = renderHook(() => useSessionMissions());

    expect(result.current.state.date).toBe('2026-04-06');
    expect(result.current.allCompleted).toBe(true);

    await act(async () => {
      vi.advanceTimersByTime(15_000);
    });

    expect(result.current.state.date).toBe('2026-04-07');
    expect(result.current.allCompleted).toBe(false);
    expect(result.current.bonusClaimed).toBe(false);
  });
});
