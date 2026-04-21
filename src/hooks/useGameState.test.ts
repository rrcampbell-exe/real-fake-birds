import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { deriveBirdKeyMock, isBirdImageRevealedMock, recordBirdEncounterMock, revealBirdImageMock, writeCurrentRoundJournalBirdKeyMock } = vi.hoisted(() => ({
  deriveBirdKeyMock: vi.fn(),
  isBirdImageRevealedMock: vi.fn(),
  recordBirdEncounterMock: vi.fn(),
  revealBirdImageMock: vi.fn(),
  writeCurrentRoundJournalBirdKeyMock: vi.fn(),
}));

vi.mock('./useStoredValue', () => ({
  useStoredJson: vi.fn(),
}));

vi.mock('@/lib/utils/bird-journal', () => ({
  BIRD_JOURNAL_STORAGE_KEY: 'birdJournal',
  deriveBirdKey: deriveBirdKeyMock,
  isBirdImageRevealed: isBirdImageRevealedMock,
  normalizeBirdJournalStore: (value: unknown) => value,
  recordBirdEncounter: recordBirdEncounterMock,
  revealBirdImage: revealBirdImageMock,
  writeCurrentRoundJournalBirdKey: writeCurrentRoundJournalBirdKeyMock,
}));

vi.mock('@/lib/utils/fetch-data', () => ({
  default: vi.fn(),
}));

vi.mock('@/lib/utils/fetch-hint', () => ({
  default: vi.fn(),
}));

