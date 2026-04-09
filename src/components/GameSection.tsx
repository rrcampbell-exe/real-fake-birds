'use client';

import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useGameState } from '@/hooks/useGameState';
import { useSignUpPrompt } from '@/hooks/useSignUpPrompt';
import WeeklyChallengeBanner from '@/components/WeeklyChallengeBanner';
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
}

const TOAST_LIFETIME_MS = 3600;

function buildUnlockToasts(options: {
  isMilestone: boolean;
  earnedBadgeName: string | null;
  newThemeUnlockName: string | null;
  roundResult: GameRoundResult | null;
}): UnlockToast[] {
  const nextToasts: UnlockToast[] = [];

  options.roundResult?.missionRewards.forEach((missionReward, index) => {
    nextToasts.push({
      id: 10 + index,
      title: 'Mission Complete!',
      detail: `${missionReward.toastDescription} You've earned an extra ${missionReward.rewardSeeds} seeds for your efforts!`,
    });
  });

  if (options.roundResult?.completedDailyMissionSet) {
    nextToasts.push({
      id: 20,
      title: 'Daily Streak Extended!',
      detail: options.roundResult.dailyMissionStreak
        ? `Your daily streak is now ${options.roundResult.dailyMissionStreak} day${options.roundResult.dailyMissionStreak > 1 ? 's' : ''}. Have +${options.roundResult.missionSetBonusSeedsEarned} bonus seeds as a treat.`
        : `+${options.roundResult.missionSetBonusSeedsEarned} bonus seeds.`,
    });
  }

  if (options.earnedBadgeName) {
    nextToasts.push({
      id: 1,
      title: 'Badge Unlocked!',
      detail: `The ${options.earnedBadgeName} Badge is now yours. We won't stop you from shaking your tail feathers in celebration.`,
    });
  }

  if (options.newThemeUnlockName) {
    nextToasts.push({
      id: 2,
      title: 'Theme Unlocked!',
      detail: `You can now use the ${options.newThemeUnlockName} Theme. Why not try out your new look?`,
    });
  }

  if (options.isMilestone && !options.earnedBadgeName && !options.newThemeUnlockName) {
    nextToasts.push({
      id: 3,
      title: 'Milestone Reached!',
      detail: 'In real fake bird culture, this is kind of a big deal.',
    });
  }

  return nextToasts;
}

export default function GameSection() {
  const [roundAnimation, setRoundAnimation] = useState<{ id: number; result: GameRoundResult } | null>(null);
  const [unlockToasts, setUnlockToasts] = useState<UnlockToast[]>([]);
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
    if (!hasAnswered) {
      setUnlockToasts([]);
      return;
    }

    const nextToasts = buildUnlockToasts({
      isMilestone,
      earnedBadgeName,
      newThemeUnlockName,
      roundResult: roundAnimation?.result ?? null,
    }).map((toast, index) => ({
      ...toast,
      id: (roundAnimation?.id ?? 0) * 10 + toast.id,
      detail: toast.detail,
    }));

    if (nextToasts.length === 0) {
      return;
    }

    setUnlockToasts(nextToasts);

    const timerId = window.setTimeout(() => {
      setUnlockToasts([]);
    }, TOAST_LIFETIME_MS);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [earnedBadgeName, hasAnswered, isMilestone, newThemeUnlockName, roundAnimation]);

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
            {unlockToasts.map((toast) => (
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
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-[var(--color-secondary)]">
                  {toast.title}
                </p>
                <p className="mt-1 text-sm font-medium text-[var(--color-text)]">{toast.detail}</p>
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
              newThemeUnlockName={newThemeUnlockName}
              earnedBadgeName={earnedBadgeName}
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
