import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { deriveBirdKeyMock, recordBirdEncounterMock, writeCurrentRoundJournalBirdKeyMock, writeCurrentRoundJournalRevealKeyMock } = vi.hoisted(() => ({
  deriveBirdKeyMock: vi.fn(),
  recordBirdEncounterMock: vi.fn(),
  writeCurrentRoundJournalBirdKeyMock: vi.fn(),
  writeCurrentRoundJournalRevealKeyMock: vi.fn(),
}));

vi.mock('./useStoredValue', () => ({
  useStoredJson: vi.fn(),
}));

vi.mock('@/lib/utils/bird-journal', () => ({
  BIRD_JOURNAL_STORAGE_KEY: 'birdJournal',
  CURRENT_ROUND_JOURNAL_REVEAL_KEY: 'currentRoundJournalRevealKey',
  deriveBirdKey: deriveBirdKeyMock,
  normalizeBirdJournalStore: (value: unknown) => value,
  recordBirdEncounter: recordBirdEncounterMock,
  writeCurrentRoundJournalBirdKey: writeCurrentRoundJournalBirdKeyMock,
  writeCurrentRoundJournalRevealKey: writeCurrentRoundJournalRevealKeyMock,
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

vi.mock('@/lib/supabase/env', () => ({
  hasSupabaseEnv: vi.fn(() => false),
}));

vi.mock('@/lib/supabase/client', () => ({
  getSupabaseBrowserClient: vi.fn(),
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
    deriveBirdKeyMock.mockReset();
    deriveBirdKeyMock.mockReturnValue('real:blue-jay');
    recordBirdEncounterMock.mockReset();
    writeCurrentRoundJournalBirdKeyMock.mockReset();
    writeCurrentRoundJournalRevealKeyMock.mockReset();
    recordBirdEncounterMock.mockReturnValue({
      birdKey: 'real:blue-jay',
      birdName: 'Blue Jay',
      isReal: true,
      seenCount: 1,
      correctCount: 1,
      incorrectCount: 0,
      lastSeenAt: '2026-04-05T12:00:00.000Z',
      metadata: {
        regionLabel: 'Algeria',
        sciName: 'Cyanocitta cristata',
        classificationRevealed: false,
      },
    });

    vi.mocked(responseEval).mockReturnValue({
      isCorrect: true,
      isReal: true,
      chosenResponse: 'real',
      roundSeedsEarned: 1,
      seedsEarned: 1,
      currentStreak: 1,
      bestStreak: 1,
      birdsSeen: 1,
      birdsIdentified: 1,
      usedHintTypes: [],
      streakProtected: false,
      earnedBadgeName: null,
      unlockedThemeName: null,
      previousBestStreak: 0,
      justBrokeBestStreak: false,
      justLostBestStreak: false,
      personalBestRewardSeeds: 0,
      missionRewards: [],
      missionSetBonusSeedsEarned: 0,
      completedDailyMissionSet: false,
      dailyMissionStreak: null,
    });

    vi.mocked(useStoredJson).mockImplementation((key: string) => {
      if (key === 'birdJournal') {
        return {};
      }

      if (key === 'currentRoundJournalRevealKey') {
        return null;
      }

      return {
        birdsSeen: 0,
        birdsIdentified: 0,
        currentStreak: 0,
        justAchievedStreak: false,
        bestStreak: 0,
        currentDailyStreak: 0,
        bestDailyStreak: 0,
        seeds: 100,
      };
    });

    vi.mocked(fetchData).mockImplementation(async (setIsReal, setIsLoading, setBirdData, setSciName, setRegionLabel) => {
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
      async (setIsReal, setIsLoading, setBirdData, setSciName, setRegionLabel, setFact) => {
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
    expect(recordBirdEncounterMock).toHaveBeenCalledWith({
      birdName: 'Blue Jay',
      isReal: true,
      outcome: 'correct',
      metadata: {
        regionLabel: 'Algeria',
        sciName: 'Cyanocitta cristata',
        fact: undefined,
      },
    });
    expect(result.current.hasAnswered).toBe(true);
    expect(result.current.isNewBirdEncounter).toBe(true);
    expect(writeCurrentRoundJournalBirdKeyMock).not.toHaveBeenCalledWith(null);
    expect(writeCurrentRoundJournalRevealKeyMock).not.toHaveBeenCalledWith(null);
  });

  it('offers skip for unseen birds without recording progress before fetching a replacement', () => {
    const { result } = renderHook(() => useGameState());

    expect(result.current.specialHintAction?.type).toBe('skip');

    act(() => {
      result.current.specialHintAction?.onRequest();
    });

    expect(spendSeeds).toHaveBeenCalledWith(18);
    expect(recordBirdEncounterMock).not.toHaveBeenCalled();
    expect(fetchData).toHaveBeenCalledTimes(2);
  });

  it('offers reveal for concealed seen birds and shows the reveal preview after purchase', () => {
    vi.mocked(useStoredJson).mockImplementation((key: string) => {
      if (key === 'birdJournal') {
        return {
          'real:blue-jay': {
            birdKey: 'real:blue-jay',
            birdName: 'Blue Jay',
            isReal: true,
            seenCount: 2,
            correctCount: 1,
            incorrectCount: 1,
            lastSeenAt: '2026-04-05T12:00:00.000Z',
            metadata: {
              classificationRevealed: false,
            },
          },
        };
      }

      if (key === 'currentRoundJournalRevealKey') {
        return null;
      }

      return {
        birdsSeen: 0,
        birdsIdentified: 0,
        currentStreak: 0,
        justAchievedStreak: false,
        bestStreak: 0,
        currentDailyStreak: 0,
        bestDailyStreak: 0,
        seeds: 100,
      };
    });

    const { result } = renderHook(() => useGameState());

    expect(result.current.specialHintAction?.type).toBe('reveal');

    act(() => {
      result.current.specialHintAction?.onRequest();
    });

    expect(spendSeeds).toHaveBeenCalledWith(32);
    expect(writeCurrentRoundJournalRevealKeyMock).toHaveBeenCalledWith('real:blue-jay');
    expect(result.current.specialHintAction?.title).toBe('Reveal This Bird');
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
    localStorage.setItem('birdData', JSON.stringify({ birdName: 'Legacy Bird' }));
    localStorage.setItem('birdData:classic', JSON.stringify({ birdName: 'Test Bird' }));
    localStorage.setItem(
      'currentHints:classic',
      JSON.stringify({ fact: { type: 'fact', content: 'Old hint.' }, image: null })
    );
    const { result } = renderHook(() => useGameState());

    act(() => {
      result.current.tryAgain();
    });

    expect(localStorage.getItem('birdStreakAchieved')).toBe('false');
    expect(localStorage.getItem('birdMilestoneAchieved')).toBe('false');
    expect(localStorage.getItem('birdData')).toBeNull();
    expect(localStorage.getItem('birdData:classic')).toBeNull();
    expect(localStorage.getItem('currentHints:classic')).toBeNull();
    expect(writeCurrentRoundJournalBirdKeyMock).toHaveBeenCalledWith(null);
    expect(writeCurrentRoundJournalRevealKeyMock).toHaveBeenCalledWith(null);
    expect(fetchData).toHaveBeenCalledTimes(2);
  });
});