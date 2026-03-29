import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/utils/fetch-data', () => ({
  default: vi.fn(),
}));

vi.mock('@/lib/utils/response-eval', () => ({
  default: vi.fn(),
}));

import fetchData from '@/lib/utils/fetch-data';
import responseEval from '@/lib/utils/response-eval';
import { useGameState } from './useGameState';

describe('useGameState', () => {
  it('fetches bird data on mount', () => {
    renderHook(() => useGameState());
    expect(fetchData).toHaveBeenCalledTimes(1);
  });

  it('passes answers to responseEval and flips hasAnswered', () => {
    const { result } = renderHook(() => useGameState());
    const event = {
      preventDefault: vi.fn(),
      currentTarget: { id: 'real' },
    } as unknown as React.MouseEvent<HTMLButtonElement>;

    act(() => {
      result.current.handleAnswer(event);
    });

    expect(responseEval).toHaveBeenCalled();
    expect(result.current.hasAnswered).toBe(true);
  });

  it('resets transient state and re-fetches on tryAgain', () => {
    localStorage.setItem('birdData', JSON.stringify({ birdName: 'Test Bird' }));
    const { result } = renderHook(() => useGameState());

    act(() => {
      result.current.tryAgain();
    });

    expect(localStorage.getItem('birdStreakAchieved')).toBe('false');
    expect(localStorage.getItem('birdMilestoneAchieved')).toBe('false');
    expect(localStorage.getItem('birdData')).toBeNull();
    expect(fetchData).toHaveBeenCalledTimes(2);
  });
});