import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./useStoredValue', () => ({
  useStoredJson: vi.fn(),
}));

vi.mock('@/lib/utils/fetch-data', () => ({
  default: vi.fn(),
}));

vi.mock('@/lib/utils/fetch-hint', () => ({
  default: vi.fn(),
}));

vi.mock('@/lib/utils/response-eval', () => ({
  default: vi.fn(),
}));

vi.mock('@/lib/utils/seed-spend', () => ({
  refundSeeds: vi.fn(),
  spendSeeds: vi.fn(),
}));

import fetchData from '@/lib/utils/fetch-data';
import fetchHint from '@/lib/utils/fetch-hint';
import responseEval from '@/lib/utils/response-eval';
import { refundSeeds, spendSeeds } from '@/lib/utils/seed-spend';
import { FACT_HINT_COST } from '@/lib/constants/hints';
import { useGameState } from './useGameState';
import { useStoredJson } from './useStoredValue';

describe('useGameState', () => {
  beforeEach(() => {
    vi.mocked(useStoredJson).mockReturnValue({
      birdsSeen: 0,
      birdsIdentified: 0,
      currentStreak: 0,
      justAchievedStreak: false,
      bestStreak: 0,
      seeds: 100,
    });

    vi.mocked(fetchData).mockImplementation((setIsReal, setIsLoading, setBirdData, setSciName, setRegionLabel) => {
      setIsReal(true);
      setIsLoading(false);
      setBirdData('Blue Jay');
      setSciName('Cyanocitta cristata');
      setRegionLabel('Algeria');
    });

    vi.mocked(spendSeeds).mockReturnValue(true);
  });

  it('fetches bird data on mount', () => {
    renderHook(() => useGameState());
    expect(fetchData).toHaveBeenCalledTimes(1);
  });

  it('exposes bird context returned by fetchData', () => {
    vi.mocked(fetchData).mockImplementation(
      (setIsReal, setIsLoading, setBirdData, setSciName, setRegionLabel, setFact) => {
        setIsReal(false);
        setIsLoading(false);
        setBirdData('Crimson Cape Warbler');
        setSciName(null);
        setRegionLabel(null);
        setFact(null);
      }
    );

    const { result } = renderHook(() => useGameState());

    expect(result.current.fact).toBeNull();
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

  it('requests a hint and stores the result', async () => {
    vi.mocked(fetchHint).mockResolvedValue({
      type: 'fact',
      content: 'A hint fact.',
    });

    const { result } = renderHook(() => useGameState());

    await act(async () => {
      await result.current.requestHint('fact');
    });

    expect(spendSeeds).toHaveBeenCalledWith(FACT_HINT_COST);
    expect(fetchHint).toHaveBeenCalledWith(
      'Blue Jay',
      true,
      'fact',
      'Cyanocitta cristata',
      'Algeria',
      undefined
    );
    expect(result.current.hints.fact).toEqual({
      type: 'fact',
      content: 'A hint fact.',
    });
  });

  it('refunds seeds when a hint request fails', async () => {
    vi.mocked(fetchHint).mockRejectedValue(new Error('hint_unavailable'));

    const { result } = renderHook(() => useGameState());

    await act(async () => {
      await result.current.requestHint('image');
    });

    expect(spendSeeds).toHaveBeenCalledWith(50);
    expect(refundSeeds).toHaveBeenCalledWith(50);
    expect(result.current.hintError).toBe('Request failed. Your seeds were refunded.');
    expect(result.current.hintErrorType).toBe('image');
  });

  it('passes the purchased fact into later image requests', async () => {
    vi.mocked(fetchHint)
      .mockResolvedValueOnce({
        type: 'fact',
        content: 'Its chest is striped amber and its tail feathers flare like coals.',
      })
      .mockResolvedValueOnce({
        type: 'image',
        content: 'https://images.example.com/fake-bird.png',
      });

    const { result } = renderHook(() => useGameState());

    await act(async () => {
      await result.current.requestHint('fact');
    });

    await act(async () => {
      await result.current.requestHint('image');
    });

    expect(fetchHint).toHaveBeenNthCalledWith(
      1,
      'Blue Jay',
      true,
      'fact',
      'Cyanocitta cristata',
      'Algeria',
      undefined
    );
    expect(fetchHint).toHaveBeenNthCalledWith(
      2,
      'Blue Jay',
      true,
      'image',
      'Cyanocitta cristata',
      'Algeria',
      'Its chest is striped amber and its tail feathers flare like coals.'
    );
  });

  it('resets transient state and re-fetches on tryAgain', () => {
    localStorage.setItem('birdData', JSON.stringify({ birdName: 'Test Bird' }));
    localStorage.setItem(
      'currentHints',
      JSON.stringify({ fact: { type: 'fact', content: 'Old hint.' }, image: null })
    );
    const { result } = renderHook(() => useGameState());

    act(() => {
      result.current.tryAgain();
    });

    expect(localStorage.getItem('birdStreakAchieved')).toBe('false');
    expect(localStorage.getItem('birdMilestoneAchieved')).toBe('false');
    expect(localStorage.getItem('birdData')).toBeNull();
    expect(localStorage.getItem('currentHints')).toBeNull();
    expect(fetchData).toHaveBeenCalledTimes(2);
  });
});