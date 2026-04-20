'use client';

import { useState } from 'react';
import Image from 'next/image';
import type { HintState, HintType } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import HintPanel from './HintPanel';
import { useSound } from '@/hooks/useSound';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { formatBirdName } from '@/lib/utils/format-bird-name';

function QuestionImageHintSurface({
  birdName,
  imageUrl,
  loading,
}: {
  birdName: string;
  imageUrl: string | null;
  loading: boolean;
}) {
  const displayBirdName = formatBirdName(birdName);
  const [imageStatus, setImageStatus] = useState<'idle' | 'loaded'>('idle');
  const showShimmer = loading || (Boolean(imageUrl) && imageStatus !== 'loaded');

  return (
    <div className="w-full space-y-3">
      <div className="relative aspect-[3/2] w-full overflow-hidden rounded-2xl border border-[var(--color-surface-border)] bg-[var(--color-surface)]">
        {showShimmer ? (
          <div
            aria-hidden="true"
            data-testid="question-image-shimmer"
            className="absolute inset-0 bg-[linear-gradient(110deg,var(--color-surface-hover)_8%,color-mix(in_srgb,var(--color-surface)_65%,white_35%)_18%,var(--color-surface-hover)_33%)] bg-[length:200%_100%] animate-[shimmer_1.25s_linear_infinite]"
          />
        ) : null}

        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={`Hint image for ${displayBirdName}`}
            width={800}
            height={800}
            className={`block h-full w-full object-cover transition-opacity duration-200 ${imageStatus === 'loaded' ? 'opacity-100' : 'opacity-0'}`}
            onLoad={() => setImageStatus('loaded')}
          />
        ) : null}
      </div>

      <h2 className="w-full break-words text-left font-[family-name:var(--font-display)] text-2xl font-bold leading-tight text-[var(--color-text)] sm:text-3xl">
        {displayBirdName}
      </h2>
    </div>
  );
}

function HintNoteCard({
  title,
  content,
  loading,
  italic = false,
}: {
  title: string;
  content: string | null;
  loading: boolean;
  italic?: boolean;
}) {
  return (
    <div className="rounded-xl border border-[var(--color-surface-border)] bg-[var(--color-surface-hover)] px-4 py-4 text-sm leading-6 text-[var(--color-text)]">
      <div className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">
        {title}
      </div>
      {loading ? (
        <div className="space-y-2">
          <div className="h-3 w-full rounded-full bg-[var(--color-surface-border)]/80" />
          <div className="h-3 w-[86%] rounded-full bg-[var(--color-surface-border)]/70" />
          <div className="h-3 w-[58%] rounded-full bg-[var(--color-surface-border)]/60" />
        </div>
      ) : (
        <p className={italic ? 'border-l-2 border-[var(--color-secondary)] pl-3 italic' : ''}>{content}</p>
      )}
    </div>
  );
}

interface BirdCardProps {
  birdName: string;
  hintError: string | null;
  hintErrorType: HintType | null;
  hintLoading: Record<HintType, boolean>;
  hints: HintState;
  onRequestHint: (type: HintType) => void;
  state: 'loading' | 'question' | 'answer';
  seedsBalance: number;
  onAnswer: (e: React.MouseEvent<HTMLButtonElement>) => void;
  loadingContent?: React.ReactNode;
  answerContent?: React.ReactNode;
}

