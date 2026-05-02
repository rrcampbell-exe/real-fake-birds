'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Birdhouse, Shuffle, X } from 'lucide-react';
import { useAccountState } from '@/components/account/AccountStateProvider';
import { useBirdhouse } from '@/hooks/useBirdhouse';
import { useBirdJournal } from '@/hooks/useBirdJournal';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { useSound } from '@/hooks/useSound';
import { pushBirdhouseToAccount } from '@/lib/auth/account-session';
import { BIRDHOUSE_FAKE_CAP, BIRDHOUSE_REAL_CAP } from '@/lib/utils/birdhouse';
import { formatBirdName } from '@/lib/utils/format-bird-name';

interface BirdhouseSwapSheetProps {
  incomingBird: {
    birdKey: string;
    birdName: string;
    isReal: boolean;
  } | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function BirdhouseSwapSheet({ incomingBird, isOpen, onClose }: BirdhouseSwapSheetProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const { isSignedIn } = useAccountState();
  const { play } = useSound();
  const { birdhouse, swap } = useBirdhouse();
  const { journalByKey } = useBirdJournal();

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!incomingBird) {
    return null;
  }

  const collection = incomingBird.isReal ? birdhouse.real : birdhouse.fake;
  const cap = incomingBird.isReal ? BIRDHOUSE_REAL_CAP : BIRDHOUSE_FAKE_CAP;
  const title = incomingBird.isReal ? 'Real Birdhouse Full' : 'Fake Birdhouse Full';
  const displayIncomingBirdName = formatBirdName(incomingBird.birdName);

  const handleSwap = (outgoingBirdKey: string) => {
    swap(incomingBird.birdKey, outgoingBirdKey, incomingBird.isReal);
    play('collect');
    if (isSignedIn) {
      void pushBirdhouseToAccount();
    }
    onClose();
  };

  return createPortal(
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/55 px-3 py-4 backdrop-blur-sm sm:px-4 sm:py-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.18 }}
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.section
            role="dialog"
            aria-modal="true"
            aria-labelledby="birdhouse-swap-title"
            initial={prefersReducedMotion ? false : { opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
            className="flex min-w-0 w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-[var(--color-surface-border)] bg-[color-mix(in_srgb,var(--color-primary)_75%,black)] shadow-2xl"
            style={{ maxHeight: 'min(85svh, 640px)' }}
          >
            {/* Header */}
            <div className="flex shrink-0 items-start justify-between gap-4 px-5 pb-4 pt-5">
              <div className="min-w-0 space-y-2">
                <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-surface-border)] bg-[var(--color-surface)] px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-[var(--color-secondary)]">
                  <Shuffle size={14} />
                  Swap Required
                </div>
                <h2 id="birdhouse-swap-title" className="font-[family-name:var(--font-display)] text-2xl font-bold text-[var(--color-text)]">{title}</h2>
                <p className="max-w-lg text-sm leading-6 text-[var(--color-muted)]">
                  Your birdhouse holds up to {cap} birds. Release one to make room for {displayIncomingBirdName}. Released birds stay in your journal.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Dismiss birdhouse swap"
                className="shrink-0 rounded-full border border-[var(--color-surface-border)] bg-[var(--color-surface)] p-2 text-[var(--color-text)] transition hover:bg-[var(--color-surface-hover)]"
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable bird list */}
            <div className="overflow-y-auto px-5 pb-5">
              <div className="grid gap-3 sm:grid-cols-2">
                {collection.map((birdKey) => {
                  const entry = journalByKey[birdKey];
                  const rawName = entry?.birdName ?? birdKey.split(':')[1]?.replace(/-/g, ' ') ?? birdKey;
                  const displayBirdName = formatBirdName(rawName);

                  return (
                    <button
                      key={birdKey}
                      type="button"
                      onClick={() => handleSwap(birdKey)}
                      className="flex w-full items-center justify-between gap-3 rounded-2xl border border-[var(--color-surface-border)] bg-[var(--color-surface)] px-4 py-3 text-left transition hover:bg-[var(--color-surface-hover)]"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="flex min-h-[3rem] items-center font-[family-name:var(--font-display)] text-base font-bold text-[var(--color-text)]">
                          {displayBirdName}
                        </p>
                      </div>
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[var(--color-surface-border)] px-2.5 py-1 text-xs font-semibold text-[var(--color-secondary)]">
                        <Birdhouse size={14} fill="currentColor" />
                        Release
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.section>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body
  );
}