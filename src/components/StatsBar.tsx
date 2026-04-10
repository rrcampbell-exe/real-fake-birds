'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { Flame, LoaderCircle, Target, Trophy, Zap } from 'lucide-react';
import SeedIcon from '@/components/icons/SeedIcon';
import { flushQueuedProgressEventsForSignedInUser } from '@/lib/auth/account-session';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { hasSupabaseEnv } from '@/lib/supabase/env';
import { purchaseStreakInsuranceDirect } from '@/lib/auth/account-sync';
import { milestones } from '@/lib/constants/milestones';
import { streakValues } from '@/lib/constants/streaks';
import { track } from '@/lib/analytics';
import { getThemeUnlockByMilestoneValue } from '@/lib/constants/theme-unlocks';
import { isNextMilestoneEval, isNextStreakEval } from '@/lib/utils/goals-evaluation';
import { useStoredJson } from '@/hooks/useStoredValue';
import { defaultBirdScore, getUnlockedThemeNames, mergeNonRoundRemoteScore, normalizeBirdScore, writeBirdScore } from '@/lib/utils/player-progress';
import { formatNumber } from '@/lib/utils/number-format';
import {
  clearStreakInsurance,
  defaultStreakInsuranceState,
  getStreakInsuranceCost,
  isStreakInsuranceExpired,
  purchaseStreakInsurance,
  STREAK_INSURANCE_MIN_STREAK,
  STREAK_INSURANCE_STORAGE_KEY,
  writeStreakInsuranceState,
} from '@/lib/utils/streak-insurance';
import type { GameRoundResult } from '@/types';

interface StatsBarProps {
  refreshTrigger?: unknown;
  roundAnimation?: {
    id: number;
    result: GameRoundResult;
  } | null;
}

interface InsuranceErrorState {
  interactionKey: string;
  message: string;
}

const STAT_ANIMATION_DELAY_MS = 780;
const SEED_INDICATOR_DURATION_MS = 1400;