export default function BirdCard({
  birdName,
  hintError,
  hintErrorType,
  hintLoading,
  hints,
  onRequestHint,
  state,
  seedsBalance,
  onAnswer,
  loadingContent,
  answerContent,
}: BirdCardProps) {
  const { play } = useSound();
  const prefersReducedMotion = usePrefersReducedMotion();
  const displayBirdName = formatBirdName(birdName);
  const hasHintPreview = Boolean(
    hints.fact
    || hints.image
    || hintLoading.fact
    || hintLoading.image
  );
  const hasImageHintPreview = Boolean(hints.image?.content) || hintLoading.image;
  const hasFactHintPreview = Boolean(hints.fact?.content) || hintLoading.fact;
  const externalizedHintTypes: HintType[] = [];

  if (hasImageHintPreview) {
    externalizedHintTypes.push('image');
  }

  if (hasFactHintPreview) {
    externalizedHintTypes.push('fact');
  }

  const handleAnswer = (e: React.MouseEvent<HTMLButtonElement>) => {
    play('tap');
    onAnswer(e);
  };

  return (
    <div className="w-full max-w-md mx-auto px-4">
      <motion.div
        className="relative rounded-2xl bg-[var(--color-surface)] border border-[var(--color-surface-border)] backdrop-blur-sm overflow-hidden"
        style={{ boxShadow: 'var(--shadow-card)' }}
        layout
        transition={{ layout: { duration: 0.3, ease: [0.4, 0, 0.2, 1] } }}
      >
        {/* Decorative top accent */}
        <div className="h-1 bg-[var(--color-secondary)]" />

        <motion.div className="p-6 md:p-8" layout>
          <AnimatePresence mode="popLayout" initial={false}>
            {state === 'loading' ? (
              <motion.div
                key="loading"
                layout
                initial={prefersReducedMotion ? false : { opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: -40 }}
                transition={{ duration: prefersReducedMotion ? 0 : 0.25, ease: [0.4, 0, 0.2, 1] }}
              >
                {loadingContent}
              </motion.div>
            ) : state === 'question' ? (
              <motion.div
                key="question"
                layout
                initial={prefersReducedMotion ? false : { opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: -40 }}
                transition={{ duration: prefersReducedMotion ? 0 : 0.25, ease: [0.4, 0, 0.2, 1] }}
                className={hasHintPreview ? 'flex flex-col gap-4' : 'flex flex-col items-center gap-6'}
              >
                {hasImageHintPreview ? (
                  <QuestionImageHintSurface
                    key={hints.image?.content ?? (hintLoading.image ? 'loading-image' : 'no-image')}
                    birdName={birdName}
                    imageUrl={hints.image?.content ?? null}
                    loading={hintLoading.image}
                  />
                ) : (
                  <h2 className="font-[family-name:var(--font-display)] text-3xl font-bold text-center leading-tight md:text-4xl">
                    {displayBirdName}
                  </h2>
                )}

                <div className="flex gap-3 w-full">
                  <button
                    id="real"
                    onClick={handleAnswer}
                    className="flex-1 py-3.5 px-6 rounded-xl font-[family-name:var(--font-display)] font-semibold text-base
                      bg-[var(--color-secondary)] text-[var(--color-on-secondary)] border-none
                      shadow-[var(--shadow-button)] hover:brightness-110 active:scale-[0.97]
                      transition-all duration-150 cursor-pointer"
                  >
                    Real Bird
                  </button>
                  <button
                    id="fake"
                    onClick={handleAnswer}
                    className="flex-1 py-3.5 px-6 rounded-xl font-[family-name:var(--font-display)] font-semibold text-base
                      bg-transparent text-[var(--color-text)] border-2 border-[var(--color-text)]
                      hover:bg-[var(--color-surface-hover)] active:scale-[0.97]
                      transition-all duration-150 cursor-pointer"
                  >
                    Fake Bird
                  </button>
                </div>

                {hasFactHintPreview ? (
                  <div className="w-full space-y-3">
                    <HintNoteCard
                      title="Field Note"
                      content={hints.fact?.content ?? null}
                      loading={hintLoading.fact}
                    />
                  </div>
                ) : null}

                <HintPanel
                  key={birdName}
                  birdName={birdName}
                  externalizedHintTypes={externalizedHintTypes}
                  hintError={hintError}
                  hintErrorType={hintErrorType}
                  hintLoading={hintLoading}
                  hints={hints}
                  onRequestHint={onRequestHint}
                  seedsBalance={seedsBalance}
                />
              </motion.div>
            ) : (
              <motion.div
                key="answer"
                layout
                initial={prefersReducedMotion ? false : { opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: -40 }}
                transition={{ duration: prefersReducedMotion ? 0 : 0.25, ease: [0.4, 0, 0.2, 1] }}
              >
                {answerContent}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </div>
  );
}
