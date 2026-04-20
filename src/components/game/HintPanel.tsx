'use client';

import Image from 'next/image';
import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { AlertCircle, BookOpenText, ChevronDown, ImageIcon, LoaderCircle, Sparkles } from 'lucide-react';
import { track } from '@/lib/analytics';
import type { HintState, HintType } from '@/types';
import { FACT_HINT_COST, IMAGE_HINT_COST } from '@/lib/constants/hints';
import { formatNumber } from '@/lib/utils/number-format';
import { formatBirdName } from '@/lib/utils/format-bird-name';

interface HintPanelProps {
  birdName: string;
  externalizedHintTypes?: HintType[];
  hintError: string | null;
  hintErrorType: HintType | null;
  hintLoading: Record<HintType, boolean>;
  hints: HintState;
  onRequestHint: (type: HintType) => void;
  seedsBalance: number;
}

interface HintOption {
  type: HintType;
  title: string;
  description: string;
  cost: number;
  Icon: typeof BookOpenText;
}

const hintOptions: HintOption[] = [
  {
    type: 'fact',
    title: 'Field Note',
    description: 'One short clue about this bird.',
    cost: FACT_HINT_COST,
    Icon: BookOpenText,
  },
  {
    type: 'image',
    title: 'Photo',
    description: 'A single image reveal for this bird.',
    cost: IMAGE_HINT_COST,
    Icon: ImageIcon,
  },
];

const visibleHintOptions = hintOptions;

function LoadingHintPreview({ type }: { type: HintType }) {
  return (
    <div className="overflow-hidden rounded-xl border border-[var(--color-surface-border)] bg-[var(--color-primary-light)]">
      <div className="flex items-center gap-2 px-4 py-3 font-[family-name:var(--font-display)] text-sm font-semibold text-[var(--color-text)]">
        <LoaderCircle size={16} className="animate-spin" />
        {type === 'fact'
          ? 'Consulting a real fake ornithologist...'
          : 'Seeking a real fake wildlife photographer...'}
      </div>
      <div className="px-4 pb-4">
        {type === 'image' ? (
          <div className="aspect-square w-full rounded-xl bg-[linear-gradient(135deg,var(--color-surface-border),transparent)]" />
        ) : (
          <div className="space-y-2">
            <div className="h-3 w-full rounded-full bg-[var(--color-surface-border)]/80" />
            <div className="h-3 w-[88%] rounded-full bg-[var(--color-surface-border)]/70" />
            <div className="h-3 w-[62%] rounded-full bg-[var(--color-surface-border)]/60" />
          </div>
        )}
      </div>
    </div>
  );
}

function FactHintPreview({ content }: { content: string }) {
  return (
    <div className="rounded-xl border border-[var(--color-surface-border)] bg-[var(--color-surface)] px-4 py-4 text-sm leading-6 text-[var(--color-text)]">
      <div className="mb-2 font-[family-name:var(--font-display)] text-sm font-semibold text-[var(--color-text)]">
        Real Fake Fact
      </div>
      <p>{content}</p>
    </div>
  );
}

function ImageHintPreview({ birdName, content }: { birdName: string; content: string }) {
  const displayBirdName = formatBirdName(birdName);

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--color-surface-border)] bg-[var(--color-surface)]">
      <div className="px-4 py-3 font-[family-name:var(--font-display)] text-sm font-semibold text-[var(--color-text)]">
        Image Hint
      </div>
      <Image
        src={content}
        alt={`Hint image for ${displayBirdName}`}
        width={800}
        height={800}
        className="block aspect-square w-full object-cover"
      />
    </div>
  );
}

function FailedHintPreview({
  message,
  onRetry,
  type,
}: {
  message: string;
  onRetry: () => void;
  type: HintType;
}) {
  return (
    <div className="rounded-xl border border-[var(--color-surface-border)] bg-[var(--color-primary-light)] px-4 py-4 text-[var(--color-text)]">
      <div className="flex items-center gap-2 font-[family-name:var(--font-display)] text-sm font-semibold">
        <AlertCircle size={16} className="shrink-0" />
        {type === 'fact' ? 'Field note request failed' : 'Photo request failed'}
      </div>
      <p className="mt-2 text-sm leading-6 text-[var(--color-text)]/86">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-3 rounded-lg border border-[var(--color-surface-border)] bg-[var(--color-surface)] px-3 py-2 text-sm font-medium text-[var(--color-text)] transition-colors hover:bg-[var(--color-surface-hover)]"
      >
        Try again
      </button>
    </div>
  );
}

