'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, MapPin } from 'lucide-react';
import type { BirdJournalEntry } from '@/types';
import { REVEAL_BIRD_COST } from '@/lib/constants/hints';

interface JournalBirdCardProps {
  entry: BirdJournalEntry;
  isMaskedForCurrentRound: boolean;
  canAffordReveal: boolean;
  onRevealForCurrentRound: (birdKey: string) => void;
}

function formatLastSeen(date: string): string {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) {
    return 'Unknown';
  }

  return new Intl.DateTimeFormat(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(parsed);
}

export default function BirdCard({ entry, isMaskedForCurrentRound, canAffordReveal, onRevealForCurrentRound }: JournalBirdCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const accuracy = entry.seenCount > 0
    ? Math.floor((entry.correctCount / entry.seenCount) * 100)
    : 0;

  return (
    <article className="rounded-2xl border border-[var(--color-surface-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-card)] transition hover:bg-[var(--color-surface-hover)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-[family-name:var(--font-display)] text-lg font-bold leading-tight text-[var(--color-text)]">
              {entry.birdName}
            </h3>
            {isMaskedForCurrentRound ? (
              <button
                type="button"
                onClick={() => onRevealForCurrentRound(entry.birdKey)}
                disabled={!canAffordReveal}
                className="rounded-full bg-[var(--color-surface-hover)] px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-[var(--color-text)] transition enabled:cursor-pointer enabled:hover:bg-[var(--color-surface)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                Reveal for {REVEAL_BIRD_COST} seeds
              </button>
            ) : (
              <span
                className={`rounded-full px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.12em] ${
                  entry.isReal
                  ? 'bg-[color-mix(in_srgb,var(--color-success)_18%,transparent)] text-[var(--color-success)]'
                  : 'bg-[color-mix(in_srgb,var(--color-error)_18%,transparent)] text-[var(--color-error)]'
                }`}
              >
                {entry.isReal ? 'Real' : 'Fake'}
              </span>
            )}
          </div>
          <p className="mt-2 text-sm text-[var(--color-muted)]">
            Seen {isMaskedForCurrentRound ? '??? times' : `${entry.seenCount} ${entry.seenCount === 1 ? 'time' : 'times'}`}
          </p>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            Last seen on {isMaskedForCurrentRound ? '???' : formatLastSeen(entry.lastSeenAt)}
          </p>
        </div>

        {!isMaskedForCurrentRound ? (
          <button
            type="button"
            onClick={() => setIsExpanded((current) => !current)}
            className="inline-flex items-center gap-1 rounded-full border border-[var(--color-surface-border)] bg-[var(--color-surface-hover)] px-3 py-1 text-xs font-semibold text-[var(--color-text)] transition hover:bg-[var(--color-surface)]"
            aria-expanded={isExpanded}
          >
            Details
            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        ) : null}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-[var(--color-surface-border)] bg-[var(--color-surface-hover)] p-3">
          <p className="text-[0.65rem] uppercase tracking-[0.14em] text-[var(--color-muted)]">Accuracy</p>
          <p className="mt-2 font-[family-name:var(--font-display)] text-xl font-bold text-[var(--color-text)]">{isMaskedForCurrentRound ? '???' : `${accuracy}%`}</p>
        </div>
        <div className="rounded-xl border border-[var(--color-surface-border)] bg-[var(--color-surface-hover)] p-3">
          <p className="text-[0.65rem] uppercase tracking-[0.14em] text-[var(--color-muted)]">Correct</p>
          <p className="mt-2 font-[family-name:var(--font-display)] text-xl font-bold text-[var(--color-text)]">{isMaskedForCurrentRound ? '???' : entry.correctCount}</p>
        </div>
      </div>

      {isExpanded && !isMaskedForCurrentRound ? (
        <div className="mt-4 space-y-3 rounded-xl border border-[var(--color-surface-border)] bg-[var(--color-surface-hover)] p-4">
          {entry.metadata.regionLabel ? (
            <p className="flex items-center gap-2 text-sm text-[var(--color-text)]">
              <MapPin size={14} className="text-[var(--color-muted)]" />
              {entry.metadata.regionLabel}
            </p>
          ) : null}

          {entry.metadata.sciName ? (
            <p className="text-sm italic text-[var(--color-muted)]">{entry.metadata.sciName}</p>
          ) : null}

          {entry.metadata.fact ? (
            <p className="text-sm leading-6 text-[var(--color-text)]">{entry.metadata.fact}</p>
          ) : (
            <p className="text-sm leading-6 text-[var(--color-muted)]">
              No field notes saved for this bird yet.
            </p>
          )}
        </div>
      ) : null}
    </article>
  );
}
