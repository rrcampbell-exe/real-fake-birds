'use client';

import Link from 'next/link';
import { ArrowRight, CalendarDays, X } from 'lucide-react';
import { useStoredJson, notifyStoredValueChanged } from '@/hooks/useStoredValue';
import { useDailyChallengeState } from '@/hooks/useDailyChallengeState';
import { useSound } from '@/hooks/useSound';

const DAILY_PROMPT_STORAGE_KEY = 'dailyPromptSeenDate';

function markPromptSeen(date: string) {
  localStorage.setItem(DAILY_PROMPT_STORAGE_KEY, JSON.stringify(date));
  notifyStoredValueChanged(DAILY_PROMPT_STORAGE_KEY);
}

export default function DailyPrompt() {
  const { state, isComplete } = useDailyChallengeState();
  const seenDate = useStoredJson<string | null>(DAILY_PROMPT_STORAGE_KEY, null);
  const { play } = useSound();

  if (isComplete || seenDate === state.date) {
    return null;
  }

  return (
    <section className="w-full max-w-md px-4">
      <div className="rounded-2xl border border-[var(--color-surface-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-card)]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full bg-[var(--color-surface-hover)] px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
              <CalendarDays size={12} />
              Daily nudge
            </div>
            <h2 className="mt-3 font-[family-name:var(--font-display)] text-lg font-semibold leading-tight">
              Today&apos;s challenge is ready.
            </h2>
            <p className="mt-1 text-sm leading-6 text-[var(--color-muted)]">
              Knock out the daily run first, then come back to classic play if you want more birds.
            </p>
          </div>

          <button
            type="button"
            aria-label="Dismiss daily prompt"
            onClick={() => {
              play('navTap');
              markPromptSeen(state.date);
            }}
            className="rounded-full border border-[var(--color-surface-border)] p-2 text-[var(--color-muted)] transition hover:bg-[var(--color-surface-hover)]"
          >
            <X size={14} />
          </button>
        </div>

        <div className="mt-4 flex justify-end">
          <Link
            href="/daily"
            onClick={() => {
              play('navTap');
              markPromptSeen(state.date);
            }}
            className="inline-flex items-center gap-2 rounded-full bg-[var(--color-secondary)] px-4 py-2 text-sm font-semibold text-[var(--color-on-secondary)] transition hover:brightness-110"
          >
            Go to Daily
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </section>
  );
}