'use client';

import { WifiOff } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { useGameState } from '@/hooks/useGameState';
import { useScreenViewed } from '@/hooks/useScreenViewed';
import { useSignUpPrompt } from '@/hooks/useSignUpPrompt';
import WeeklyChallengeBanner from '@/components/WeeklyChallengeBanner';
import MilestoneBadgeSvg from '@/components/icons/MilestoneBadgeSvg';
import BirdCard from './game/BirdCard';
import LoadingState from './LoadingState';
import Answer from './Answer';
import Error from './Error';
import StatsBar from '@/components/StatsBar';
import SignUpPromptModal from '@/components/auth/SignUpPromptModal';
import OnboardingOverlay from '@/components/game/OnboardingOverlay';
import { useOnboarding } from '@/hooks/useOnboarding';
import type { GameRoundResult } from '@/types';

interface UnlockToast {
  id: number;
  title: string;
  detail: string;
  priority: number;
  badgeName?: string;
  lifetimeMs?: number;
}

const TOAST_LIFETIME_IMPORTANT_MS = 4500;
const TOAST_LIFETIME_ROUTINE_MS = 3000;
const TOAST_LIFETIME_EXTENDED_MS = 5200;
const TOAST_GAP_MS = 300;

function buildDailyStreakToastDetail(roundResult: GameRoundResult): string {
  return roundResult.dailyMissionStreak
    ? `Your daily streak is now ${roundResult.dailyMissionStreak} day${roundResult.dailyMissionStreak > 1 ? 's' : ''}! Have +${roundResult.missionSetBonusSeedsEarned} bonus seeds as a treat.`
    : `+${roundResult.missionSetBonusSeedsEarned} bonus seeds.`;
}

