'use client';

import Link from 'next/link';
import { ArrowRight, CalendarDays, Flame, Trophy } from 'lucide-react';
import { DAILY_CHALLENGE_CONFIG } from '@/lib/constants/daily-challenge';
import { useDailyChallengeState } from '@/hooks/useDailyChallengeState';

interface DailyChallengeCardProps {
  showAction?: boolean;
}

export default function DailyChallengeCard({ showAction = true }: DailyChallengeCardProps) {
  const { state, challengeStreak, roundsRemaining, isComplete } = useDailyChallengeState();

  return (
    <section className="w-full max-w-md px-4">
      <div className="relative overflow-hidden rounded-2xl border border-[var(--color-surface-border)] bg-[linear-gradient(135deg,var(--color-surface)_0%,color-mix(in_srgb,var(--color-secondary)_12%,var(--color-surface))_100%)] p-5 shadow-[var(--shadow-card)]">
        <div className="absolute inset-y-0 right-0 w-28 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.22),transparent_65%)]" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full bg-[var(--color-surface)]/85 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">
            <CalendarDays size={12} />
            Daily Challenge
          </div>

          <div className="mt-4 flex items-start justify-between gap-4">
            <div>
              <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold leading-tight">
                {isComplete ? 'Come back tomorrow' : 'One fresh flock per day'}
              </h2>
              <p className="mt-2 max-w-xs text-sm leading-6 text-[var(--color-muted)]">
                {isComplete
                  ? `You finished today's ${DAILY_CHALLENGE_CONFIG.roundCount}-round challenge with ${state.correctAnswers} correct.`
                  : `${DAILY_CHALLENGE_CONFIG.roundCount} rounds, bonus seeds, and a reason to check in every day.`}
              </p>
            </div>

            <div className="grid gap-2 text-right text-[0.7rem] font-semibold text-[var(--color-muted)]">
              <div className="inline-flex items-center justify-end gap-1 rounded-full bg-[var(--color-surface)]/85 px-2 py-1">
                <Trophy size={12} />
                {state.correctAnswers}/{DAILY_CHALLENGE_CONFIG.roundCount}
              </div>
              <div className="inline-flex items-center justify-end gap-1 rounded-full bg-[var(--color-surface)]/85 px-2 py-1">
                <Flame size={12} />
                {challengeStreak} day streak
              </div>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between gap-4">
            <p className="text-[0.75rem] font-semibold text-[var(--color-muted)]">
              {isComplete ? 'Locked until tomorrow' : `${roundsRemaining} rounds waiting`}
            </p>
            {showAction ? (
              <Link
                href="/daily"
                className="inline-flex items-center gap-2 rounded-full bg-[var(--color-secondary)] px-4 py-2 text-sm font-semibold text-[var(--color-on-secondary)] transition hover:brightness-110"
              >
                {isComplete ? 'View summary' : 'Play daily'}
                <ArrowRight size={16} />
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}