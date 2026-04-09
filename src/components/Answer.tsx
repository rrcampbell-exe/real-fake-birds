'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import Image from 'next/image';
import { ArrowRight, GraduationCap } from 'lucide-react';
import Link from 'next/link';
import { useSound } from '@/hooks/useSound';
import { useStoredJson } from '@/hooks/useStoredValue';
import ShareButton from '@/components/ShareButton';
import { isMajorStreakCheckpoint } from '@/lib/constants/streaks';
import { deriveBirdKey, writeCurrentRoundJournalRevealKey } from '@/lib/utils/bird-journal';
import { defaultBirdScore, normalizeBirdScore } from '@/lib/utils/player-progress';
import { buildMilestoneSharePayload, buildRoundSharePayload } from '@/lib/utils/share-data';
import type { HintState } from '@/types';

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
  journalHref: string;
  onLearnMore: () => void;
}

function AnswerImage({ birdData, imageUrl, journalHref, onLearnMore }: AnswerImageProps) {
  const [imageStatus, setImageStatus] = useState<'loading' | 'loaded' | 'error'>('loading');

  return (
    <Link
      href={journalHref}
      onClick={onLearnMore}
      className="block w-[calc(50%-0.5rem)] max-w-[10rem] md:row-start-1 md:w-28 md:max-w-none"
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
        {imageStatus === 'error' ? (
          <div className="absolute inset-0 flex items-center justify-center bg-[var(--color-surface-hover)] px-3 text-center text-xs font-medium text-[var(--color-muted)]">
            Image unavailable
          </div>
        ) : null}
        <Image
          src={imageUrl}
          alt={birdData}
          fill
          sizes="(max-width: 768px) 50vw, 112px"
          className={`object-cover object-center transition-opacity duration-200 ${imageStatus === 'loaded' ? 'opacity-100' : 'opacity-0'}`}
          loading="eager"
          unoptimized
          onLoad={() => setImageStatus('loaded')}
          onError={() => setImageStatus('error')}
        />
      </div>
    </Link>
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
  description: string | null;
  hints: HintState;
  isStreak: boolean;
  isCorrect: boolean;
  isMilestone: boolean;
  seedsEarned: number;
  newThemeUnlockName: string | null;
  earnedBadgeName: string | null;
  isNewBirdEncounter?: boolean;
  actionLabel?: string;
  onAction: () => void;
}

export default function Answer({
  birdData,
  isReal,
  regionLabel,
  sciName,
  fact,
  imageUrl,
  hints,
  isStreak,
  isCorrect,
  isMilestone,
  earnedBadgeName,
  actionLabel = 'Next Bird',
  onAction,
}: AnswerProps) {
  const { play } = useSound();
  const score = normalizeBirdScore(useStoredJson<typeof defaultBirdScore | null>('birdScore', defaultBirdScore));
  const isMajorStreak = isMajorStreakCheckpoint(score.currentStreak);
  const displayedFact = getAnswerFact(hints.fact?.content ?? fact);
  const journalHref = `/journal#${encodeURIComponent(deriveBirdKey(birdData, isReal))}`;
  const hasImage = isReal && Boolean(imageUrl);
  const handleLearnMore = () => {
    writeCurrentRoundJournalRevealKey(deriveBirdKey(birdData, isReal));
  };
  const [fakeFieldNote] = useState(getRandomFakeFieldNote);
  const [isNextBirdVisible, setIsNextBirdVisible] = useState(false);
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
    if (isMilestone) {
      play('milestone');
    } else if (isStreak) {
      play(isMajorStreak ? 'milestone' : 'streak');
    }
  }, [isMajorStreak, isStreak, isMilestone, play]);

  useEffect(() => {
    if (isMilestone || earnedBadgeName || isStreak) {
      const duration = isMilestone || earnedBadgeName || isMajorStreak ? 2500 : 1200;
      const particleCount = isMilestone || earnedBadgeName || isMajorStreak ? 2 : 1;
      const spread = isMilestone || earnedBadgeName || isMajorStreak ? 55 : 40;
      const end = Date.now() + duration;

      const frame = () => {
        confetti({ particleCount, angle: 60, spread, origin: { x: 0 }, colors: ['var(--color-secondary)', '#FFD700', '#fff'] });
        confetti({ particleCount, angle: 120, spread, origin: { x: 1 }, colors: ['var(--color-secondary)', '#FFD700', '#fff'] });
        if (Date.now() < end) requestAnimationFrame(frame);
      };
      frame();
    }
  }, [earnedBadgeName, isMajorStreak, isStreak, isMilestone]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setIsNextBirdVisible(true);
    }, 350);

    return () => {
      window.clearTimeout(timer);
    };
  }, []);

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
          className={`inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--color-secondary)] px-4 py-2.5 font-[family-name:var(--font-display)] text-sm font-semibold text-[var(--color-on-secondary)] shadow-[var(--shadow-button)] transition-[opacity,filter,transform] duration-200 hover:brightness-110 active:scale-[0.97] ${isNextBirdVisible ? 'opacity-100' : 'opacity-0'}`}
        >
          {actionLabel}
          <ArrowRight size={16} strokeWidth={2.5} />
        </button>
      </div>

      <div className="w-full space-y-4">
        <div
          className={hasImage
            ? 'flex flex-wrap items-stretch justify-between gap-4 md:grid md:grid-cols-[7rem_minmax(0,1fr)_auto] md:items-start'
            : 'grid items-start gap-4 grid-cols-[minmax(0,1fr)_auto]'}
        >
          {hasImage ? (
            <AnswerImage
              key={imageUrl}
              birdData={birdData}
              imageUrl={imageUrl ?? ''}
              journalHref={journalHref}
              onLearnMore={handleLearnMore}
            />
          ) : (
            <div className="min-w-0 space-y-1">
              <h2 className="font-[family-name:var(--font-display)] text-xl font-bold leading-tight text-[var(--color-text)] md:text-2xl">
                {birdData}
              </h2>
              {sciName ? (
                <p className="text-sm italic text-[var(--color-muted)]">{sciName}</p>
              ) : null}
            </div>
          )}

          <div className="flex shrink-0 self-stretch flex-col items-end gap-2 text-right md:col-start-3 md:row-start-1 md:self-auto">
            <motion.span
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className={`inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] ${
                isCorrect
                  ? 'bg-[color-mix(in_srgb,var(--color-success)_18%,transparent)] text-[var(--color-success)]'
                  : 'bg-[color-mix(in_srgb,var(--color-error)_18%,transparent)] text-[var(--color-error)]'
              }`}
            >
              {isCorrect ? 'Correct' : 'Incorrect'}
            </motion.span>

            <motion.span
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18 }}
              className={`inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] ${
                isReal
                  ? 'bg-[color-mix(in_srgb,var(--color-success)_18%,transparent)] text-[var(--color-success)]'
                  : 'bg-[color-mix(in_srgb,var(--color-error)_18%,transparent)] text-[var(--color-error)]'
              }`}
            >
              {isReal ? 'Real' : 'Fake'}
            </motion.span>

            {/* Learn More for real birds, just under labels */}
            {isReal && (
              <Link
                href={journalHref}
                onClick={handleLearnMore}
                className="mt-auto inline-flex items-center gap-2 rounded-full border border-[var(--color-surface-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text)] transition hover:bg-[var(--color-surface-hover)]"
              >
                Learn More
                <GraduationCap size={16} />
              </Link>
            )}
          </div>

          {hasImage ? (
            <div className="w-full min-w-0 space-y-1 md:col-span-2 md:col-start-1 md:row-start-2">
              <h2 className="font-[family-name:var(--font-display)] text-xl font-bold leading-tight text-[var(--color-text)] md:text-2xl">
                {birdData}
              </h2>
              {sciName ? (
                <p className="text-sm italic text-[var(--color-muted)]">{sciName}</p>
              ) : null}
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
                <p className="text-sm text-[var(--color-muted)]">Recently seen in {regionLabel}</p>
              ) : null}
            </div>

            {displayedFact ? (
              <p className="text-sm leading-6 text-[var(--color-text)]">{displayedFact}</p>
            ) : null}
          </div>
        ) : (
          <div className="space-y-3 rounded-2xl border border-[var(--color-surface-border)] bg-[var(--color-surface-hover)] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">
              Fake Field Notes
            </p>
            <p className="text-sm leading-6 text-[var(--color-text)]">{fakeFieldNote}</p>
          </div>
        )}
      </div>
    </div>
  );
}
