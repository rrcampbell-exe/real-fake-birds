'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CalendarDays, Flame, Trophy } from 'lucide-react';
import Link from 'next/link';
import Answer from '@/components/Answer';
import Error from '@/components/Error';
import LoadingState from '@/components/LoadingState';
import StatsBar from '@/components/StatsBar';
import BirdCard from '@/components/game/BirdCard';
import DailyChallengeCard from '@/components/game/DailyChallengeCard';
import MissionPanel from '@/components/game/MissionPanel';
import ShareButton from '@/components/ShareButton';
import { useDailyChallengeState } from '@/hooks/useDailyChallengeState';
import { useGameState } from '@/hooks/useGameState';
import { DAILY_CHALLENGE_CONFIG } from '@/lib/constants/daily-challenge';
import { track, trackSessionStart } from '@/lib/analytics';
import type { DailyChallengeState } from '@/types';
import { buildDailyChallengeSharePayload } from '@/lib/utils/share-data';
import { getUnclaimedDailyChallengeRewardSeeds } from '@/lib/utils/daily-challenge';

const DAILY_STARTED_SESSION_KEY = 'daily-challenge-started';

export default function DailyChallengePage() {
  const dailyChallenge = useDailyChallengeState();
  const [optimisticState, setOptimisticState] = useState<DailyChallengeState | null>(null);
  const [summaryDate, setSummaryDate] = useState<string | null>(
    dailyChallenge.isComplete ? dailyChallenge.state.date : null
  );
  const game = useGameState({
    mode: 'daily',
    onRoundResolved: (roundResult) => {
      const nextState = dailyChallenge.recordRound(roundResult);
      setOptimisticState(nextState);
      if (nextState.completed) {
        setSummaryDate(null);
      }
    },
  });
  const displayState = useMemo(() => {
    if (!optimisticState || optimisticState.date !== dailyChallenge.state.date) {
      return dailyChallenge.state;
    }

    const storedStateHasCaughtUp =
      dailyChallenge.state.roundsPlayed >= optimisticState.roundsPlayed
      && dailyChallenge.state.correctAnswers >= optimisticState.correctAnswers
      && dailyChallenge.state.bonusSeedsAwarded >= optimisticState.bonusSeedsAwarded
      && (dailyChallenge.state.completed || !optimisticState.completed);

    return storedStateHasCaughtUp ? dailyChallenge.state : optimisticState;
  }, [dailyChallenge.state, optimisticState]);
  const summaryState = displayState.completed ? displayState : null;
  const showSummary = summaryState?.completed && summaryDate === displayState.date;
  const pendingRewardSeeds = summaryState ? getUnclaimedDailyChallengeRewardSeeds(summaryState) : 0;

  const roundNumber = game.hasAnswered
    ? Math.max(displayState.roundsPlayed, 1)
    : Math.min(displayState.roundsPlayed + 1, DAILY_CHALLENGE_CONFIG.roundCount);
  const isFinalAnswer = game.hasAnswered && displayState.completed;
  const summaryPayload = useMemo(
    () => buildDailyChallengeSharePayload(summaryState ?? displayState),
    [displayState, summaryState]
  );

  useEffect(() => {
    trackSessionStart('daily');
    if (typeof window === 'undefined') {
      return;
    }

    if (window.sessionStorage.getItem(DAILY_STARTED_SESSION_KEY) || dailyChallenge.isComplete) {
      return;
    }

    window.sessionStorage.setItem(DAILY_STARTED_SESSION_KEY, 'true');
    track('daily_challenge_started', { date: dailyChallenge.state.date });
  }, [dailyChallenge.isComplete, dailyChallenge.state.date]);

  if (summaryState?.completed && showSummary) {
    return (
      <div className="flex flex-1 flex-col items-center px-4 py-8">
        <div className="w-full max-w-md rounded-2xl border border-[var(--color-surface-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)]">
          <div className="flex items-center justify-between gap-3">
            <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-muted)]">
              <ArrowLeft size={16} />
              Back to classic play
            </Link>
            <ShareButton payload={summaryPayload} eventLabel="daily-summary" />
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-[var(--color-surface-hover)] px-3 py-1 text-xs font-semibold text-[var(--color-muted)]">
              <CalendarDays size={14} />
              Daily complete
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-[var(--color-surface-hover)] px-3 py-1 text-xs font-semibold text-[var(--color-muted)]">
              <Flame size={14} />
              {dailyChallenge.challengeStreak} day streak
            </span>
          </div>

          <h1 className="mt-5 font-[family-name:var(--font-display)] text-3xl font-bold leading-tight">
            {summaryState.correctAnswers}/{DAILY_CHALLENGE_CONFIG.roundCount} birds right today
          </h1>
          <p className="mt-3 text-sm leading-6 text-[var(--color-muted)]">
            {pendingRewardSeeds > 0
              ? `You have ${pendingRewardSeeds} bonus seeds ready to claim in Rewards.`
              : `You've already claimed your ${summaryState.bonusSeedsAwarded} bonus seeds for today. Come back tomorrow for a fresh run.`}
          </p>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-[var(--color-surface-border)] bg-[var(--color-surface-hover)] p-4">
              <p className="text-[0.65rem] uppercase tracking-[0.14em] text-[var(--color-muted)]">Score</p>
              <p className="mt-2 font-[family-name:var(--font-display)] text-2xl font-bold">
                {summaryState.correctAnswers}/{DAILY_CHALLENGE_CONFIG.roundCount}
              </p>
            </div>
            <div className="rounded-xl border border-[var(--color-surface-border)] bg-[var(--color-surface-hover)] p-4">
              <p className="text-[0.65rem] uppercase tracking-[0.14em] text-[var(--color-muted)]">Bonus Seeds</p>
              <p className="mt-2 font-[family-name:var(--font-display)] text-2xl font-bold">
                {summaryState.bonusSeedsAwarded}
              </p>
            </div>
          </div>

          {pendingRewardSeeds > 0 ? (
            <Link
              href="/rewards"
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-[var(--color-secondary)] px-4 py-2 text-sm font-semibold text-[var(--color-on-secondary)] transition hover:brightness-110"
            >
              Claim in Rewards
            </Link>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="box-border flex min-h-[calc(100dvh-7rem)] flex-1 flex-col items-center justify-center gap-6 py-6 md:min-h-0 md:py-4">
      <div className="w-full max-w-md px-4">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-muted)]">
          <ArrowLeft size={16} />
          Back to classic play
        </Link>
      </div>

      <div className="w-full max-w-md px-4">
        <div className="rounded-2xl border border-[var(--color-surface-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-card)]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">
                Daily Challenge
              </p>
              <h1 className="mt-1 font-[family-name:var(--font-display)] text-xl font-bold">
                Round {Math.max(roundNumber, 1)} of {DAILY_CHALLENGE_CONFIG.roundCount}
              </h1>
            </div>
            <div className="inline-flex items-center gap-1 rounded-full bg-[var(--color-surface-hover)] px-3 py-1 text-xs font-semibold text-[var(--color-muted)]">
              <Trophy size={14} />
              {displayState.correctAnswers} correct
            </div>
          </div>
        </div>
      </div>

      <StatsBar refreshTrigger={game.hasAnswered} />

      {game.isError && <Error onTryAgain={game.tryAgain} />}

      {!game.isError && (
        <BirdCard
          birdName={game.birdData}
          hintError={game.hintError}
          hintErrorType={game.hintErrorType}
          hintLoading={game.hintLoading}
          hints={game.hints}
          onRequestHint={game.requestHint}
          state={game.isLoading ? 'loading' : game.showQuestion ? 'question' : 'answer'}
          seedsBalance={game.seedsBalance}
          onAnswer={game.handleAnswer}
          loadingContent={<LoadingState />}
          answerContent={
            <Answer
              birdData={game.birdData}
              isReal={game.isReal}
              regionLabel={game.regionLabel}
              sciName={game.sciName}
              fact={game.fact}
              hints={game.hints}
              isStreak={game.isStreak}
              isCorrect={game.isCorrect}
              isMilestone={game.isMilestone}
              seedsEarned={game.seedsEarned}
              newThemeUnlockName={game.newThemeUnlockName}
              earnedBadgeName={game.earnedBadgeName}
              actionLabel={isFinalAnswer ? 'View Summary' : 'Next Round'}
              onAction={() => {
                if (isFinalAnswer) {
                  setSummaryDate(displayState.date);
                  return;
                }

                game.tryAgain();
              }}
            />
          }
        />
      )}

      <DailyChallengeCard showAction={false} />

      <MissionPanel showClaimActions={false} />
    </div>
  );
}