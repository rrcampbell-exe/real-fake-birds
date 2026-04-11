'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { GameMode, GameRoundResult, HintState, HintType } from '@/types';
import { useStoredJson } from './useStoredValue';
import { flushQueuedProgressEventsForSignedInUser } from '@/lib/auth/account-session';
import {
  BIRD_JOURNAL_STORAGE_KEY,
  CURRENT_ROUND_JOURNAL_REVEAL_KEY,
  deriveBirdKey,
  normalizeBirdJournalStore,
  recordBirdEncounter,
  writeCurrentRoundJournalBirdKey,
  writeCurrentRoundJournalRevealKey,
} from '@/lib/utils/bird-journal';
import {
  CURRENT_HINTS_STORAGE_KEY,
  FACT_HINT_COST,
  IMAGE_HINT_COST,
  REVEAL_BIRD_COST,
  SKIP_BIRD_COST,
  emptyHintState,
} from '@/lib/constants/hints';
import { getTodayChallengeDate } from '@/lib/utils/daily-challenge';
import { getTodayMissionDate } from '@/lib/utils/daily-mission-date';
import { buildMissionRewardGrantEvents } from '@/lib/utils/missions';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { hasSupabaseEnv } from '@/lib/supabase/env';
import { createProgressEventId, queueProgressEvent } from '@/lib/progress/progress-event-outbox';
import fetchData from '@/lib/utils/fetch-data';
import fetchHint from '@/lib/utils/fetch-hint';
import responseEval from '@/lib/utils/response-eval';
import { defaultBirdScore, BIRD_SCORE_STORAGE_KEY } from '@/lib/utils/player-progress';
import { refundSeeds, spendSeeds } from '@/lib/utils/seed-spend';
import { track, trackFirstPurchase, trackSessionStart } from '@/lib/analytics';

const PROGRESS_FLUSH_DELAY_MS = 5000;

interface UseGameStateOptions {
  mode?: GameMode;
  onRoundResolved?: (result: GameRoundResult) => void;
}

function readStoredHints(storageKey: string): HintState {
  if (typeof window === 'undefined') {
    return emptyHintState;
  }

  const raw = localStorage.getItem(storageKey);
  if (!raw) {
    return emptyHintState;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<HintState>;
    return {
      fact: parsed.fact ?? null,
      image: parsed.image ?? null,
    };
  } catch {
    return emptyHintState;
  }
}

function writeStoredHints(hints: HintState, storageKey: string): void {
  localStorage.setItem(storageKey, JSON.stringify(hints));
}

function getHintCost(type: HintType): number {
  return type === 'fact' ? FACT_HINT_COST : IMAGE_HINT_COST;
}

