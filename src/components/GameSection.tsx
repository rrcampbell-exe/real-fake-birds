'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useGameState } from '@/hooks/useGameState';
import { useSignUpPrompt } from '@/hooks/useSignUpPrompt';
import WeeklyChallengeBanner from '@/components/WeeklyChallengeBanner';
import MilestoneBadgeSvg from '@/components/icons/MilestoneBadgeSvg';
import BirdCard from './game/BirdCard';
import LoadingState from './LoadingState';
import Answer from './Answer';
import Error from './Error';
import StatsBar from '@/components/StatsBar';
import SignUpPromptModal from '@/components/auth/SignUpPromptModal';
import type { GameRoundResult } from '@/types';

interface UnlockToast {
  id: number;
  title: string;
  detail: string;
  priority: number;
  badgeName?: string;
}

const TOAST_LIFETIME_MS = 3600;

function buildUnlockToasts(options: {
  isMilestone: boolean;
  earnedBadgeName: string | null;
  newThemeUnlockName: string | null;
  firstGameOfDayBonusSeedsEarned: number;
  milestoneRewardSeedsEarned: number;
  roundResult: GameRoundResult | null;
}): UnlockToast[] {
  const nextToasts: UnlockToast[] = [];

  if (options.firstGameOfDayBonusSeedsEarned > 0) {
    nextToasts.push({
      id: 15,
      title: 'First Bird Bonus!',
      detail: `That's your first correct bird of the day. Have +${options.firstGameOfDayBonusSeedsEarned} bonus seeds!`,
      priority: 70,
    });
  }

  options.roundResult?.missionRewards.forEach((missionReward, index) => {
    nextToasts.push({
      id: 10 + index,
      title: 'Mission Complete!',
      detail: `${missionReward.toastDescription} You've earned an extra ${missionReward.rewardSeeds} seeds for your efforts!`,
      priority: 60,
    });
  });

  if (options.roundResult?.justLostBestStreak) {
    nextToasts.push({
      id: 90,
      title: 'New Personal Best!',
      detail: `What a run! Your best streak of ${options.roundResult.bestStreak} earns you +${options.roundResult.personalBestRewardSeeds} bonus seeds.`,
      priority: 100,
    });
  }

  if (options.roundResult?.justBrokeBestStreak) {
    nextToasts.push({
      id: 91,
      title: 'New Personal Best!',
      detail: `You've beaten your record with a streak of ${options.roundResult.currentStreak}.`,
      priority: 100,
    });
  }

  if (options.roundResult?.completedDailyMissionSet) {
    nextToasts.push({
      id: 20,
      title: 'Daily Streak Extended!',
      detail: options.roundResult.dailyMissionStreak
        ? `Your daily streak is now ${options.roundResult.dailyMissionStreak} day${options.roundResult.dailyMissionStreak > 1 ? 's' : ''}. Have +${options.roundResult.missionSetBonusSeedsEarned} bonus seeds as a treat.`
        : `+${options.roundResult.missionSetBonusSeedsEarned} bonus seeds.`,
      priority: 40,
    });
  }

  if (options.milestoneRewardSeedsEarned > 0) {
    const milestoneDetail = typeof options.roundResult?.birdsIdentified === 'number'
      ? `You hit ${options.roundResult.birdsIdentified} birds identified. Have +${options.milestoneRewardSeedsEarned} bonus seeds!`
      : `You hit a new milestone. Have +${options.milestoneRewardSeedsEarned} bonus seeds!`;

    nextToasts.push({
      id: 21,
      title: 'Milestone Bonus!',
      detail: milestoneDetail,
      priority: 75,
    });
  }

  if (options.earnedBadgeName && options.newThemeUnlockName) {
    nextToasts.push({
      id: 1,
      title: 'Badge & Theme Unlocked!',
      detail: `The ${options.earnedBadgeName} Badge is now yours, and the ${options.newThemeUnlockName} Theme just joined your flock.`,
      priority: 80,
      badgeName: options.earnedBadgeName,
    });
  } else if (options.earnedBadgeName) {
    nextToasts.push({
      id: 2,
      title: 'Badge Unlocked!',
      detail: `The ${options.earnedBadgeName} Badge is now yours. We won't stop you from shaking your tail feathers in celebration.`,
      priority: 80,
      badgeName: options.earnedBadgeName,
    });
  } else if (options.newThemeUnlockName) {
    nextToasts.push({
      id: 3,
      title: 'Theme Unlocked!',
      detail: `You can now use the ${options.newThemeUnlockName} Theme. Why not try out your new look?`,
      priority: 80,
    });
  }

  if (
    options.isMilestone
    && !options.earnedBadgeName
    && !options.newThemeUnlockName
    && options.milestoneRewardSeedsEarned === 0
  ) {
    nextToasts.push({
      id: 4,
      title: 'Milestone Reached!',
      detail: 'In real fake bird culture, this is kind of a big deal.',
      priority: 20,
    });
  }

  return nextToasts;
}

