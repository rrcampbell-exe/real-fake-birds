'use client';

import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { ArrowRight, BookOpen, Bird, Birdhouse, GraduationCap, MapPin, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import BirdhouseSwapSheet from '@/components/birdhouse/BirdhouseSwapSheet';
import BirdhouseToggleButton from '@/components/birdhouse/BirdhouseToggleButton';
import SeedIcon from '@/components/icons/SeedIcon';
import { useSound } from '@/hooks/useSound';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { useStoredJson } from '@/hooks/useStoredValue';
import ShareButton from '@/components/ShareButton';
import { track } from '@/lib/analytics';
import { isMajorStreakCheckpoint } from '@/lib/constants/streaks';
import { deriveBirdKey, writePendingJournalTargetKey } from '@/lib/utils/bird-journal';
import { formatBirdName } from '@/lib/utils/format-bird-name';
import { defaultBirdScore, normalizeBirdScore } from '@/lib/utils/player-progress';
import { buildMilestoneSharePayload, buildRoundSharePayload } from '@/lib/utils/share-data';
import type { HintState, ImageAttribution } from '@/types';
import { FAKE_REVEAL_COST } from '@/lib/constants/hints';

const FAKE_FIELD_NOTES = [
  'This bird was made up. We still love it, though!',
  'This one is pure fiction. We would still wave if it flew by.',
  'Not a real bird, sadly. But it sounds like it would be a charmer!',
  'Completely invented. We\'re still fond of the little fraud.',
  'Made up from beak to tail. Still weirdly endearing.',
  'A total fabrication. We\'d keep an eye out for it anyway.',
  'Not one for the field guide, but it has a certain spark.',
  'This bird is fictional, but we respect the ambition.',
  'An invention, plain and simple. Still, it paints a lovely picture.',
  'No birder has ever spotted this one. We kind of wish someone would.',
  'Pure make-believe, with a surprisingly good bird name.',
  'A counterfeit little creature, but a memorable one.',
];

function getRandomFakeFieldNote(): string {
  return FAKE_FIELD_NOTES[Math.floor(Math.random() * FAKE_FIELD_NOTES.length)] ?? FAKE_FIELD_NOTES[0];
}

function getAnswerFact(text: string | null): string | null {
  if (!text) {
    return null;
  }

  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) {
    return null;
  }

  const firstSentenceBoundary = normalized.match(/(?<=[.!?])\s+/)?.index;
  const firstSentence = firstSentenceBoundary === undefined
    ? normalized
    : normalized.slice(0, firstSentenceBoundary).trim();

  if (firstSentence.length <= 180) {
    return firstSentence;
  }

  return `${firstSentence.slice(0, 177).trimEnd()}...`;
}

interface AnswerImageProps {
  birdData: string;
  imageUrl: string;
  fallbackImageUrl?: string | null;
  contentSource?: string | null;
  journalHref: string;
  isNewBirdEncounter?: boolean;
  onLearnMore: (event: React.MouseEvent<HTMLAnchorElement>) => void;
  onUnavailable: () => void;
}

