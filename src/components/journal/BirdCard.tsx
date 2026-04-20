'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { Bird, Birdhouse, ChevronDown, ChevronUp, MapPin, Sparkles } from 'lucide-react';
import BirdhouseToggleButton from '@/components/birdhouse/BirdhouseToggleButton';
import SeedIcon from '@/components/icons/SeedIcon';
import type { BirdJournalEntry, ImageAttribution } from '@/types';
import { JOURNAL_FAKE_REVEAL_COST } from '@/lib/constants/hints';
import { useFirstAppearance } from '@/hooks/useFirstAppearance';
import { formatBirdName } from '@/lib/utils/format-bird-name';

interface JournalBirdCardProps {
  entry: BirdJournalEntry;
  canAffordFakeImageReveal: boolean;
  onRevealFakeImage: (birdKey: string) => void;
  onOpenDetails?: (birdKey: string) => void;
  onRequestBirdhouseSwap?: (payload: { birdKey: string; birdName: string; isReal: boolean }) => void;
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
  attribution?: ImageAttribution;
}

function JournalBirdImage({ birdName, imageUrl, attribution }: JournalBirdImageProps) {
  const [imageStatus, setImageStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [isUnavailable, setIsUnavailable] = useState(false);
  const displayBirdName = formatBirdName(birdName);

  if (isUnavailable) {
    return null;
  }

  return (
    <div>
      <div className="relative overflow-hidden rounded-2xl border border-[var(--color-surface-border)] bg-[var(--color-surface)]">
        {imageStatus === 'loading' ? (
          <div
            aria-hidden="true"
            data-testid="journal-image-shimmer"
            className="absolute inset-0 bg-[linear-gradient(110deg,var(--color-surface-hover)_8%,color-mix(in_srgb,var(--color-surface)_65%,white_35%)_18%,var(--color-surface-hover)_33%)] bg-[length:200%_100%] animate-[shimmer_1.25s_linear_infinite]"
          />
        ) : null}

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt={displayBirdName}
          className={`block h-auto w-full transition-opacity duration-200 ${imageStatus === 'loaded' ? 'opacity-100' : 'opacity-0'}`}
          loading="lazy"
          onLoad={() => setImageStatus('loaded')}
          onError={() => {
            setImageStatus('error');
            setIsUnavailable(true);
          }}
        />
      </div>
      {attribution?.artist ? (
        <p className="mt-1 truncate text-[0.6rem] leading-tight text-[var(--color-muted)]">
          Photo: {attribution.artist}
          {attribution.license ? (
            <>
              {' / '}
              {attribution.licenseUrl ? (
                <a
                  href={attribution.licenseUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2 hover:text-[var(--color-text)]"
                >
                  {attribution.license}
                </a>
              ) : (
                attribution.license
              )}
            </>
          ) : null}
        </p>
      ) : null}
    </div>
  );
}

function LockedBirdhouseNotice({ detail }: { detail: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className="rounded-2xl border border-[var(--color-surface-border)] bg-[var(--color-surface)] px-4 py-3 shadow-[var(--shadow-card)]"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary-light)] text-[var(--color-secondary)]">
          <Birdhouse size={15} strokeWidth={2.2} />
        </div>
        <div className="min-w-0">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-[var(--color-secondary)]">
            Reveal Required
          </p>
          <p className="mt-1 text-sm font-medium leading-5 text-[var(--color-text)]">{detail}</p>
        </div>
      </div>
    </motion.div>
  );
}

function HiddenFakeBirdRevealButton({
  canReveal,
  onReveal,
}: {
  canReveal: boolean;
  onReveal: () => void;
}) {
  const isFirst = useFirstAppearance('journal_fake_reveal');
  return (
    <button
      type="button"
      aria-label="Reveal hidden fake bird image"
      title={`Reveal this fake bird for ${JOURNAL_FAKE_REVEAL_COST} seeds`}
      onClick={onReveal}
      disabled={!canReveal}
      className="group block w-full cursor-pointer disabled:pointer-events-none disabled:opacity-40"
    >
      <div className={`relative aspect-[5/4] overflow-hidden rounded-2xl border border-[var(--color-surface-border)] bg-[var(--color-surface-hover)] transition-colors duration-150 group-hover:bg-[var(--color-surface)]${isFirst ? ' feature-unlock-glow' : ''}`}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,color-mix(in_srgb,var(--color-secondary)_12%,transparent),transparent_52%)]" />
        <div className="pointer-events-none absolute right-3 top-3 z-10">
          <span
            aria-label={`Reveal costs ${JOURNAL_FAKE_REVEAL_COST} seeds`}
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-surface-border)] bg-[color-mix(in_srgb,var(--color-surface)_94%,white_6%)] px-2.5 py-1 text-[0.62rem] font-bold text-[var(--color-text)] shadow-[var(--shadow-button)]"
          >
            <span>{JOURNAL_FAKE_REVEAL_COST}</span>
            <SeedIcon size={13} className="shrink-0" />
          </span>
        </div>
        <div className="relative z-10 flex h-full items-center justify-center text-[var(--color-muted)] transition-transform duration-150 group-hover:scale-[1.03] group-hover:text-[var(--color-text)]">
          <Bird className="h-20 w-20 md:h-16 md:w-16" strokeWidth={1.8} />
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-3 z-10 flex justify-center">
          <span className="inline-flex max-w-[calc(100%-1rem)] items-center gap-1.5 whitespace-nowrap rounded-full border border-[var(--color-surface-border)] bg-[color-mix(in_srgb,var(--color-surface)_96%,white_4%)] px-3 py-1 text-[0.65rem] font-semibold text-[var(--color-text)] shadow-[var(--shadow-button)] md:text-[0.62rem]">
            <Sparkles size={12} strokeWidth={2.3} />
            <span className="sm:hidden">Tap to Reveal</span>
            <span className="hidden sm:inline">Click to Reveal</span>
          </span>
        </div>
      </div>
    </button>
  );
}

