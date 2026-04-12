'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { Award, Bird, Worm, Trophy } from 'lucide-react';
import { useAccountState } from '@/components/account/AccountStateProvider';
import { useStoredJson } from '@/hooks/useStoredValue';
import { formatNumber } from '@/lib/utils/number-format';
import {
  markWeeklyRecapWeekSeen,
  WEEKLY_RECAP_LAST_SEEN_WEEK_STORAGE_KEY,
} from '@/lib/utils/weekly-leaderboard';

type RecapPresentation = {
  title: string;
  detail: string;
  accentLabel: string;
  icon: typeof Trophy;
};

function buildRecapPresentation(options: {
  challengeName: string;
  participated: boolean;
  qualified: boolean;
  rank: number | null;
  rewardSeeds: number;
}): RecapPresentation {
  const rewardLine = options.rewardSeeds > 0
    ? ` You earned +${formatNumber(options.rewardSeeds)} seeds.`
    : '';
  const inlineRewardLine = rewardLine.replace(' You earned', ' you earned');

  if (!options.participated) {
    return {
      title: 'Last Week Flew By',
      detail: `You missed last week's challenge, but the ${options.challengeName} challenge is live now. Puff up those feathers and give it your best shot!`,
      accentLabel: 'Fresh Start',
      icon: Bird,
    };
  }

  if (!options.qualified) {
    return {
      title: 'So Close Last Week',
      detail: `You got some rounds in, but didn't qualify for the leaderboard. Still,${inlineRewardLine} The ${options.challengeName} is live now. Time to spread your wings and aim for the leaderboard this week in the ${options.challengeName} challenge!`,
      accentLabel: 'Keep Climbing',
      icon: Worm,
    };
  }

  if (options.rank === 1) {
    return {
      title: 'Weekly Champion!',
      detail: `Congratulations! You won last week's challenge and finished in 1st place.${rewardLine} The new ${options.challengeName} challenge is live now. Can you defend your title this week?`,
      accentLabel: '1st Place',
      icon: Trophy,
    };
  }

  if (options.rank === 2) {
    return {
      title: 'Second Place Finish!',
      detail: `You took 2nd place last week.${rewardLine} The new ${options.challengeName} challenge is live now. Can you aim for the top spot this week?`,
      accentLabel: '2nd Place',
      icon: Award,
    };
  }

  if (options.rank === 3) {
    return {
      title: 'Podium Placer!',
      detail: `You landed in 3rd place last week.${rewardLine} The new ${options.challengeName} challenge is live now. Can you soar higher on the leaderboard this week?`,
      accentLabel: '3rd Place',
      icon: Award,
    };
  }

  if (typeof options.rank === 'number' && options.rank <= 10) {
    return {
      title: 'Top 10 Finish!',
      detail: `You finished #${options.rank} last week.${rewardLine} The new ${options.challengeName} challenge is live now. Can you beak your way into the top 3 this week?`,
      accentLabel: 'Top 10',
      icon: Trophy,
    };
  }

  return {
    title: 'Weekly Challenge Complete',
    detail: `You qualified for last week's challenge and finished #${options.rank ?? '??'}.${rewardLine}`,
    accentLabel: 'Qualified',
    icon: Award,
  };
}

export default function WeeklyChallengeRecapModal() {
  const { isBooting, isSignedIn, weeklyOverview } = useAccountState();
  const lastSeenRecapWeek = useStoredJson<string | null>(WEEKLY_RECAP_LAST_SEEN_WEEK_STORAGE_KEY, null);
  const [dismissedWeek, setDismissedWeek] = useState<string | null>(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  const previousRecap = weeklyOverview?.previousRecap ?? null;
  const previousRecapWeek = previousRecap?.weekStart ?? null;

  const presentation = useMemo(() => {
    if (!weeklyOverview || !previousRecap) {
      return null;
    }

    return buildRecapPresentation({
      challengeName: weeklyOverview.challenge.name,
      participated: previousRecap.participated,
      qualified: previousRecap.qualified,
      rank: previousRecap.rank,
      rewardSeeds: previousRecap.rewardSeeds,
    });
  }, [previousRecap, weeklyOverview]);

  if (
    !isSignedIn
    || isBooting
    || !previousRecap
    || !presentation
    || !previousRecapWeek
    || lastSeenRecapWeek === previousRecapWeek
    || dismissedWeek === previousRecapWeek
  ) {
    return null;
  }

  const RecapIcon = presentation.icon;

  const handleDismiss = () => {
    markWeeklyRecapWeekSeen(previousRecapWeek);
    setDismissedWeek(previousRecapWeek);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[90] flex items-center justify-center bg-black/55 px-4 py-6 backdrop-blur-sm"
      >
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.98 }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.24, ease: 'easeOut' }}
          className="w-full max-w-md rounded-[2rem] border border-[var(--color-surface-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="weekly-recap-title"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[var(--color-secondary)]">
                Weekly Challenge Recap
              </p>
              <h2 id="weekly-recap-title" className="mt-2 font-[family-name:var(--font-display)] text-2xl font-bold leading-tight text-[var(--color-text)]">
                {presentation.title}
              </h2>
            </div>
            <div className="rounded-full border border-[var(--color-surface-border)] bg-[var(--color-surface-hover)] p-3 text-[var(--color-secondary)]">
              <RecapIcon size={20} />
            </div>
          </div>

          <div className="mt-4 inline-flex rounded-full border border-[var(--color-secondary)]/30 bg-[color-mix(in_srgb,var(--color-secondary)_12%,var(--color-surface))] px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-[var(--color-secondary)]">
            {presentation.accentLabel}
          </div>

          <p className="mt-4 text-sm leading-6 text-[var(--color-text)]">
            {presentation.detail}
          </p>

          <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">
            This week&rsquo;s challenge is ready whenever you are.
          </p>

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={handleDismiss}
              className="inline-flex items-center justify-center rounded-full border border-[var(--color-surface-border)] bg-[var(--color-surface-hover)] px-4 py-2.5 text-sm font-semibold text-[var(--color-text)]"
            >
              Close
            </button>
            <Link
              href="/leaderboard"
              onClick={handleDismiss}
              className="inline-flex items-center justify-center rounded-full bg-[var(--color-secondary)] px-4 py-2.5 text-sm font-semibold text-[var(--color-on-secondary)]"
            >
              See This Week&rsquo;s Challenge
            </Link>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}