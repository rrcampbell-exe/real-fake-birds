'use client';

import { useState, useEffect, useCallback } from 'react';
import fetchData from '@/lib/utils/fetch-data';
import responseEval from '@/lib/utils/response-eval';

export function useGameState() {
  const [birdData, setBirdData] = useState('');
  const [isReal, setIsReal] = useState(false);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [isStreak, setIsStreak] = useState(false);
  const [isMilestone, setIsMilestone] = useState(false);
  const [fetchKey, setFetchKey] = useState(0);

  useEffect(() => {
    fetchData(setIsReal, setIsLoading, setBirdData, setIsError);
  }, [fetchKey]);

  const handleAnswer = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      const chosenResponse = (e.currentTarget.id as 'real' | 'fake');
      responseEval(e, isReal, chosenResponse, setIsCorrect, setIsStreak, setIsMilestone);
      setHasAnswered(true);
    },
    [isReal]
  );

  const tryAgain = useCallback(() => {
    localStorage.setItem('birdStreakAchieved', 'false');
    localStorage.setItem('birdMilestoneAchieved', 'false');
    localStorage.removeItem('birdData');
    // Reset all state in-place instead of reloading
    setHasAnswered(false);
    setIsCorrect(false);
    setIsStreak(false);
    setIsMilestone(false);
    setIsError(false);
    setIsLoading(true);
    setBirdData('');
    setFetchKey((k) => k + 1);
  }, []);

  const showQuestion = !hasAnswered && !isError && !isLoading;

  return {
    birdData,
    isReal,
    hasAnswered,
    isLoading,
    isError,
    isCorrect,
    isStreak,
    isMilestone,
    showQuestion,
    handleAnswer,
    tryAgain,
  };
}
