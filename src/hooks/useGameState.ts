'use client';

import { useState, useEffect, useCallback } from 'react';
import type { HintState, HintType } from '@/types';
import { useStoredJson } from './useStoredValue';
import { CURRENT_HINTS_STORAGE_KEY, FACT_HINT_COST, IMAGE_HINT_COST, emptyHintState } from '@/lib/constants/hints';
import fetchData from '@/lib/utils/fetch-data';
import fetchHint from '@/lib/utils/fetch-hint';
import responseEval from '@/lib/utils/response-eval';
import { defaultBirdScore, BIRD_SCORE_STORAGE_KEY } from '@/lib/utils/player-progress';
import { refundSeeds, spendSeeds } from '@/lib/utils/seed-spend';

function readStoredHints(): HintState {
  if (typeof window === 'undefined') {
    return emptyHintState;
  }

  const raw = localStorage.getItem(CURRENT_HINTS_STORAGE_KEY);
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

function writeStoredHints(hints: HintState): void {
  localStorage.setItem(CURRENT_HINTS_STORAGE_KEY, JSON.stringify(hints));
}

function getHintCost(type: HintType): number {
  return type === 'fact' ? FACT_HINT_COST : IMAGE_HINT_COST;
}

export function useGameState() {
  const [birdData, setBirdData] = useState('');
  const [isReal, setIsReal] = useState(false);
  const [regionLabel, setRegionLabel] = useState<string | null>(null);
  const [sciName, setSciName] = useState<string | null>(null);
  const [fact, setFact] = useState<string | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [isStreak, setIsStreak] = useState(false);
  const [isMilestone, setIsMilestone] = useState(false);
  const [seedsEarned, setSeedsEarned] = useState(0);
  const [newThemeUnlockName, setNewThemeUnlockName] = useState<string | null>(null);
  const [earnedBadgeName, setEarnedBadgeName] = useState<string | null>(null);
  const [hints, setHints] = useState<HintState>(() => readStoredHints());
  const [hintError, setHintError] = useState<string | null>(null);
  const [hintErrorType, setHintErrorType] = useState<HintType | null>(null);
  const [hintLoading, setHintLoading] = useState<Record<HintType, boolean>>({
    fact: false,
    image: false,
  });
  const [fetchKey, setFetchKey] = useState(0);
  const birdScore = useStoredJson(BIRD_SCORE_STORAGE_KEY, defaultBirdScore);

  useEffect(() => {
    fetchData(
      setIsReal,
      setIsLoading,
      setBirdData,
      setSciName,
      setRegionLabel,
      setFact,
      setIsError
    );
  }, [fetchKey]);

  const handleAnswer = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      const chosenResponse = (e.currentTarget.id as 'real' | 'fake');
      responseEval(
        e,
        isReal,
        chosenResponse,
        setIsCorrect,
        setIsStreak,
        setIsMilestone,
        setSeedsEarned,
        setNewThemeUnlockName,
        setEarnedBadgeName
      );
      setHasAnswered(true);
    },
    [isReal]
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
          writeStoredHints(nextHints);
          return nextHints;
        });
      } catch {
        refundSeeds(cost);
        setHintError('Request failed. Your seeds were refunded.');
        setHintErrorType(type);
      } finally {
        setHintLoading((current) => ({
          ...current,
          [type]: false,
        }));
      }
    },
    [birdData, birdScore.seeds, hasAnswered, hintLoading, hints, isError, isLoading, isReal, regionLabel, sciName]
  );

  const tryAgain = useCallback(() => {
    localStorage.setItem('birdStreakAchieved', 'false');
    localStorage.setItem('birdMilestoneAchieved', 'false');
    localStorage.removeItem('birdData');
    localStorage.removeItem(CURRENT_HINTS_STORAGE_KEY);
    // Reset all state in-place instead of reloading
    setHasAnswered(false);
    setIsCorrect(false);
    setIsStreak(false);
    setIsMilestone(false);
    setSeedsEarned(0);
    setNewThemeUnlockName(null);
    setEarnedBadgeName(null);
    setIsError(false);
    setIsLoading(true);
    setBirdData('');
    setRegionLabel(null);
    setSciName(null);
    setFact(null);
    setHints(emptyHintState);
    setHintError(null);
    setHintErrorType(null);
    setHintLoading({ fact: false, image: false });
    setFetchKey((k) => k + 1);
  }, []);

  const showQuestion = !hasAnswered && !isError && !isLoading;

  return {
    birdData,
    isReal,
    regionLabel,
    sciName,
    fact,
    hasAnswered,
    isLoading,
    isError,
    isCorrect,
    isStreak,
    isMilestone,
    seedsEarned,
    newThemeUnlockName,
    earnedBadgeName,
    hints,
    hintError,
    hintErrorType,
    hintLoading,
    seedsBalance: birdScore.seeds,
    showQuestion,
    handleAnswer,
    requestHint,
    tryAgain,
  };
}