export default function StatsBar({ refreshTrigger, roundAnimation }: StatsBarProps) {
  const pathname = usePathname();
  const interactionKey = `${pathname}:${String(refreshTrigger)}`;
  const supabaseReady = hasSupabaseEnv();
  const storedStats = useStoredJson<typeof defaultBirdScore | null>('birdScore', null);
  const insuranceState = useStoredJson(STREAK_INSURANCE_STORAGE_KEY, defaultStreakInsuranceState);
  const [insuranceErrorState, setInsuranceErrorState] = useState<InsuranceErrorState | null>(null);
  const [isPurchasingInsurance, setIsPurchasingInsurance] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [floatingSeeds, setFloatingSeeds] = useState<{ id: number; amount: number } | null>(null);
  const handledRoundAnimationIdRef = useRef<number | null>(null);
  const { birdsSeen, birdsIdentified, currentStreak, bestStreak, seeds, activePersonalBestTarget } = normalizeBirdScore(storedStats);
  const accuracy = birdsSeen > 0 ? Math.floor((birdsIdentified / birdsSeen) * 100) : 0;
  const nextStreak = isNextStreakEval(streakValues, currentStreak);
  const milestoneValues = milestones.map((milestone) => milestone.value);
  const nextMilestone = isNextMilestoneEval(milestoneValues, birdsIdentified);
  const previousMilestone = [...milestoneValues].reverse().find((value) => value <= birdsIdentified) ?? 0;
  const nextUnlock = nextMilestone ? getThemeUnlockByMilestoneValue(nextMilestone) : undefined;
  const unlockedThemeNames = new Set(getUnlockedThemeNames({ birdsSeen, birdsIdentified, currentStreak, bestStreak, seeds }));
  const isNextThemeAlreadyUnlocked = Boolean(nextUnlock?.themeName && unlockedThemeNames.has(nextUnlock.themeName));
  const remainingMilestoneBirds = nextMilestone ? nextMilestone - birdsIdentified : 0;
  const unlockProgress = nextMilestone
    ? ((birdsIdentified - previousMilestone) / (nextMilestone - previousMilestone)) * 100
    : 100;
  const insuranceCost = getStreakInsuranceCost(currentStreak);
  const insuranceShortfall = Math.max(insuranceCost - seeds, 0);
  const insuranceExpired = isStreakInsuranceExpired(insuranceState, currentStreak);
  const effectiveInsuranceState = insuranceExpired ? defaultStreakInsuranceState : insuranceState;
  const nextStreakLabel = nextStreak ? `${nextStreak - currentStreak} to bonus` : 'Top perch reached!';
  const unlockLabel = nextMilestone
    ? nextUnlock && !nextUnlock.comingSoon && !isNextThemeAlreadyUnlocked
      ? `${formatNumber(remainingMilestoneBirds)} to unlock ${nextUnlock.milestoneBadge} Badge and ${nextUnlock.themeName} Theme`
      : `${formatNumber(remainingMilestoneBirds)} to unlock ${milestones.find((milestone) => milestone.value === nextMilestone)?.badge} Badge`
    : 'All live themes unlocked';
  const canShowInsurance = effectiveInsuranceState.active || currentStreak >= STREAK_INSURANCE_MIN_STREAK;
  const insuranceError = insuranceErrorState?.interactionKey === interactionKey ? insuranceErrorState.message : null;
  const pulseTarget = activePersonalBestTarget;
  const hasClearedPersonalBest = typeof pulseTarget === 'number' && currentStreak > pulseTarget;
  const personalBestDistance = typeof pulseTarget === 'number' ? pulseTarget - currentStreak : null;
  const shouldPulsePersonalBest = typeof pulseTarget === 'number'
    && typeof personalBestDistance === 'number'
    && pulseTarget > 10
    && personalBestDistance <= 5
    && personalBestDistance >= 0
    && !hasClearedPersonalBest;
  const personalBestPulseClass = !shouldPulsePersonalBest
    ? ''
    : personalBestDistance === 0
      ? 'personal-best-pulse personal-best-pulse-critical'
      : personalBestDistance <= 1
        ? 'personal-best-pulse personal-best-pulse-hot'
        : personalBestDistance <= 3
          ? 'personal-best-pulse personal-best-pulse-warm'
          : 'personal-best-pulse personal-best-pulse-calm';

  useEffect(() => {
    return () => {
      setFloatingSeeds(null);
    };
  }, []);

  useEffect(() => {
    if (!insuranceExpired) {
      return;
    }

    clearStreakInsurance();
  }, [insuranceExpired]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        setInsuranceErrorState(null);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    if (!supabaseReady) {
      return;
    }

    const supabase = getSupabaseBrowserClient();
    let active = true;

    const refreshSession = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (active) {
          setIsSignedIn(Boolean(data.session?.user));
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
  }, [supabaseReady]);

  useEffect(() => {
    if (!roundAnimation || handledRoundAnimationIdRef.current === roundAnimation.id) {
      return;
    }

    handledRoundAnimationIdRef.current = roundAnimation.id;

    if (roundAnimation.result.seedsEarned > 0) {
      const showSeedIndicatorId = window.setTimeout(() => {
        setFloatingSeeds({
          id: roundAnimation.id,
          amount: roundAnimation.result.seedsEarned,
        });
      }, STAT_ANIMATION_DELAY_MS);
      const clearSeedIndicatorId = window.setTimeout(() => {
        setFloatingSeeds((current) => (current?.id === roundAnimation.id ? null : current));
      }, STAT_ANIMATION_DELAY_MS + SEED_INDICATOR_DURATION_MS);

      return () => {
        window.clearTimeout(showSeedIndicatorId);
        window.clearTimeout(clearSeedIndicatorId);
      };
    } else {
      setFloatingSeeds(null);
    }
  }, [roundAnimation]);

  if (!storedStats) {
    return null;
  }

  return (
    <div className="w-full max-w-md mx-auto px-4">
      <div className="rounded-xl bg-[var(--color-surface)] border border-[var(--color-surface-border)] p-3 backdrop-blur-sm text-xs">
        <div className="grid grid-cols-4 gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="relative">
              <Flame
                size={18}
                className={currentStreak > 0 ? 'text-[var(--color-streak)]' : 'text-[var(--color-muted)]'}
                fill={currentStreak > 0 ? 'currentColor' : 'none'}
              />
              {currentStreak >= 5 ? (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[var(--color-streak)] animate-ping" />
              ) : null}
            </div>
            <div className="flex min-w-0 flex-col">
              <span className="font-bold text-sm leading-none">{formatNumber(currentStreak)}</span>
              <span className="text-[var(--color-muted)] text-[0.6rem] leading-tight truncate">{nextStreakLabel}</span>
            </div>
          </div>

          <div className="relative flex items-center gap-2 min-w-0">
            <SeedIcon size={18} color="var(--color-secondary)" />
            <div className="flex min-w-0 flex-col">
              <span className="font-bold text-sm leading-none">{formatNumber(seeds)}</span>
              <span className="text-[var(--color-muted)] text-[0.6rem] leading-tight">seeds</span>
            </div>

            <AnimatePresence>
              {floatingSeeds ? (
                <motion.div
                  key={floatingSeeds.id}
                  initial={{ opacity: 0, y: 8, scale: 0.92 }}
                  animate={{ opacity: 1, y: -24, scale: 1 }}
                  exit={{ opacity: 0, y: -34, scale: 0.96 }}
                  transition={{ duration: 1.15, ease: 'easeOut' }}
                  className="pointer-events-none absolute -right-1 -top-1 flex h-8 min-w-8 items-center justify-center rounded-full border border-[var(--color-surface-border)] bg-[var(--color-secondary)] px-2 text-[0.68rem] font-bold text-[var(--color-on-secondary)] shadow-[var(--shadow-button)] md:right-0"
                >
                  +{formatNumber(floatingSeeds.amount)}
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>

          <div className="flex items-center gap-2 min-w-0">
            <Target size={16} className="text-[var(--color-muted)]" />
            <div className="flex min-w-0 flex-col">
              <span className="font-bold text-sm leading-none">{accuracy}%</span>
              <span className="text-[var(--color-muted)] text-[0.6rem] leading-tight">acc</span>
            </div>
          </div>

          <div className="flex items-center gap-2 min-w-0" data-testid="best-streak-stat">
            <Zap
              size={16}
              className={`text-[var(--color-secondary)] ${personalBestPulseClass}`.trim()}
              fill="currentColor"
            />
            <div className="flex min-w-0 flex-col">
              <span
                data-testid="best-streak-value"
                className={`font-bold text-sm leading-none ${personalBestPulseClass}`.trim()}
              >
                {formatNumber(bestStreak)}
              </span>
              <span
                data-testid="best-streak-label"
                className={`text-[var(--color-muted)] text-[0.6rem] leading-tight ${personalBestPulseClass}`.trim()}
              >
                best
              </span>
            </div>
          </div>
        </div>

        <div className="mt-3 flex items-start gap-2">
          <Trophy size={16} className="mt-0.5 shrink-0 text-[var(--color-secondary)]" />
          <div className="min-w-0 flex-1">
            <div className="h-1.5 overflow-hidden rounded-full bg-[var(--color-surface-border)]">
              <div
                className="h-full rounded-full bg-[var(--color-secondary)] transition-all duration-500 ease-out"
                style={{ width: `${Math.min(unlockProgress, 100)}%` }}
              />
            </div>
            <p className="mt-2 text-[0.65rem] leading-tight text-[var(--color-muted)]">{unlockLabel}</p>
          </div>
        </div>

        {canShowInsurance ? (
          <div className="mt-3 rounded-lg border border-[var(--color-surface-border)] bg-[var(--color-surface-hover)] p-2.5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
                  Streak Insurance
                </p>
                <p className="mt-1 text-[0.7rem] leading-snug text-[var(--color-muted)]">
                  {effectiveInsuranceState.active
                    ? 'Armed for the next guess. If you miss it, your streak stays alive.'
                    : insuranceShortfall > 0
                      ? `Bank ${formatNumber(insuranceShortfall)} more seeds to protect your next guess.`
                      : `Protect your next guess for ${formatNumber(insuranceCost)} seeds.`}
                </p>
              </div>

              <button
                onClick={async () => {
                  if (isPurchasingInsurance) {
                    return;
                  }

                  setIsPurchasingInsurance(true);
                  setInsuranceErrorState(null);
                  try {
                    const result = isSignedIn
                      ? await (async () => {
                          try {
                            await flushQueuedProgressEventsForSignedInUser();
                            const response = await purchaseStreakInsuranceDirect();
                            writeBirdScore(mergeNonRoundRemoteScore(response.progressSummary));
                            writeStreakInsuranceState(response.insuranceState);
                            return { ok: true, state: response.insuranceState };
                          } catch (error) {
                            return {
                              ok: false,
                              error: error instanceof Error ? error.message : 'Unable to buy streak insurance.',
                              state: effectiveInsuranceState,
                            };
                          }
                        })()
                      : purchaseStreakInsurance();

                    if (!result.ok) {
                      setInsuranceErrorState({
                        interactionKey,
                        message: result.error ?? 'Unable to buy streak insurance.',
                      });
                      return;
                    }

                    setInsuranceErrorState(null);
                    track('streak_insurance_purchased', {
                      cost: result.state.cost,
                      purchased_at_streak: result.state.purchasedAtStreak,
                    });
                  } finally {
                    setIsPurchasingInsurance(false);
                  }
                }}
                disabled={isPurchasingInsurance || effectiveInsuranceState.active || seeds < insuranceCost}
                className={`rounded-full px-3 py-1.5 text-[0.7rem] font-semibold transition ${
                  isPurchasingInsurance || effectiveInsuranceState.active || seeds < insuranceCost
                    ? 'bg-[var(--color-surface-border)] text-[var(--color-muted)]'
                    : 'bg-[var(--color-secondary)] text-[var(--color-on-secondary)]'
                }`}
              >
                <span className="inline-flex items-center gap-1.5">
                  {isPurchasingInsurance ? <LoaderCircle size={12} className="animate-spin" aria-hidden="true" /> : null}
                  {isPurchasingInsurance
                    ? 'Protecting...'
                    : effectiveInsuranceState.active
                      ? 'Protected'
                      : seeds < insuranceCost
                        ? `Need ${formatNumber(insuranceShortfall)} more`
                        : 'Protect Streak'}
                </span>
              </button>
            </div>

            {insuranceError ? (
              <p className="mt-2 text-[0.65rem] text-[var(--color-error)]">{insuranceError}</p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