export default function BirdCard({
  entry,
  canAffordFakeImageReveal,
  onRevealFakeImage,
  onOpenDetails,
  onRequestBirdhouseSwap,
  isLinkedTarget = false,
}: JournalBirdCardProps) {
  const [isExpanded, setIsExpanded] = useState(isLinkedTarget);
  const [lockedBirdhouseToast, setLockedBirdhouseToast] = useState<string | null>(null);
  const hasAutoOpenedRef = useRef(false);
  const accuracy = entry.seenCount > 0
    ? Math.floor((entry.correctCount / entry.seenCount) * 100)
    : 0;
  const summaryText = entry.metadata.summary ?? entry.metadata.fact;
  const hasImage = Boolean(entry.metadata.imageUrl ?? entry.metadata.imageThumbUrl);
  const imageUnlocked = entry.isReal || Boolean(entry.metadata.imageRevealed);
  const expanded = isExpanded;
  const showExpandedArticleHeader = expanded && hasImage && imageUnlocked;
  const showFakeImageReveal = expanded && !entry.isReal && hasImage && !imageUnlocked;

  useEffect(() => {
    if (!isLinkedTarget || hasAutoOpenedRef.current) {
      return;
    }

    const timerId = window.setTimeout(() => {
      hasAutoOpenedRef.current = true;
      setIsExpanded(true);
      onOpenDetails?.(entry.birdKey);
    }, 0);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [entry.birdKey, isLinkedTarget, onOpenDetails]);

  const handleSetExpanded = (nextExpanded: boolean) => {
    setIsExpanded(nextExpanded);
    if (nextExpanded) {
      onOpenDetails?.(entry.birdKey);
    }
  };

  const handleToggleExpanded = () => {
    handleSetExpanded(!isExpanded);
  };

  const displayBirdName = formatBirdName(entry.birdName);
  const showLockedBirdhouseToast = Boolean(lockedBirdhouseToast) && !imageUnlocked;

  const handleLockedBirdhousePress = () => {
    handleSetExpanded(true);
    setLockedBirdhouseToast(`Reveal this fake bird for ${JOURNAL_FAKE_REVEAL_COST} seeds before adding it to your Birdhouse.`);
  };

  const handleRevealFakeImage = () => {
    setLockedBirdhouseToast(null);
    onRevealFakeImage(entry.birdKey);
  };

  const actionButtons = (
    <div className="flex shrink-0 items-center gap-2">
      <BirdhouseToggleButton
        birdKey={entry.birdKey}
        birdName={entry.birdName}
        isReal={entry.isReal}
        iconSize={16}
        className="min-h-9 px-2.5 py-1.5"
        isLocked={!imageUnlocked}
        lockedTitle={`Reveal this fake bird for ${JOURNAL_FAKE_REVEAL_COST} seeds to unlock Birdhouse`}
        lockedAriaLabel={`Reveal ${displayBirdName} before adding it to Birdhouse`}
        onLockedClick={handleLockedBirdhousePress}
        onRequestSwap={onRequestBirdhouseSwap}
      />
      <button
        type="button"
        onClick={handleToggleExpanded}
        className="inline-flex items-center gap-1 rounded-full border border-[var(--color-surface-border)] bg-[var(--color-surface-hover)] px-3 py-1 text-xs font-semibold text-[var(--color-text)] transition hover:bg-[var(--color-surface)]"
        aria-expanded={expanded}
      >
        Details
        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>
    </div>
  );

  return (
    <article id={entry.birdKey} className="scroll-mt-28 rounded-2xl border border-[var(--color-surface-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-card)] transition hover:bg-[var(--color-surface-hover)]">
      {!showExpandedArticleHeader ? (
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-[family-name:var(--font-display)] text-lg font-bold leading-tight text-[var(--color-text)]">
                  {displayBirdName}
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
            </div>
            {actionButtons}
          </div>
          <p className="text-sm text-[var(--color-muted)]">
            {`Seen ${entry.seenCount} ${entry.seenCount === 1 ? 'time' : 'times'} • Last seen ${formatLastSeen(entry.lastSeenAt)}`}
          </p>
        </div>
      ) : (
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0" />
          {actionButtons}
        </div>
      )}

      <AnimatePresence initial={false}>
        {showLockedBirdhouseToast ? (
          <div className="mt-3">
            <LockedBirdhouseNotice detail={lockedBirdhouseToast ?? ''} />
          </div>
        ) : null}
      </AnimatePresence>

      {expanded ? (
        <div className="mt-4 space-y-3">
          {hasImage && imageUnlocked ? (
            <JournalBirdImage
              key={entry.metadata.imageUrl ?? entry.metadata.imageThumbUrl}
              birdName={entry.birdName}
              imageUrl={entry.metadata.imageUrl ?? entry.metadata.imageThumbUrl ?? ''}
              attribution={entry.metadata.attribution}
            />
          ) : showFakeImageReveal && canAffordFakeImageReveal ? (
            <HiddenFakeBirdRevealButton
              canReveal={canAffordFakeImageReveal}
              onReveal={handleRevealFakeImage}
            />
          ) : null}

          {showExpandedArticleHeader ? (
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <h3 className="font-[family-name:var(--font-display)] text-lg font-bold leading-tight text-[var(--color-text)]">
                  {displayBirdName}
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
      ) : (
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
      )}
    </article>
  );
}