vi.mock('@/lib/utils/image-availability', () => ({
  canLoadImage: vi.fn(),
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
import { canLoadImage } from '@/lib/utils/image-availability';
import responseEval from '@/lib/utils/response-eval';
import { refundSeeds, spendSeeds } from '@/lib/utils/seed-spend';
import { FACT_HINT_COST } from '@/lib/constants/hints';
import { useGameState } from './useGameState';
import { useStoredJson } from './useStoredValue';

describe('useGameState', () => {
  beforeEach(() => {
    deriveBirdKeyMock.mockReset();
    deriveBirdKeyMock.mockReturnValue('real:blue-jay');
    isBirdImageRevealedMock.mockReset();
    isBirdImageRevealedMock.mockImplementation((entry) => Boolean(entry?.metadata?.imageRevealed));
    recordBirdEncounterMock.mockReset();
    revealBirdImageMock.mockReset();
    writeCurrentRoundJournalBirdKeyMock.mockReset();
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

    vi.mocked(canLoadImage).mockResolvedValue(true);
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
    expect(recordBirdEncounterMock).toHaveBeenCalledWith(expect.objectContaining({
      birdName: 'Blue Jay',
      isReal: true,
      outcome: 'correct',
      metadata: expect.objectContaining({
        regionLabel: 'Algeria',
        sciName: 'Cyanocitta cristata',
        fact: undefined,
        imageRevealed: false,
      }),
    }));
    expect(result.current.hasAnswered).toBe(true);
    expect(result.current.isNewBirdEncounter).toBe(true);
    expect(writeCurrentRoundJournalBirdKeyMock).not.toHaveBeenCalledWith(null);
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

  it('persists image hints as permanent journal image reveals after answering', async () => {
    vi.mocked(fetchData).mockImplementation(
      async (
        setIsReal,
        setIsLoading,
        setBirdData,
        setSciName,
        setRegionLabel,
        setFact,
        setSummary,
        setArticleUrl,
        setImageUrl,
      ) => {
        setIsReal(false);
        setIsLoading(false);
        setBirdData('Blue Jay');
        setSciName('Cyanocitta cristata');
        setRegionLabel('Algeria');
        setFact('A suspiciously convincing fake bird.');
        setSummary('A fake bird with an image hint.');
        setArticleUrl(null);
        setImageUrl('https://images.example.com/fake-blue-jay.jpg');
      }
    );
    vi.mocked(fetchHint).mockResolvedValue({
      type: 'image',
      content: 'https://images.example.com/fake-blue-jay-hint.jpg',
    });

    const { result } = renderHook(() => useGameState());

    await act(async () => {
      await result.current.requestHint('image');
    });

    const event = {
      preventDefault: vi.fn(),
      currentTarget: { id: 'fake' },
    } as unknown as React.MouseEvent<HTMLButtonElement>;

    act(() => {
      result.current.handleAnswer(event);
    });

    expect(recordBirdEncounterMock).toHaveBeenCalledWith({
      birdName: 'Blue Jay',
      isReal: false,
      outcome: 'correct',
      metadata: {
        regionLabel: 'Algeria',
        sciName: 'Cyanocitta cristata',
        fact: 'A suspiciously convincing fake bird.',
        summary: 'A fake bird with an image hint.',
        articleUrl: undefined,
        imageUrl: 'https://images.example.com/fake-blue-jay.jpg',
        imageThumbUrl: undefined,
        description: undefined,
        contentSource: undefined,
        attribution: undefined,
        imageRevealed: true,
      },
    });
  });

  it('refunds seeds when a hint request fails', async () => {
    vi.mocked(fetchHint).mockRejectedValue(new Error('hint_unavailable'));

    const { result } = renderHook(() => useGameState());

    await act(async () => {
      await result.current.requestHint('image');
    });

    expect(spendSeeds).toHaveBeenCalledWith(40);
    expect(refundSeeds).toHaveBeenCalledWith(40);
    expect(result.current.hintError).toBe('Request failed. Your seeds were refunded.');
    expect(result.current.hintErrorType).toBe('image');
  });

  it('refunds seeds when a field note request fails', async () => {
    vi.mocked(fetchHint).mockRejectedValue(new Error('hint_unavailable'));

    const { result } = renderHook(() => useGameState());

    await act(async () => {
      await result.current.requestHint('fact');
    });

    expect(spendSeeds).toHaveBeenCalledWith(FACT_HINT_COST);
    expect(refundSeeds).toHaveBeenCalledWith(FACT_HINT_COST);
    expect(result.current.hintError).toBe('Request failed. Your seeds were refunded.');
    expect(result.current.hintErrorType).toBe('fact');
  });

  it('refunds fake image hints when the CDN image cannot be loaded', async () => {
    vi.mocked(fetchData).mockImplementation(
      async (setIsReal, setIsLoading, setBirdData, setSciName, setRegionLabel) => {
        setIsReal(false);
        setIsLoading(false);
        setBirdData('Blue Ember Finch');
        setSciName(null);
        setRegionLabel(null);
      }
    );
    vi.mocked(fetchHint).mockResolvedValue({
      type: 'image',
      content: 'https://cdn.example.com/birds/fake/blue-ember-finch/image.webp',
    });
    vi.mocked(canLoadImage).mockResolvedValue(false);

    const { result } = renderHook(() => useGameState());

    await act(async () => {
      await result.current.requestHint('image');
    });

    expect(refundSeeds).toHaveBeenCalledWith(40);
    expect(result.current.hints.image).toBeNull();
    expect(result.current.hintError).toBe('That photo hint is unavailable. Your seeds were refunded.');
    expect(result.current.hintErrorType).toBe('image');
  });

  it('refunds real image hints when the image cannot be loaded', async () => {
    vi.mocked(fetchHint).mockResolvedValue({
      type: 'image',
      content: 'https://images.example.com/blue-jay.jpg',
    });
    vi.mocked(canLoadImage).mockResolvedValue(false);

    const { result } = renderHook(() => useGameState());

    await act(async () => {
      await result.current.requestHint('image');
    });

    expect(spendSeeds).toHaveBeenCalledWith(40);
    expect(refundSeeds).toHaveBeenCalledWith(40);
    expect(result.current.hints.image).toBeNull();
    expect(result.current.hintError).toBe('That photo hint is unavailable. Your seeds were refunded.');
    expect(result.current.hintErrorType).toBe('image');
  });

  it('does not spend seeds when a fake answer-card image is unavailable', async () => {
    vi.mocked(fetchData).mockImplementation(
      async (
        setIsReal,
        setIsLoading,
        setBirdData,
        setSciName,
        setRegionLabel,
        setFact,
        setSummary,
        setArticleUrl,
        setImageUrl,
      ) => {
        setIsReal(false);
        setIsLoading(false);
        setBirdData('Blue Jay');
        setSciName('Cyanocitta cristata');
        setRegionLabel('Algeria');
        setFact('A suspiciously convincing fake bird.');
        setSummary('A fake bird with a missing reveal image.');
        setArticleUrl(null);
        setImageUrl('https://cdn.example.com/birds/fake/blue-jay/image.webp');
      }
    );
    vi.mocked(canLoadImage).mockResolvedValue(false);

    const { result } = renderHook(() => useGameState());
    const event = {
      preventDefault: vi.fn(),
      currentTarget: { id: 'fake' },
    } as unknown as React.MouseEvent<HTMLButtonElement>;

    act(() => {
      result.current.handleAnswer(event);
    });

    vi.mocked(spendSeeds).mockClear();

    await act(async () => {
      await result.current.revealFakeBirdImage();
    });

    expect(spendSeeds).not.toHaveBeenCalledWith(12);
    expect(result.current.fakeBirdImageRevealed).toBe(false);
    expect(result.current.fakeImageNotice).toBe('That fake photo is unavailable right now, so no seeds were spent.');
  });

  it('treats a previously revealed fake bird as unlocked on later sightings', () => {
    deriveBirdKeyMock.mockReturnValue('fake:blue-jay');
    vi.mocked(useStoredJson).mockImplementation((key: string) => {
      if (key === 'birdJournal') {
        return {
          'fake:blue-jay': {
            birdKey: 'fake:blue-jay',
            birdName: 'Blue Jay',
            isReal: false,
            seenCount: 2,
            correctCount: 1,
            incorrectCount: 1,
            lastSeenAt: '2026-04-21T12:00:00.000Z',
            metadata: {
              imageRevealed: true,
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
    vi.mocked(fetchData).mockImplementation(
      async (
        setIsReal,
        setIsLoading,
        setBirdData,
        setSciName,
        setRegionLabel,
        setFact,
        setSummary,
        setArticleUrl,
        setImageUrl,
      ) => {
        setIsReal(false);
        setIsLoading(false);
        setBirdData('Blue Jay');
        setSciName('Cyanocitta cristata');
        setRegionLabel('Algeria');
        setFact('A suspiciously convincing fake bird.');
        setSummary('A fake bird previously unlocked.');
        setArticleUrl(null);
        setImageUrl('https://images.example.com/fake-blue-jay.jpg');
      }
    );

    const { result } = renderHook(() => useGameState());

    expect(result.current.fakeBirdImageRevealed).toBe(true);
  });

  it('does not spend seeds again for a fake bird already unlocked in the journal', async () => {
    deriveBirdKeyMock.mockReturnValue('fake:blue-jay');
    vi.mocked(useStoredJson).mockImplementation((key: string) => {
      if (key === 'birdJournal') {
        return {
          'fake:blue-jay': {
            birdKey: 'fake:blue-jay',
            birdName: 'Blue Jay',
            isReal: false,
            seenCount: 2,
            correctCount: 1,
            incorrectCount: 1,
            lastSeenAt: '2026-04-21T12:00:00.000Z',
            metadata: {
              imageRevealed: true,
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
    vi.mocked(fetchData).mockImplementation(
      async (
        setIsReal,
        setIsLoading,
        setBirdData,
        setSciName,
        setRegionLabel,
        setFact,
        setSummary,
        setArticleUrl,
        setImageUrl,
      ) => {
        setIsReal(false);
        setIsLoading(false);
        setBirdData('Blue Jay');
        setSciName('Cyanocitta cristata');
        setRegionLabel('Algeria');
        setFact('A suspiciously convincing fake bird.');
        setSummary('A fake bird previously unlocked.');
        setArticleUrl(null);
        setImageUrl('https://images.example.com/fake-blue-jay.jpg');
      }
    );

    const { result } = renderHook(() => useGameState());
    const event = {
      preventDefault: vi.fn(),
      currentTarget: { id: 'fake' },
    } as unknown as React.MouseEvent<HTMLButtonElement>;

    act(() => {
      result.current.handleAnswer(event);
    });

    vi.mocked(spendSeeds).mockClear();

    await act(async () => {
      await result.current.revealFakeBirdImage();
    });

    expect(spendSeeds).not.toHaveBeenCalledWith(12);
    expect(revealBirdImageMock).not.toHaveBeenCalled();
  });

  it('keeps previously revealed fake birds marked as revealed when recording another encounter', () => {
    deriveBirdKeyMock.mockReturnValue('fake:blue-jay');
    vi.mocked(useStoredJson).mockImplementation((key: string) => {
      if (key === 'birdJournal') {
        return {
          'fake:blue-jay': {
            birdKey: 'fake:blue-jay',
            birdName: 'Blue Jay',
            isReal: false,
            seenCount: 2,
            correctCount: 1,
            incorrectCount: 1,
            lastSeenAt: '2026-04-21T12:00:00.000Z',
            metadata: {
              imageRevealed: true,
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
    vi.mocked(fetchData).mockImplementation(
      async (
        setIsReal,
        setIsLoading,
        setBirdData,
        setSciName,
        setRegionLabel,
        setFact,
        setSummary,
        setArticleUrl,
        setImageUrl,
      ) => {
        setIsReal(false);
        setIsLoading(false);
        setBirdData('Blue Jay');
        setSciName('Cyanocitta cristata');
        setRegionLabel('Algeria');
        setFact('A suspiciously convincing fake bird.');
        setSummary('A fake bird previously unlocked.');
        setArticleUrl(null);
        setImageUrl('https://images.example.com/fake-blue-jay.jpg');
      }
    );

    const { result } = renderHook(() => useGameState());
    const event = {
      preventDefault: vi.fn(),
      currentTarget: { id: 'fake' },
    } as unknown as React.MouseEvent<HTMLButtonElement>;

    act(() => {
      result.current.handleAnswer(event);
    });

    expect(recordBirdEncounterMock).toHaveBeenCalledWith(expect.objectContaining({
      birdName: 'Blue Jay',
      isReal: false,
      metadata: expect.objectContaining({
        imageRevealed: true,
      }),
    }));
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

  it('does not start another hint request while one is still loading', async () => {
    let resolveHint: ((value: { type: 'fact'; content: string }) => void) | null = null;

    vi.mocked(fetchHint).mockImplementationOnce(() => new Promise((resolve) => {
      resolveHint = resolve as (value: { type: 'fact'; content: string }) => void;
    }));

    const { result } = renderHook(() => useGameState());

    await act(async () => {
      void result.current.requestHint('fact');
    });

    expect(result.current.hintLoading.fact).toBe(true);

    await act(async () => {
      await result.current.requestHint('image');
    });

    expect(fetchHint).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveHint?.({
        type: 'fact',
        content: 'A hint fact.',
      });
      await Promise.resolve();
    });

    expect(result.current.hintLoading.fact).toBe(false);
    expect(result.current.hints.fact).toEqual({
      type: 'fact',
      content: 'A hint fact.',
    });
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
    expect(fetchData).toHaveBeenCalledTimes(2);
  });
});