export function buildUnlockToasts(options: {
  isMilestone: boolean;
  earnedBadgeName: string | null;
  newThemeUnlockName: string | null;
  firstGameOfDayBonusSeedsEarned: number;
  milestoneRewardSeedsEarned: number;
  roundResult: GameRoundResult | null;
}): UnlockToast[] {
  const nextToasts: UnlockToast[] = [];
  const missionRewards = options.roundResult?.missionRewards ?? [];
  const shouldPreferDailyStreakToast = Boolean(options.roundResult?.completedDailyMissionSet && missionRewards.length > 0);
  const visibleMissionRewards = shouldPreferDailyStreakToast ? missionRewards.slice(0, -1) : missionRewards;

  if (options.firstGameOfDayBonusSeedsEarned > 0) {
    nextToasts.push({
      id: 15,
      title: 'First Bird Bonus!',
      detail: `That's your first correct bird of the day. Have +${options.firstGameOfDayBonusSeedsEarned} bonus seeds!`,
      priority: 70,
    });
  }

  visibleMissionRewards.forEach((missionReward, index) => {
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
      detail: buildDailyStreakToastDetail(options.roundResult),
      priority: shouldPreferDailyStreakToast ? 65 : 40,
      lifetimeMs: shouldPreferDailyStreakToast ? TOAST_LIFETIME_EXTENDED_MS : undefined,
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
  useScreenViewed('home');
  const [roundAnimation, setRoundAnimation] = useState<{ id: number; result: GameRoundResult } | null>(null);
  const [expiredToastRoundId, setExpiredToastRoundId] = useState<number | null>(null);
  const [currentToastIndex, setCurrentToastIndex] = useState(0);
  const prefersReducedMotion = usePrefersReducedMotion();
  const {
    birdData,
    isReal,
    regionLabel,
    sciName,
    fact,
    summary,
    articleUrl,
    imageUrl,
    fallbackImageUrl,
    contentSource,
    attribution,
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
    fakeImageNotice,
    seedsBalance,
    showQuestion,
    isOfflineReplay,
    handleAnswer,
    requestHint,
    revealFakeBirdImage,
    fakeBirdImageRevealed,
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
  const onboarding = useOnboarding();

  const cardState = isLoading ? 'loading' : showQuestion ? 'question' : 'answer';
  const activeToastRoundId = hasAnswered ? (roundAnimation?.id ?? 0) : null;
  const sortedToasts = useMemo(() => {
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
    }).sort((left, right) => right.priority - left.priority || left.id - right.id);
  }, [earnedBadgeName, firstGameOfDayBonusSeedsEarned, hasAnswered, isMilestone, milestoneRewardSeedsEarned, newThemeUnlockName, roundAnimation]);
  const activeUnlockToast = useMemo(() => {
    if (activeToastRoundId === null || expiredToastRoundId === activeToastRoundId) {
      return null;
    }

    const toast = sortedToasts[currentToastIndex];
    if (!toast) return null;

    return {
      ...toast,
      id: activeToastRoundId * 100 + toast.id,
    };
  }, [activeToastRoundId, currentToastIndex, expiredToastRoundId, sortedToasts]);

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
    const timerId = window.setTimeout(() => {
      setCurrentToastIndex(0);
    }, 0);
    return () => window.clearTimeout(timerId);
  }, [activeToastRoundId]);

  useEffect(() => {
    if (activeToastRoundId === null || sortedToasts.length === 0 || expiredToastRoundId === activeToastRoundId) {
      return;
    }

    const currentToast = sortedToasts[currentToastIndex];
    if (!currentToast) return;

    const lifetime = currentToast.lifetimeMs
      ?? (currentToast.priority >= 70 ? TOAST_LIFETIME_IMPORTANT_MS : TOAST_LIFETIME_ROUTINE_MS);
    let gapTimerId: number | undefined;

    const timerId = window.setTimeout(() => {
      const nextIndex = currentToastIndex + 1;
      if (nextIndex < sortedToasts.length) {
        gapTimerId = window.setTimeout(() => {
          setCurrentToastIndex(nextIndex);
        }, TOAST_GAP_MS);
      } else {
        setExpiredToastRoundId(activeToastRoundId);
      }
    }, lifetime);

    return () => {
      window.clearTimeout(timerId);
      window.clearTimeout(gapTimerId);
    };
  }, [activeToastRoundId, currentToastIndex, expiredToastRoundId, sortedToasts]);

  // Pull-to-refresh: detect a downward drag from the page top and trigger tryAgain.
  const containerRef = useRef<HTMLDivElement>(null);
  const pullStartY = useRef<number | null>(null);
  const [isPulling, setIsPulling] = useState(false);
  const PULL_THRESHOLD = 72;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (window.scrollY === 0) {
        pullStartY.current = e.touches[0]?.clientY ?? null;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (pullStartY.current === null) return;
      const deltaY = (e.touches[0]?.clientY ?? 0) - pullStartY.current;
      if (deltaY > 0 && window.scrollY === 0) {
        setIsPulling(deltaY >= PULL_THRESHOLD);
        e.preventDefault();
      }
    };

    const handleTouchEnd = () => {
      if (isPulling) {
        tryAgain();
      }
      pullStartY.current = null;
      setIsPulling(false);
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isPulling, tryAgain]);

  return (
    <div
      ref={containerRef}
      className="box-border flex min-h-[calc(100dvh-7rem-env(safe-area-inset-top)-env(safe-area-inset-bottom))] flex-1 flex-col items-center justify-center gap-6 py-6 md:min-h-0 md:py-4"
    >
      {isPulling && (
        <div className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center pt-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-surface-border)] bg-[var(--color-surface)] px-4 py-1.5 text-xs font-semibold text-[var(--color-muted)] shadow-[var(--shadow-card)]">
            <motion.span
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
              className="inline-block"
            >
              ↻
            </motion.span>
            Release to refresh
          </div>
        </div>
      )}
      {isOfflineReplay && (
        <div className="w-full max-w-md mx-auto px-4">
          <div className="flex items-center gap-2 rounded-xl border border-[var(--color-surface-border)] bg-[var(--color-surface)] px-3 py-2 text-xs font-medium text-[var(--color-muted)]">
            <WifiOff size={13} className="shrink-0 text-[var(--color-error)]" />
            <span>You're offline. Playing from your journal.</span>
          </div>
        </div>
      )}
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
            {activeUnlockToast ? (
              <motion.div
                key={activeUnlockToast.id}
                initial={{ opacity: 0, y: -12, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.98 }}
                transition={{ duration: prefersReducedMotion ? 0 : 0.24, ease: 'easeOut' }}
                className="rounded-2xl border border-[var(--color-surface-border)] bg-[color-mix(in_srgb,var(--color-surface)_92%,white_8%)] px-4 py-3 shadow-[var(--shadow-card)] backdrop-blur-sm"
                role="status"
                aria-live="polite"
              >
                <div className="flex items-start gap-3">
                  {activeUnlockToast.badgeName ? (
                    <MilestoneBadgeSvg
                      badgeName={activeUnlockToast.badgeName}
                      size="3.25rem"
                      containerClassName="shrink-0"
                    />
                  ) : null}
                  <div className="min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-[var(--color-secondary)]">
                        {activeUnlockToast.title}
                      </p>
                      {sortedToasts.length > 1 ? (
                        <p className="shrink-0 text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">
                          {currentToastIndex + 1} of {sortedToasts.length}
                        </p>
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm font-medium text-[var(--color-text)]">{activeUnlockToast.detail}</p>
                  </div>
                </div>
              </motion.div>
            ) : null}
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
              fallbackImageUrl={fallbackImageUrl}
              contentSource={contentSource}
              attribution={attribution}
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
              revealFakeBirdImage={revealFakeBirdImage}
              fakeBirdImageRevealed={fakeBirdImageRevealed}
              fakeImageNotice={fakeImageNotice}
              seedsBalance={seedsBalance}
            />
          }
        />
      )}

      <AnimatePresence>
        {onboarding.shouldShowOnboarding ? (
          <OnboardingOverlay onDismiss={onboarding.dismissOnboarding} />
        ) : null}
      </AnimatePresence>

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