const AnswerImage = memo(function AnswerImage({ birdData, imageUrl, fallbackImageUrl, contentSource, journalHref, isNewBirdEncounter, onLearnMore, onUnavailable }: AnswerImageProps) {
  const [imageStatus, setImageStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [activeSrc, setActiveSrc] = useState(imageUrl);
  const [usedFallback, setUsedFallback] = useState(false);
  const mountedAt = useRef(0);
  const displayBirdName = formatBirdName(birdData);

  useEffect(() => {
    mountedAt.current = Date.now();
  }, []);

  return (
    <div className="min-w-0 w-full">
      <Link
        href={journalHref}
        scroll={false}
        onClick={onLearnMore}
        className="group block w-full"
        aria-label="Learn more about this bird"
      >
        <div
          className="relative aspect-square overflow-hidden rounded-2xl border border-[var(--color-surface-border)] bg-[var(--color-surface-hover)]"
        >
        {imageStatus === 'loading' ? (
          <div
            aria-hidden="true"
            data-testid="answer-image-shimmer"
            className="absolute inset-0 bg-[linear-gradient(110deg,var(--color-surface-hover)_8%,color-mix(in_srgb,var(--color-surface)_65%,white_35%)_18%,var(--color-surface-hover)_33%)] bg-[length:200%_100%] animate-[shimmer_1.25s_linear_infinite]"
          />
        ) : null}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={activeSrc}
          alt={displayBirdName}
          className={`absolute inset-0 h-full w-full object-cover object-center transition-opacity duration-200 ${imageStatus === 'loaded' ? 'opacity-100' : 'opacity-0'}`}
          loading="eager"
          decoding="async"
          fetchPriority="high"
          onLoad={() => {
            setImageStatus('loaded');
            track('bird_content_loaded', {
              source: usedFallback ? 'fallback' : (contentSource ?? 'wikipedia'),
              content_type: 'image',
              load_stage: 'browser',
              load_time_ms: Date.now() - mountedAt.current,
              outcome: 'success',
            });
          }}
          onError={() => {
            if (!usedFallback && fallbackImageUrl) {
              setActiveSrc(fallbackImageUrl);
              setUsedFallback(true);
              // keep imageStatus as 'loading' to try the fallback
            } else {
              setImageStatus('error');
              track('bird_content_loaded', {
                source: usedFallback ? 'fallback' : (contentSource ?? 'wikipedia'),
                content_type: 'image',
                load_stage: 'browser',
                load_time_ms: Date.now() - mountedAt.current,
                outcome: 'failure',
                error: true,
              });
              onUnavailable();
            }
          }}
        />
        {/* Explore overlay — visible on hover/focus */}
        <div
          aria-hidden="true"
          className={`absolute inset-0 flex items-end justify-start bg-gradient-to-t from-black/50 to-transparent pb-2.5 pl-2.5 transition-opacity duration-200 ${isNewBirdEncounter ? 'opacity-0' : 'opacity-100'} md:opacity-0 md:group-hover:opacity-100 md:group-focus-visible:opacity-100`}
        >
          <span className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-white/90">Explore</span>
        </div>
        {isNewBirdEncounter ? (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute bottom-2 right-2 z-10 inline-flex items-center justify-center rounded-full border border-[var(--color-secondary)] px-2 py-0.5 text-[0.6rem] font-bold leading-none text-[var(--color-on-secondary)] new-badge-shimmer"
          >
            NEW
          </span>
        ) : null}
        </div>
      </Link>
    </div>
  );
});

AnswerImage.displayName = 'AnswerImage';

function ImageAttributionText({ attribution }: { attribution?: ImageAttribution | null }) {
  if (!attribution?.artist) {
    return null;
  }

  return (
    <div className="min-w-0 space-y-0.5 text-[0.6rem] leading-tight text-[var(--color-muted)]">
      <p className="truncate">Photo: {attribution.artist}</p>
      {attribution.license ? (
        attribution.licenseUrl ? (
          <a
            href={attribution.licenseUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block break-words underline underline-offset-2 hover:text-[var(--color-text)]"
          >
            {attribution.license}
          </a>
        ) : (
          <p className="break-words">{attribution.license}</p>
        )
      ) : null}
    </div>
  );
}

function FakeBirdRevealImage({
  onReveal,
  seedsBalance,
}: {
  onReveal?: () => void;
  seedsBalance: number;
}) {
  const canReveal = Boolean(onReveal) && seedsBalance >= FAKE_REVEAL_COST;

  return (
    <div className="min-w-0 w-full">
      <button
        type="button"
        aria-label="Reveal hidden fake bird image"
        title={`Reveal this fake bird for ${FAKE_REVEAL_COST} seeds`}
        onClick={onReveal}
        disabled={!canReveal}
        className="group block w-full cursor-pointer disabled:pointer-events-none disabled:opacity-40"
      >
        <div className="relative aspect-square overflow-hidden rounded-2xl border border-[var(--color-surface-border)] bg-[var(--color-surface-hover)] transition-colors duration-150 group-hover:bg-[var(--color-surface)]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,color-mix(in_srgb,var(--color-secondary)_12%,transparent),transparent_52%)]" />
          <div className="pointer-events-none absolute right-3 top-3 z-10">
            <span
              aria-label={`Reveal costs ${FAKE_REVEAL_COST} seeds`}
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-surface-border)] bg-[color-mix(in_srgb,var(--color-surface)_94%,white_6%)] px-2.5 py-1 text-[0.62rem] font-bold text-[var(--color-text)] shadow-[var(--shadow-button)]"
            >
              <span>{FAKE_REVEAL_COST}</span>
              <SeedIcon size={13} className="shrink-0" />
            </span>
          </div>
          <div className="relative z-10 flex h-full items-center justify-center text-[var(--color-muted)] transition-transform duration-150 group-hover:scale-[1.03] group-hover:text-[var(--color-text)]">
            <Bird className="h-28 w-28 md:h-14 md:w-14 lg:h-16 lg:w-16" strokeWidth={1.8} />
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
    </div>
  );
}