export function useGameState(options?: UseGameStateOptions) {
  const mode = options?.mode ?? 'classic';
  const hintsKey = `${CURRENT_HINTS_STORAGE_KEY}:${mode}`;
  const birdDataKey = `birdData:${mode}`;

  const [birdData, setBirdData] = useState('');
  const [isReal, setIsReal] = useState(false);
  const [regionLabel, setRegionLabel] = useState<string | null>(null);
  const [sciName, setSciName] = useState<string | null>(null);
  const [fact, setFact] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [articleUrl, setArticleUrl] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [description, setDescription] = useState<string | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [isStreak, setIsStreak] = useState(false);
  const [isMilestone, setIsMilestone] = useState(false);
  const [seedsEarned, setSeedsEarned] = useState(0);
  const [firstGameOfDayBonusSeedsEarned, setFirstGameOfDayBonusSeedsEarned] = useState(0);
  const [milestoneRewardSeedsEarned, setMilestoneRewardSeedsEarned] = useState(0);
  const [newThemeUnlockName, setNewThemeUnlockName] = useState<string | null>(null);
  const [earnedBadgeName, setEarnedBadgeName] = useState<string | null>(null);
  const [isNewBirdEncounter, setIsNewBirdEncounter] = useState(false);
  const [hints, setHints] = useState<HintState>(() => readStoredHints(hintsKey));
  const [hintError, setHintError] = useState<string | null>(null);
  const [hintErrorType, setHintErrorType] = useState<HintType | null>(null);
  const [hintLoading, setHintLoading] = useState<Record<HintType, boolean>>({
    fact: false,
    image: false,
  });
  const [fetchKey, setFetchKey] = useState(0);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const flushTimeoutRef = useRef<number | null>(null);
  const birdScore = useStoredJson(BIRD_SCORE_STORAGE_KEY, defaultBirdScore);
  const birdJournalStore = useStoredJson(BIRD_JOURNAL_STORAGE_KEY, {});
  const currentRoundRevealKey = useStoredJson<string | null>(CURRENT_ROUND_JOURNAL_REVEAL_KEY, null);
  const currentBirdKey = birdData ? deriveBirdKey(birdData, isReal) : null;
  const currentJournalEntry = birdData
    ? normalizeBirdJournalStore(birdJournalStore)[currentBirdKey ?? ''] ?? null
    : null;
  const isCurrentBirdRevealedForRound = Boolean(currentBirdKey && currentRoundRevealKey === currentBirdKey);
  const canRevealCurrentBird = Boolean(currentJournalEntry && currentBirdKey && currentRoundRevealKey !== currentBirdKey);
  const canSkipCurrentBird = Boolean(birdData && !currentJournalEntry);

  const resetRoundState = useCallback(() => {
    localStorage.setItem('birdStreakAchieved', 'false');
    localStorage.setItem('birdMilestoneAchieved', 'false');
    localStorage.removeItem('birdData');
    localStorage.removeItem(birdDataKey);
    localStorage.removeItem(hintsKey);
    setHasAnswered(false);
    setIsCorrect(false);
    setIsStreak(false);
    setIsMilestone(false);
    setSeedsEarned(0);
    setFirstGameOfDayBonusSeedsEarned(0);
    setMilestoneRewardSeedsEarned(0);
    setNewThemeUnlockName(null);
    setEarnedBadgeName(null);
    setIsNewBirdEncounter(false);
    setIsError(false);
    setIsLoading(true);
    setBirdData('');
    setRegionLabel(null);
    setSciName(null);
    setFact(null);
    setSummary(null);
    setArticleUrl(null);
    setImageUrl(null);
    setDescription(null);
    setHints(emptyHintState);
    setHintError(null);
    setHintErrorType(null);
    setHintLoading({ fact: false, image: false });
    writeCurrentRoundJournalBirdKey(null);
    writeCurrentRoundJournalRevealKey(null);
  }, [birdDataKey, hintsKey]);

  const flushQueuedProgressEvents = useCallback(async () => {
    if (!isSignedIn) {
      return;
    }

    try {
      await flushQueuedProgressEventsForSignedInUser();
    } catch {
      // Keep the outbox intact for the next retry.
    }
  }, [isSignedIn]);

  const scheduleProgressFlush = useCallback(() => {
    if (!isSignedIn) {
      return;
    }

    if (flushTimeoutRef.current !== null) {
      window.clearTimeout(flushTimeoutRef.current);
    }

    flushTimeoutRef.current = window.setTimeout(() => {
      void flushQueuedProgressEvents();
    }, PROGRESS_FLUSH_DELAY_MS);
  }, [flushQueuedProgressEvents, isSignedIn]);

  const queueSeedSpend = useCallback((cost: number) => {
    if (!isSignedIn) {
      return;
    }

    queueProgressEvent({
      eventId: createProgressEventId(),
      eventType: 'hint-spent',
      occurredAt: new Date().toISOString(),
      payload: {
        mode,
        cost,
      },
    });
    scheduleProgressFlush();
  }, [isSignedIn, mode, scheduleProgressFlush]);

  const queueSeedRefund = useCallback((cost: number) => {
    if (!isSignedIn) {
      return;
    }

    queueProgressEvent({
      eventId: createProgressEventId(),
      eventType: 'hint-refunded',
      occurredAt: new Date().toISOString(),
      payload: {
        mode,
        cost,
      },
    });
    scheduleProgressFlush();
  }, [isSignedIn, mode, scheduleProgressFlush]);

  useEffect(() => {
    const controller = new AbortController();

    fetchData(
      setIsReal,
      setIsLoading,
      setBirdData,
      setSciName,
      setRegionLabel,
      setFact,
      setSummary,
      setArticleUrl,
      setImageUrl,
      setDescription,
      setIsError,
      mode,
      controller.signal
    );

    return () => {
      controller.abort();
    };
  }, [fetchKey, mode]);

  useEffect(() => {
    trackSessionStart(mode);
  }, [mode]);

  useEffect(() => {
    if (!hasSupabaseEnv()) {
      setIsSignedIn(false);
      return;
    }

    const supabase = getSupabaseBrowserClient();
    let active = true;

    const refreshSession = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!active) {
          return;
        }

        const signedIn = Boolean(data.session?.user);
        setIsSignedIn(signedIn);
        if (signedIn) {
          void flushQueuedProgressEvents();
        }
      } catch {
        if (active) {
          setIsSignedIn(false);
        }
      }
    };

    void refreshSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void refreshSession();
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [flushQueuedProgressEvents]);

  useEffect(() => {
    if (!isSignedIn) {
      return;
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        void flushQueuedProgressEvents();
      }
    };

    const handlePageHide = () => {
      void flushQueuedProgressEvents();
    };

    window.addEventListener('pagehide', handlePageHide);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('pagehide', handlePageHide);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [flushQueuedProgressEvents, isSignedIn]);

  useEffect(() => () => {
    if (flushTimeoutRef.current !== null) {
      window.clearTimeout(flushTimeoutRef.current);
    }
  }, []);

  useEffect(() => {
    if (hasAnswered) {
      return;
    }

    if (!currentBirdKey || isLoading) {
      return;
    }

    writeCurrentRoundJournalBirdKey(currentBirdKey);
    if (currentRoundRevealKey && currentRoundRevealKey !== currentBirdKey) {
      writeCurrentRoundJournalRevealKey(null);
    }
  }, [currentBirdKey, currentRoundRevealKey, hasAnswered, isLoading]);

  const handleAnswer = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      const chosenResponse = (e.currentTarget.id as 'real' | 'fake');
      const usedHintTypes = (Object.entries(hints) as [HintType, HintState[HintType]][])
        .filter(([, value]) => value)
        .map(([type]) => type);

      const result = responseEval(
        e,
        isReal,
        chosenResponse,
        setIsCorrect,
        setIsStreak,
        setIsMilestone,
        setSeedsEarned,
        setNewThemeUnlockName,
        setEarnedBadgeName,
        {
          mode,
          isNewBirdEncounter: !currentJournalEntry,
          usedHintTypes,
          onRoundResolved: options?.onRoundResolved,
        }
      );
      setFirstGameOfDayBonusSeedsEarned(result.firstGameOfDayBonusSeedsEarned ?? 0);
      setMilestoneRewardSeedsEarned(result.milestoneRewardSeedsEarned ?? 0);

      const journalEntry = recordBirdEncounter({
        birdName: birdData,
        isReal,
        outcome: result.isCorrect ? 'correct' : 'incorrect',
        metadata: {
          regionLabel: regionLabel ?? undefined,
          sciName: sciName ?? undefined,
          fact: fact ?? undefined,
          summary: summary ?? undefined,
          articleUrl: articleUrl ?? undefined,
          imageUrl: imageUrl ?? undefined,
          description: description ?? undefined,
        },
      });
      setIsNewBirdEncounter(journalEntry.seenCount === 1);

      if (isSignedIn) {
        queueProgressEvent({
          eventId: createProgressEventId(),
          eventType: 'round-resolved',
          occurredAt: new Date().toISOString(),
          payload: {
            mode,
            isCorrect: result.isCorrect,
            streakProtected: result.streakProtected,
            challengeDate: mode === 'daily' ? getTodayChallengeDate() : undefined,
            birdKey: journalEntry.birdKey,
            isRealBird: isReal,
            isNewBirdEncounter: journalEntry.seenCount === 1,
            currentStreak: result.currentStreak,
            seedsEarned: result.roundSeedsEarned + result.personalBestRewardSeeds,
          },
        });

        const missionDate = getTodayMissionDate();
        buildMissionRewardGrantEvents(missionDate, {
          missionRewards: result.missionRewards,
          missionSetBonusSeedsEarned: result.missionSetBonusSeedsEarned,
        }).forEach((missionReward) => {
          queueProgressEvent({
            eventId: missionReward.eventId,
            eventType: 'mission-reward-granted',
            occurredAt: new Date().toISOString(),
            payload: {
              missionDate,
              missionId: missionReward.missionId,
              rewardSeeds: missionReward.rewardSeeds,
            },
          });
        });

        scheduleProgressFlush();
      }

      // If the player leaves before tapping "Next Bird", do not rehydrate this answered bird.
      localStorage.removeItem(birdDataKey);
      localStorage.removeItem(hintsKey);
      setHasAnswered(true);
    },
    [articleUrl, birdData, birdDataKey, currentJournalEntry, description, fact, hints, hintsKey, imageUrl, isReal, isSignedIn, mode, options, regionLabel, scheduleProgressFlush, sciName, summary]
  );

  const requestHint = useCallback(
    async (type: HintType) => {
      if (hasAnswered || isLoading || isError || !birdData || hintLoading[type] || hints[type]) {
        return;
      }

      const cost = getHintCost(type);
      if (birdScore.seeds < cost || !spendSeeds(cost)) {
        setHintError(`You need ${cost} seeds for that hint.`);
        setHintErrorType(null);
        return;
      }

      queueSeedSpend(cost);

      setHintError(null);
      setHintErrorType(null);
      setHintLoading((current) => ({
        ...current,
        [type]: true,
      }));

      try {
        const hint = await fetchHint(
          birdData,
          isReal,
          type,
          sciName ?? undefined,
          regionLabel ?? undefined,
          type === 'image' ? hints.fact?.content ?? undefined : undefined
        );

        setHints((current) => {
          const nextHints = {
            ...current,
            [type]: hint,
          };
          writeStoredHints(nextHints, hintsKey);
          return nextHints;
        });
        track('hint_used', {
          mode,
          type,
          is_real: isReal,
          cost,
        });
        trackFirstPurchase(type === 'fact' ? 'hint_fact' : 'hint_image');
      } catch {
        refundSeeds(cost);
        queueSeedRefund(cost);
        setHintError('Request failed. Your seeds were refunded.');
        setHintErrorType(type);
      } finally {
        setHintLoading((current) => ({
          ...current,
          [type]: false,
        }));
      }
    },
    [birdData, birdScore.seeds, hasAnswered, hintLoading, hints, hintsKey, isError, isLoading, isReal, mode, queueSeedRefund, queueSeedSpend, regionLabel, sciName]
  );

  const revealCurrentBird = useCallback(() => {
    if (hasAnswered || isLoading || isError || !currentJournalEntry || !canRevealCurrentBird || !currentBirdKey) {
      return;
    }

    if (birdScore.seeds < REVEAL_BIRD_COST || !spendSeeds(REVEAL_BIRD_COST)) {
      return;
    }

    writeCurrentRoundJournalRevealKey(currentBirdKey);
    queueSeedSpend(REVEAL_BIRD_COST);
  }, [birdScore.seeds, canRevealCurrentBird, currentBirdKey, currentJournalEntry, hasAnswered, isError, isLoading, queueSeedSpend]);

  const skipCurrentBird = useCallback(() => {
    if (hasAnswered || isLoading || isError || !birdData || !canSkipCurrentBird) {
      return;
    }

    if (birdScore.seeds < SKIP_BIRD_COST || !spendSeeds(SKIP_BIRD_COST)) {
      return;
    }

    queueSeedSpend(SKIP_BIRD_COST);
    resetRoundState();
    setFetchKey((key) => key + 1);
  }, [birdData, birdScore.seeds, canSkipCurrentBird, hasAnswered, isError, isLoading, queueSeedSpend, resetRoundState]);

  const tryAgain = useCallback(() => {
    resetRoundState();
    setFetchKey((k) => k + 1);
  }, [resetRoundState]);

  const showQuestion = !hasAnswered && !isError && !isLoading;
  const specialHintAction = isCurrentBirdRevealedForRound
    ? {
        type: 'reveal' as const,
        title: 'Reveal This Bird',
        description: 'See whether this bird is real or fake for this round.',
        cost: REVEAL_BIRD_COST,
        disabled: false,
        onRequest: revealCurrentBird,
        previewTitle: 'Round Reveal',
        previewContent: `${birdData} is a ${isReal ? 'real' : 'fake'} bird.`,
      }
    : canRevealCurrentBird
      ? {
          type: 'reveal' as const,
          title: 'Reveal This Bird',
          description: 'See whether this bird is real or fake for this round only.',
          cost: REVEAL_BIRD_COST,
          disabled: birdScore.seeds < REVEAL_BIRD_COST,
          onRequest: revealCurrentBird,
        }
      : canSkipCurrentBird
        ? {
            type: 'skip' as const,
            title: 'Skip This Bird',
            description: 'Pass on this encounter and spot a new bird immediately.',
            cost: SKIP_BIRD_COST,
            disabled: birdScore.seeds < SKIP_BIRD_COST,
            onRequest: skipCurrentBird,
          }
        : null;

  return {
    birdData,
    isReal,
    regionLabel,
    sciName,
    fact,
    summary,
    articleUrl,
    imageUrl,
    description,
    hasAnswered,
    isLoading,
    isError,
    isCorrect,
    isStreak,
    isMilestone,
    seedsEarned,
    firstGameOfDayBonusSeedsEarned,
    milestoneRewardSeedsEarned,
    newThemeUnlockName,
    earnedBadgeName,
    isNewBirdEncounter,
    hints,
    hintError,
    hintErrorType,
    hintLoading,
    seedsBalance: birdScore.seeds,
    specialHintAction,
    showQuestion,
    handleAnswer,
    requestHint,
    tryAgain,
  };
}
