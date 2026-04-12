'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, MapPin } from 'lucide-react';
import type { BirdJournalEntry } from '@/types';
import { REVEAL_BIRD_COST } from '@/lib/constants/hints';

interface JournalBirdCardProps {
  entry: BirdJournalEntry;
  isMaskedForCurrentRound: boolean;
  canAffordReveal: boolean;
  onRevealForCurrentRound: (birdKey: string) => void;
  onOpenDetails?: (birdKey: string) => void;
  isLinkedTarget?: boolean;
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

interface JournalBirdImageProps {
  birdName: string;
  imageUrl: string;
}

function JournalBirdImage({ birdName, imageUrl }: JournalBirdImageProps) {
  const [imageStatus, setImageStatus] = useState<'loading' | 'loaded' | 'error'>('loading');

  return (
    <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-[var(--color-surface-border)] bg-[var(--color-surface)]">
      {imageStatus === 'loading' ? (
        <div
          aria-hidden="true"
          data-testid="journal-image-shimmer"
          className="absolute inset-0 bg-[linear-gradient(110deg,var(--color-surface-hover)_8%,color-mix(in_srgb,var(--color-surface)_65%,white_35%)_18%,var(--color-surface-hover)_33%)] bg-[length:200%_100%] animate-[shimmer_1.25s_linear_infinite]"
        />
      ) : null}
      {imageStatus === 'error' ? (
        <div className="absolute inset-0 flex items-center justify-center bg-[var(--color-surface-hover)] px-4 text-center text-sm font-medium text-[var(--color-muted)]">
          Image unavailable
        </div>
      ) : null}
      <Image
        src={imageUrl}
        alt={birdName}
        fill
        sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
        className={`object-cover object-center transition-opacity duration-200 ${imageStatus === 'loaded' ? 'opacity-100' : 'opacity-0'}`}
        loading="lazy"
        unoptimized
        onLoad={() => setImageStatus('loaded')}
        onError={() => setImageStatus('error')}
      />
    </div>
  );
}

export default function BirdCard({ entry, isMaskedForCurrentRound, canAffordReveal, onRevealForCurrentRound, onOpenDetails, isLinkedTarget = false }: JournalBirdCardProps) {
  const [isExpanded, setIsExpanded] = useState(isLinkedTarget);
  const hasAutoOpenedRef = useRef(false);
  const accuracy = entry.seenCount > 0
    ? Math.floor((entry.correctCount / entry.seenCount) * 100)
    : 0;
  const summaryText = entry.metadata.summary ?? entry.metadata.fact;
  const hasImage = Boolean(entry.metadata.imageUrl);
  const expanded = isExpanded;
  const showExpandedArticleHeader = expanded && !isMaskedForCurrentRound && hasImage;

  useEffect(() => {
    if (!isLinkedTarget || hasAutoOpenedRef.current) {
      return;
    }

    const timerId = window.setTimeout(() => {
      hasAutoOpenedRef.current = true;
      setIsExpanded(true);
      if (!isMaskedForCurrentRound) {
        onOpenDetails?.(entry.birdKey);
      }
    }, 0);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [entry.birdKey, isMaskedForCurrentRound, isLinkedTarget, onOpenDetails]);

  const handleToggleExpanded = () => {
    const nextExpanded = !isExpanded;
    setIsExpanded(nextExpanded);
    if (nextExpanded && !isMaskedForCurrentRound) {
      onOpenDetails?.(entry.birdKey);
    }
  };

  return (
    <article id={entry.birdKey} className="scroll-mt-28 rounded-2xl border border-[var(--color-surface-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-card)] transition hover:bg-[var(--color-surface-hover)]">
      <div className="flex items-start justify-between gap-3">
        {!showExpandedArticleHeader ? (
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
              {isMaskedForCurrentRound
                ? 'Seen ??? times'
                : `Seen ${entry.seenCount} ${entry.seenCount === 1 ? 'time' : 'times'} • Last seen ${formatLastSeen(entry.lastSeenAt)}`}
            </p>
          </div>
        ) : <div className="min-w-0" />}

        {!isMaskedForCurrentRound ? (
          <button
            type="button"
            onClick={handleToggleExpanded}
            className="inline-flex items-center gap-1 rounded-full border border-[var(--color-surface-border)] bg-[var(--color-surface-hover)] px-3 py-1 text-xs font-semibold text-[var(--color-text)] transition hover:bg-[var(--color-surface)]"
            aria-expanded={expanded}
          >
            Details
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        ) : null}
      </div>

      {expanded && !isMaskedForCurrentRound ? (
        <div className="mt-4 space-y-3">
          {hasImage ? (
            <JournalBirdImage key={entry.metadata.imageUrl} birdName={entry.birdName} imageUrl={entry.metadata.imageUrl ?? ''} />
          ) : null}

          {showExpandedArticleHeader ? (
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <h3 className="font-[family-name:var(--font-display)] text-lg font-bold leading-tight text-[var(--color-text)]">
                  {entry.birdName}
                </h3>
                <span
                  className={`rounded-full px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.12em] ${
                    entry.isReal
                    ? 'bg-[color-mix(in_srgb,var(--color-success)_18%,transparent)] text-[var(--color-success)]'
                    : 'bg-[color-mix(in_srgb,var(--color-error)_18%,transparent)] text-[var(--color-error)]'
                  }`}
                >
                  {entry.isReal ? 'Real' : 'Fake'}
                </span>
              </div>
              {entry.metadata.sciName ? (
                <p className="text-[0.95rem] italic leading-tight text-[var(--color-muted)]">{entry.metadata.sciName}</p>
              ) : null}
              <p className="text-sm leading-tight text-[var(--color-muted)]">
                Seen {entry.seenCount} {entry.seenCount === 1 ? 'time' : 'times'} • Last seen {formatLastSeen(entry.lastSeenAt)}
              </p>
              {entry.metadata.regionLabel ? (
                <p className="flex items-center gap-1.5 text-sm leading-tight text-[var(--color-text)]">
                  <MapPin size={13} className="text-[var(--color-muted)]" />
                  {entry.metadata.regionLabel}
                </p>
              ) : null}
            </div>
          ) : null}

          {summaryText ? (
            <p className="text-sm leading-6 text-[var(--color-text)]">{summaryText}</p>
          ) : (
            <p className="text-sm leading-6 text-[var(--color-muted)]">
              No field notes saved for this bird yet.
            </p>
          )}

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="rounded-xl border border-[var(--color-surface-border)] bg-[var(--color-surface)] p-3">
              <p className="text-[0.65rem] uppercase tracking-[0.14em] text-[var(--color-muted)]">Accuracy</p>
              <p className="mt-2 font-[family-name:var(--font-display)] text-xl font-bold text-[var(--color-text)]">{`${accuracy}%`}</p>
            </div>
            <div className="rounded-xl border border-[var(--color-surface-border)] bg-[var(--color-surface)] p-3">
              <p className="text-[0.65rem] uppercase tracking-[0.14em] text-[var(--color-muted)]">Correct</p>
              <p className="mt-2 font-[family-name:var(--font-display)] text-xl font-bold text-[var(--color-text)]">{entry.correctCount}</p>
            </div>
          </div>
        </div>
      ) : !isMaskedForCurrentRound ? (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-[var(--color-surface-border)] bg-[var(--color-surface-hover)] p-3">
            <p className="text-[0.65rem] uppercase tracking-[0.14em] text-[var(--color-muted)]">Accuracy</p>
            <p className="mt-2 font-[family-name:var(--font-display)] text-xl font-bold text-[var(--color-text)]">{`${accuracy}%`}</p>
          </div>
          <div className="rounded-xl border border-[var(--color-surface-border)] bg-[var(--color-surface-hover)] p-3">
            <p className="text-[0.65rem] uppercase tracking-[0.14em] text-[var(--color-muted)]">Correct</p>
            <p className="mt-2 font-[family-name:var(--font-display)] text-xl font-bold text-[var(--color-text)]">{entry.correctCount}</p>
          </div>
        </div>
      ) : null}
    </article>
  );
}