function LockedBirdhouseNotice({
  detail,
  prefersReducedMotion,
}: {
  detail: string;
  prefersReducedMotion: boolean;
}) {
  return (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
      transition={{ duration: prefersReducedMotion ? 0 : 0.18, ease: 'easeOut' }}
      className="w-full rounded-2xl border border-[var(--color-surface-border)] bg-[var(--color-surface)] px-4 py-3 shadow-[var(--shadow-card)]"
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

function LockedBirdhouseButton({
  onClick,
}: {
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-disabled="true"
      title={`Reveal this fake bird for ${FAKE_REVEAL_COST} seeds to unlock Birdhouse`}
      className="inline-flex cursor-help items-center justify-end gap-2 rounded-full border border-[var(--color-surface-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--color-muted)] opacity-55 transition hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
    >
      <span className="whitespace-nowrap">+ Birdhouse</span>
      <Birdhouse size={16} strokeWidth={2} />
    </button>
  );
}

interface AnswerProps {
  birdData: string;
  isReal: boolean;
  regionLabel: string | null;
  sciName: string | null;
  fact: string | null;
  summary: string | null;
  articleUrl: string | null;
  imageUrl: string | null;
  fallbackImageUrl?: string | null;
  contentSource?: string | null;
  attribution?: ImageAttribution | null;
  description: string | null;
  hints: HintState;
  isStreak: boolean;
  isCorrect: boolean;
  isMilestone: boolean;
  seedsEarned: number;
  firstGameOfDayBonusSeedsEarned?: number;
  newThemeUnlockName: string | null;
  earnedBadgeName: string | null;
  justBrokeBestStreak?: boolean;
  isNewBirdEncounter?: boolean;
  actionLabel?: string;
  onAction: () => void;
  revealFakeBirdImage?: () => void;
  fakeBirdImageRevealed?: boolean;
  seedsBalance?: number;
}

export default function Answer({
  birdData,
  isReal,
  regionLabel,
  sciName,
  fact,
  summary,
  imageUrl,
  fallbackImageUrl,
  contentSource,
  attribution,
  hints,
  isStreak,
  isCorrect,
  isMilestone,
  firstGameOfDayBonusSeedsEarned = 0,
  newThemeUnlockName,
  earnedBadgeName,
  justBrokeBestStreak = false,
  isNewBirdEncounter = false,
  actionLabel = 'Next Bird',
  onAction,
  revealFakeBirdImage,
  fakeBirdImageRevealed = false,
  seedsBalance = 0,
}: AnswerProps) {
  const { play } = useSound();
  const router = useRouter();
  const prefersReducedMotion = usePrefersReducedMotion();
  const score = normalizeBirdScore(useStoredJson<typeof defaultBirdScore | null>('birdScore', defaultBirdScore));
  const isMajorStreak = isMajorStreakCheckpoint(score.currentStreak);
  const displayedFact = getAnswerFact(hints.fact?.content ?? fact);
  const displayBirdName = formatBirdName(birdData);
  const journalBirdKey = deriveBirdKey(birdData, isReal);
  const encodedJournalBirdKey = encodeURIComponent(journalBirdKey);
  const journalHref = `/journal?bird=${encodedJournalBirdKey}#${encodedJournalBirdKey}`;
  const [hiddenImageKey, setHiddenImageKey] = useState<string | null>(null);
  const currentImageKey = imageUrl ? `${journalBirdKey}:${imageUrl}` : null;
  const fakeImageUnlocked = !isReal && (fakeBirdImageRevealed || Boolean(hints.image));
  const fakeImageRevealedViaHint = !isReal && Boolean(hints.image) && !fakeBirdImageRevealed;
  const shouldShowFakeReveal = !isReal && !fakeImageUnlocked && Boolean(revealFakeBirdImage);
  const isCurrentImageHidden = Boolean(currentImageKey) && hiddenImageKey === currentImageKey;
  const showVisualSlot = (Boolean(imageUrl) || shouldShowFakeReveal) && !isCurrentImageHidden;
  const hasImage = Boolean(imageUrl) && showVisualSlot && (isReal || fakeImageUnlocked);
  const handleLearnMore = useCallback((event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    writePendingJournalTargetKey(journalBirdKey);
    void router.push(journalHref, { scroll: false });
  }, [journalBirdKey, journalHref, router]);
  const handleAnswerImageUnavailable = useCallback(() => {
    setHiddenImageKey(currentImageKey);
  }, [currentImageKey]);
  const [fakeFieldNote] = useState(getRandomFakeFieldNote);
  const fakeFieldLead = getAnswerFact(summary) ?? displayedFact ?? fakeFieldNote;
  const [isNextBirdVisible, setIsNextBirdVisible] = useState(false);
  const [isWiggling, setIsWiggling] = useState(false);
  const [birdhouseSwapTarget, setBirdhouseSwapTarget] = useState<{ birdKey: string; birdName: string; isReal: boolean } | null>(null);
  const [lockedBirdhouseToast, setLockedBirdhouseToast] = useState<{ title: string; detail: string } | null>(null);

  const handleLockedBirdhousePress = () => {
    play('tap');
    setLockedBirdhouseToast({
      title: 'Reveal Required',
      detail: `Reveal this fake bird for ${FAKE_REVEAL_COST} seeds before adding it to your Birdhouse.`,
    });
  };

  const sharePayload = isMilestone && earnedBadgeName
    ? buildMilestoneSharePayload({
        badgeName: earnedBadgeName,
        birdsIdentified: score.birdsIdentified,
      })
    : buildRoundSharePayload({
        birdName: birdData,
        isReal,
        isCorrect,
        currentStreak: score.currentStreak,
        earnedBadgeName,
      });

  // Play answer reveal sounds, synced with the spring animation delay
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isCorrect) {
        play('correct');
      } else {
        play('wrong');
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [isCorrect, play]);

  // Play celebration sounds for streaks / milestones
  useEffect(() => {
    if (isMilestone || firstGameOfDayBonusSeedsEarned > 0) {
      play('milestone');
    } else if (isStreak) {
      play(isMajorStreak ? 'milestone' : 'streak');
    }
  }, [firstGameOfDayBonusSeedsEarned, isMajorStreak, isStreak, isMilestone, play]);

  useEffect(() => {
    if (prefersReducedMotion) return;
    if (isMilestone || earnedBadgeName || newThemeUnlockName || isMajorStreak || justBrokeBestStreak) {
      const duration = 800;
      const particleCount = 1;
      const spread = 40;
      const end = Date.now() + duration;

      const frame = () => {
        confetti({ particleCount, angle: 60, spread, origin: { x: 0 }, colors: ['var(--color-secondary)', '#FFD700', '#fff'] });
        confetti({ particleCount, angle: 120, spread, origin: { x: 1 }, colors: ['var(--color-secondary)', '#FFD700', '#fff'] });
        if (Date.now() < end) requestAnimationFrame(frame);
      };
      frame();
    }
  }, [earnedBadgeName, isMajorStreak, isMilestone, justBrokeBestStreak, newThemeUnlockName, prefersReducedMotion]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setIsNextBirdVisible(true);
    }, 200);

    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (!isNextBirdVisible || prefersReducedMotion || isWiggling) {
      return;
    }
    const timerId = window.setTimeout(() => {
      setIsWiggling(true);
    }, 3000);
    return () => {
      window.clearTimeout(timerId);
    };
  }, [isNextBirdVisible, isWiggling, prefersReducedMotion]);

  useEffect(() => {
    if (!isWiggling) {
      return;
    }
    const timerId = window.setTimeout(() => {
      setIsWiggling(false);
    }, 550);
    return () => {
      window.clearTimeout(timerId);
    };
  }, [isWiggling]);

  return (
    <div className="relative flex w-full flex-col items-center gap-4 md:gap-5">
      <div className="flex w-full items-start justify-between gap-3">
        <ShareButton
          payload={sharePayload}
          eventLabel={isMilestone && earnedBadgeName ? 'milestone' : 'round-result'}
          className="min-h-11 rounded-xl px-4 py-2.5 text-sm shadow-[var(--shadow-button)]"
        />
        <button
          onClick={() => { play('whoosh'); onAction(); }}
          className={`inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--color-secondary)] px-4 py-2.5 font-[family-name:var(--font-display)] text-sm font-semibold text-[var(--color-on-secondary)] shadow-[var(--shadow-button)] transition-[opacity,filter] duration-150 hover:brightness-110 active:scale-[0.97] ${isNextBirdVisible ? 'opacity-100' : 'opacity-0'} ${isWiggling ? 'wiggle-once' : ''}`}
        >
          {actionLabel}
          <ArrowRight size={16} strokeWidth={2.5} />
        </button>
      </div>

      <AnimatePresence initial={false}>
        {lockedBirdhouseToast ? (
          <LockedBirdhouseNotice
            key={lockedBirdhouseToast.detail}
            detail={lockedBirdhouseToast.detail}
            prefersReducedMotion={prefersReducedMotion}
          />
        ) : null}
      </AnimatePresence>

      <div className="w-full space-y-4">
        <div
          className={showVisualSlot
            ? 'grid grid-cols-[1fr_7rem] items-start gap-4 md:grid-cols-[10rem_minmax(0,1fr)_auto]'
            : 'grid items-start gap-3 grid-cols-[minmax(0,1fr)_auto]'}
        >
          {showVisualSlot ? (
            hasImage ? (
              <div className="space-y-1">
                <AnswerImage
                  key={currentImageKey ?? imageUrl ?? 'answer-image'}
                  birdData={birdData}
                  imageUrl={imageUrl ?? ''}
                  fallbackImageUrl={fallbackImageUrl}
                  contentSource={contentSource}
                  journalHref={journalHref}
                  isNewBirdEncounter={isNewBirdEncounter}
                  onLearnMore={handleLearnMore}
                  onUnavailable={handleAnswerImageUnavailable}
                />
              </div>
            ) : (
              <FakeBirdRevealImage
                onReveal={() => {
                  play('collect');
                  revealFakeBirdImage?.();
                }}
                seedsBalance={seedsBalance}
              />
            )
          ) : (
            <div className="min-w-0 space-y-1">
              {isNewBirdEncounter ? (
                <span
                  aria-hidden="true"
                  className="inline-flex items-center justify-center rounded-full border border-[var(--color-secondary)] px-2 py-0.5 text-[0.6rem] font-bold leading-none text-[var(--color-on-secondary)] new-badge-shimmer"
                >
                  NEW
                </span>
              ) : null}
              <h2 className="font-[family-name:var(--font-display)] text-xl font-bold leading-tight text-[var(--color-text)] md:text-2xl">
                {displayBirdName}
              </h2>
              {sciName ? (
                <p className="text-sm italic text-[var(--color-muted)]">{sciName}</p>
              ) : null}
            </div>
          )}

          <div className="flex self-stretch flex-col items-end gap-2 text-right md:col-start-3 md:row-start-1">
            <motion.span
              initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={prefersReducedMotion ? { duration: 0 } : { delay: 0.1 }}
              className={`inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] ${
                isCorrect
                  ? 'bg-[color-mix(in_srgb,var(--color-success)_18%,transparent)] text-[var(--color-success)]'
                  : 'bg-[color-mix(in_srgb,var(--color-error)_18%,transparent)] text-[var(--color-error)]'
              }`}
            >
              {isCorrect ? 'Correct' : 'Incorrect'}
            </motion.span>

            <motion.span
              initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={prefersReducedMotion ? { duration: 0 } : { delay: 0.18 }}
              className={`inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] ${
                isReal
                  ? 'bg-[color-mix(in_srgb,var(--color-success)_18%,transparent)] text-[var(--color-success)]'
                  : 'bg-[color-mix(in_srgb,var(--color-error)_18%,transparent)] text-[var(--color-error)]'
              }`}
            >
              {isReal ? 'Real' : 'Fake'}
            </motion.span>

            <motion.div
              initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={prefersReducedMotion ? { duration: 0 } : { delay: 0.26 }}
              className="mt-auto"
            >
              {isReal ? (
                <BirdhouseToggleButton
                  birdKey={journalBirdKey}
                  birdName={birdData}
                  isReal={isReal}
                  iconSize={16}
                  size="sm"
                  showLabel
                  onRequestSwap={setBirdhouseSwapTarget}
                />
              ) : fakeImageUnlocked ? (
                <BirdhouseToggleButton
                  birdKey={journalBirdKey}
                  birdName={birdData}
                  isReal={isReal}
                  iconSize={16}
                  size="sm"
                  showLabel
                  onRequestSwap={setBirdhouseSwapTarget}
                />
              ) : (
                <LockedBirdhouseButton onClick={handleLockedBirdhousePress} />
              )}
            </motion.div>
          </div>

          {showVisualSlot ? (
            <div className="col-span-2 min-w-0 space-y-1 md:col-span-3 md:col-start-1 md:row-start-2">
              <h2 className="font-[family-name:var(--font-display)] text-xl font-bold leading-tight text-[var(--color-text)] md:text-2xl">
                {displayBirdName}
              </h2>
              {sciName ? (
                <p className="text-sm italic text-[var(--color-muted)]">{sciName}</p>
              ) : null}
              {hasImage ? <ImageAttributionText attribution={attribution} /> : null}
            </div>
          ) : null}
        </div>

        {isReal ? (
          <div className="space-y-3 rounded-2xl border border-[var(--color-surface-border)] bg-[var(--color-surface-hover)] p-4">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">
                Field Notes
              </p>
              {regionLabel ? (
                <p className="flex items-center gap-1.5 text-sm text-[var(--color-muted)]">
                  <MapPin size={13} className="shrink-0" />
                  <span>Recently seen in {regionLabel}</span>
                </p>
              ) : null}
            </div>

            {displayedFact ? (
              <p className="text-sm leading-6 text-[var(--color-text)]">{displayedFact}</p>
            ) : null}

            <Link
              href={journalHref}
              scroll={false}
              onClick={handleLearnMore}
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-surface-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--color-muted)] transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
            >
              <GraduationCap size={13} strokeWidth={2} />
              Learn More
            </Link>
          </div>
        ) : (
          <div className="space-y-3 rounded-2xl border border-[var(--color-surface-border)] bg-[var(--color-surface-hover)] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">
              Fake Field Notes
            </p>
            <p className="text-sm leading-6 text-[var(--color-text)]">{fakeFieldLead}</p>
            <Link
              href={journalHref}
              scroll={false}
              onClick={handleLearnMore}
              aria-label="Learn more about this bird"
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-surface-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--color-muted)] transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
            >
              <BookOpen size={13} strokeWidth={2} />
              See in Journal
            </Link>
          </div>
        )}
      </div>

      <BirdhouseSwapSheet
        incomingBird={birdhouseSwapTarget}
        isOpen={birdhouseSwapTarget !== null}
        onClose={() => setBirdhouseSwapTarget(null)}
      />
    </div>
  );
}