function HintOptionButton({
  cost,
  description,
  Icon,
  insufficientSeeds,
  loading,
  onRequest,
  requestLocked,
  title,
}: {
  cost: number;
  description: string;
  Icon: typeof BookOpenText;
  insufficientSeeds: boolean;
  loading: boolean;
  onRequest: () => void;
  requestLocked: boolean;
  title: string;
}) {
  const statusText = loading
    ? 'Fetching...'
    : requestLocked
      ? 'Waiting for current hint...'
    : insufficientSeeds
      ? 'Not enough seeds'
      : `Trade ${formatNumber(cost)} seeds`;
  const statusClassName = (insufficientSeeds || requestLocked) && !loading
    ? 'text-[var(--color-text)]/70'
    : 'text-[var(--color-text)]';

  return (
    <button
      type="button"
      disabled={loading || insufficientSeeds || requestLocked}
      onClick={onRequest}
      className="rounded-xl border border-[var(--color-surface-border)] bg-[var(--color-surface)] px-4 py-4 text-left transition-all enabled:cursor-pointer enabled:hover:-translate-y-0.5 enabled:hover:border-[var(--color-secondary)] disabled:cursor-not-allowed"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 pr-2">
          <div className="flex items-center gap-2 font-[family-name:var(--font-display)] text-base font-semibold text-[var(--color-text)]">
            {loading ? (
              <LoaderCircle size={18} className="shrink-0 animate-spin" />
            ) : (
              <Icon size={18} className="shrink-0" />
            )}
            <span>{title}</span>
          </div>
          <p className="mt-1 max-w-[22rem] text-sm leading-5 text-[var(--color-text)]/72">
            {description}
          </p>
        </div>
        <span className="mt-0.5 shrink-0 rounded-full bg-[var(--color-primary-light)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text)]">
          {formatNumber(cost)} seeds
        </span>
      </div>

      <div className={`mt-4 text-sm font-medium ${statusClassName}`}>{statusText}</div>
    </button>
  );
}

export default function HintPanel({
  birdName,
  externalizedHintTypes = [],
  hintError,
  hintErrorType,
  hintLoading,
  hints,
  onRequestHint,
  seedsBalance,
}: HintPanelProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [isManuallyExpanded, setIsManuallyExpanded] = useState<boolean | null>(null);
  const hasPendingHintRequest = hintLoading.fact || hintLoading.image;
  const allHintsPurchased = Boolean(hints.fact) && Boolean(hints.image);
  const allHintsRequestedOrPurchased = (Boolean(hints.fact) || hintLoading.fact) && (Boolean(hints.image) || hintLoading.image);
  const autoExpanded = Boolean(hints.fact || hints.image || hintLoading.fact || hintLoading.image || hintErrorType === 'fact' || hintErrorType === 'image');
  const isExpanded = isManuallyExpanded
    ?? autoExpanded;

  if ((allHintsPurchased || allHintsRequestedOrPurchased) && !hintError) {
    return null;
  }

  return (
    <div className="w-full">
      <button
        type="button"
        aria-expanded={isExpanded}
        onClick={() => {
          if (!isExpanded) {
            track('hint_panel_opened');
          }
          setIsManuallyExpanded(!isExpanded);
        }}
        className="flex w-full items-center justify-between rounded-xl border border-[var(--color-surface-border)] bg-[var(--color-primary-light)] px-4 py-3 text-left transition-colors hover:bg-[var(--color-surface-hover)]"
      >
        <span className="flex items-center gap-2 font-[family-name:var(--font-display)] text-sm font-semibold tracking-[0.02em]">
          <Sparkles size={16} />
          Get a Hint
        </span>
        <span className="flex items-center gap-2 text-xs text-[var(--color-muted)]">
          <ChevronDown
            size={16}
            className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
          />
        </span>
      </button>

      <AnimatePresence initial={false}>
        {isExpanded ? (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -8 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -8 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.2, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-3 grid gap-3">
              {visibleHintOptions.map(({ type, title, description, cost, Icon }) => {
                const loading = hintLoading[type];
                const insufficientSeeds = seedsBalance < cost;
                const hint = hints[type];
                const isExternalized = externalizedHintTypes.includes(type);

                if (isExternalized && (loading || Boolean(hint))) {
                  return null;
                }

                if (loading) {
                  return <LoadingHintPreview key={type} type={type} />;
                }

                if (hintError && hintErrorType === type) {
                  return (
                    <FailedHintPreview
                      key={type}
                      message={hintError}
                      onRetry={() => onRequestHint(type)}
                      type={type}
                    />
                  );
                }

                if (type === 'fact' && hints.fact) {
                  return <FactHintPreview key={type} content={hints.fact.content} />;
                }

                if (type === 'image' && hints.image) {
                  return (
                    <ImageHintPreview key={type} birdName={birdName} content={hints.image.content} />
                  );
                }

                return (
                  <HintOptionButton
                    key={type}
                    cost={cost}
                    description={description}
                    Icon={Icon}
                    insufficientSeeds={insufficientSeeds}
                    loading={loading}
                    requestLocked={hasPendingHintRequest}
                    onRequest={() => onRequestHint(type)}
                    title={title}
                  />
                );
              })}

            </div>

            {hintError && !hintErrorType ? (
              <p className="mt-3 rounded-xl border border-[var(--color-surface-border)] bg-[var(--color-primary-light)] px-4 py-3 text-sm text-[var(--color-text)]">
                {hintError}
              </p>
            ) : null}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}