export default function GameSection() {
  const [roundAnimation, setRoundAnimation] = useState<{ id: number; result: GameRoundResult } | null>(null);
  const [expiredToastRoundId, setExpiredToastRoundId] = useState<number | null>(null);
  const {
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
    seedsBalance,
    specialHintAction,
    showQuestion,
    handleAnswer,
    requestHint,
    tryAgain,
  } = useGameState({
    onRoundResolved: (result) => {
      setRoundAnimation((current) => ({
        id: (current?.id ?? 0) + 1,
        result,
      }));
    },
  });
  const [showSignUpModal, setShowSignUpModal] = useState(false);
  const signUpPrompt = useSignUpPrompt('classic');

  const cardState = isLoading ? 'loading' : showQuestion ? 'question' : 'answer';
  const activeToastRoundId = hasAnswered ? (roundAnimation?.id ?? 0) : null;
  const unlockToastDefinitions = useMemo(() => {
    if (!hasAnswered) {
      return [];
    }

    return buildUnlockToasts({
      isMilestone,
      earnedBadgeName,
      newThemeUnlockName,
      firstGameOfDayBonusSeedsEarned,
      milestoneRewardSeedsEarned,
      roundResult: roundAnimation?.result ?? null,
    });
  }, [earnedBadgeName, firstGameOfDayBonusSeedsEarned, hasAnswered, isMilestone, milestoneRewardSeedsEarned, newThemeUnlockName, roundAnimation]);
  const activeUnlockToasts = useMemo(() => {
    if (activeToastRoundId === null || expiredToastRoundId === activeToastRoundId) {
      return [];
    }

    const highestPriorityToast = [...unlockToastDefinitions]
      .sort((left, right) => right.priority - left.priority || left.id - right.id)[0];

    if (!highestPriorityToast) {
      return [];
    }

    return [{
      ...highestPriorityToast,
      id: activeToastRoundId * 100 + highestPriorityToast.id,
    }];
  }, [activeToastRoundId, expiredToastRoundId, unlockToastDefinitions]);

  const handleAdvanceRound = useCallback(() => {
    if (signUpPrompt.shouldPrompt && signUpPrompt.activeThreshold !== null) {
      setShowSignUpModal(true);
      return;
    }

    tryAgain();
  }, [signUpPrompt.activeThreshold, signUpPrompt.shouldPrompt, tryAgain]);

  const handleDismissSignUpModal = useCallback(() => {
    signUpPrompt.dismiss();
    setShowSignUpModal(false);
    tryAgain();
  }, [signUpPrompt, tryAgain]);

  const handleAuthenticated = useCallback(() => {
    signUpPrompt.onAccountCreated();
    setShowSignUpModal(false);
    tryAgain();
  }, [signUpPrompt, tryAgain]);

  useEffect(() => {
    if (activeToastRoundId === null || unlockToastDefinitions.length === 0 || expiredToastRoundId === activeToastRoundId) {
      return;
    }

    const timerId = window.setTimeout(() => {
      setExpiredToastRoundId(activeToastRoundId);
    }, TOAST_LIFETIME_MS);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [activeToastRoundId, expiredToastRoundId, unlockToastDefinitions.length]);

  return (
    <div className="box-border flex min-h-[calc(100dvh-7rem)] flex-1 flex-col items-center justify-center gap-6 py-6 md:min-h-0 md:py-4">
      {/* Title + slogan — visible only on mobile (desktop shows it in TopNav) */}
      <div className="text-center px-4 md:hidden">
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-[0.05em]">
          Real Fake Birds
        </h1>
        <p className="text-sm text-[var(--color-muted)] mt-1">
          Some are real. Some are fake. Tell them apart.
        </p>
      </div>

      <StatsBar refreshTrigger={hasAnswered} roundAnimation={roundAnimation} />

      <div className="pointer-events-none fixed inset-x-0 top-20 z-40 flex justify-center px-4">
        <div className="flex w-full max-w-sm flex-col gap-2">
          <AnimatePresence>
            {activeUnlockToasts.map((toast) => (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, y: -12, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.98 }}
                transition={{ duration: 0.24, ease: 'easeOut' }}
                className="rounded-2xl border border-[var(--color-surface-border)] bg-[color-mix(in_srgb,var(--color-surface)_92%,white_8%)] px-4 py-3 shadow-[var(--shadow-card)] backdrop-blur-sm"
                role="status"
                aria-live="polite"
              >
                <div className="flex items-start gap-3">
                  {toast.badgeName ? (
                    <MilestoneBadgeSvg
                      badgeName={toast.badgeName}
                      size="3.25rem"
                      containerClassName="shrink-0"
                    />
                  ) : null}
                  <div className="min-w-0">
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-[var(--color-secondary)]">
                      {toast.title}
                    </p>
                    <p className="mt-1 text-sm font-medium text-[var(--color-text)]">{toast.detail}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      <WeeklyChallengeBanner />

      {isError && <Error onTryAgain={tryAgain} />}

      {!isError && (
        <BirdCard
          birdName={birdData}
          hintError={hintError}
          hintErrorType={hintErrorType}
          hintLoading={hintLoading}
          hints={hints}
          onRequestHint={requestHint}
          specialHintAction={specialHintAction}
          state={cardState}
          seedsBalance={seedsBalance}
          onAnswer={handleAnswer}
          loadingContent={<LoadingState />}
          answerContent={
            <Answer
              birdData={birdData}
              isReal={isReal}
              regionLabel={regionLabel}
              sciName={sciName}
              fact={fact}
              summary={summary}
              articleUrl={articleUrl}
              imageUrl={imageUrl}
              description={description}
              hints={hints}
              isStreak={isStreak}
              isCorrect={isCorrect}
              isMilestone={isMilestone}
              seedsEarned={seedsEarned}
              firstGameOfDayBonusSeedsEarned={firstGameOfDayBonusSeedsEarned}
              newThemeUnlockName={newThemeUnlockName}
              earnedBadgeName={earnedBadgeName}
              justBrokeBestStreak={Boolean(roundAnimation?.result.justBrokeBestStreak)}
              isNewBirdEncounter={isNewBirdEncounter}
              onAction={handleAdvanceRound}
            />
          }
        />
      )}

      <AnimatePresence>
        {showSignUpModal && signUpPrompt.activeThreshold !== null ? (
          <SignUpPromptModal
            birdsSeen={signUpPrompt.birdsSeen}
            birdsIdentified={signUpPrompt.birdsIdentified}
            seeds={signUpPrompt.seeds}
            threshold={signUpPrompt.activeThreshold}
            onDismiss={handleDismissSignUpModal}
            onAuthenticated={handleAuthenticated}
          />
        ) : null}
      </AnimatePresence>
    </div>
  );
}
