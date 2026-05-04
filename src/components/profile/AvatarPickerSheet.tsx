'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Bird, X } from 'lucide-react';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { formatBirdName } from '@/lib/utils/format-bird-name';

interface AvatarPickerSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (birdKey: string | null) => void;
  fakeBirds: {
    birdKey: string;
    birdName: string;
    imageUrl: string | null;
  }[];
  currentBirdKey: string | null;
}

export default function AvatarPickerSheet({
  isOpen,
  onClose,
  onSelect,
  fakeBirds,
  currentBirdKey,
}: AvatarPickerSheetProps) {
  const prefersReducedMotion = usePrefersReducedMotion();

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

  return createPortal(
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          className="fixed inset-0 z-[70] flex items-end justify-center bg-black/55 backdrop-blur-sm sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.18 }}
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.section
            role="dialog"
            aria-modal="true"
            aria-labelledby="avatar-picker-title"
            initial={prefersReducedMotion ? false : { opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
            className="flex w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-[var(--color-surface-border)] bg-[var(--color-surface)] shadow-2xl sm:rounded-3xl"
            style={{ maxHeight: 'min(85svh, 580px)' }}
          >
            {/* Header */}
            <div className="flex shrink-0 items-start justify-between gap-4 px-5 pb-4 pt-5">
              <div className="min-w-0 space-y-1">
                <h2 id="avatar-picker-title" className="font-[family-name:var(--font-display)] text-xl font-bold text-[var(--color-text)]">
                  Choose Avatar
                </h2>
                <p className="text-sm text-[var(--color-muted)]">
                  Pick a fake bird from your birdhouse to use as your avatar.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close avatar picker"
                className="shrink-0 rounded-full border border-[var(--color-surface-border)] bg-[var(--color-surface-hover)] p-2 text-[var(--color-text)] transition hover:bg-[var(--color-surface-border)]"
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable grid */}
            <div className="overflow-y-auto px-5 pb-5">
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                {/* Reset to palette option */}
                <button
                  type="button"
                  onClick={() => onSelect(null)}
                  className={`flex flex-col items-center gap-2 overflow-hidden rounded-2xl border pb-2 text-center transition ${
                    currentBirdKey === null
                      ? 'border-[var(--color-secondary)] bg-[color-mix(in_srgb,var(--color-secondary)_15%,transparent)]'
                      : 'border-[var(--color-surface-border)] bg-[var(--color-surface-hover)] hover:bg-[var(--color-surface-border)]'
                  }`}
                >
                  <span className="flex h-16 w-full items-center justify-center text-[var(--color-muted)]">
                    <Bird size={24} aria-hidden="true" />
                  </span>
                  <span className="px-2 text-[0.65rem] font-medium leading-tight text-[var(--color-muted)]">
                    Palette
                  </span>
                </button>

                {fakeBirds.map((bird) => {
                  const isSelected = currentBirdKey === bird.birdKey;
                  return (
                    <button
                      key={bird.birdKey}
                      type="button"
                      onClick={() => onSelect(bird.birdKey)}
                      className={`flex flex-col items-center gap-2 overflow-hidden rounded-2xl border pb-2 text-center transition ${
                        isSelected
                          ? 'border-[var(--color-secondary)] bg-[color-mix(in_srgb,var(--color-secondary)_15%,transparent)]'
                          : 'border-[var(--color-surface-border)] bg-[var(--color-surface-hover)] hover:bg-[var(--color-surface-border)]'
                      }`}
                    >
                      <span className="flex h-16 w-full items-center justify-center overflow-hidden">
                        {bird.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={bird.imageUrl}
                            alt={bird.birdName}
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <Bird size={24} className="text-[var(--color-muted)]" aria-hidden="true" />
                        )}
                      </span>
                      <span className="px-2 text-[0.65rem] font-medium leading-tight text-[var(--color-text)] line-clamp-2">
                        {formatBirdName(bird.birdName)}
                      </span>
                    </button>
                  );
                })}

                {fakeBirds.length === 0 && (
                  <p className="col-span-3 py-6 text-center text-sm text-[var(--color-muted)] sm:col-span-4">
                    Add fake birds to your birdhouse first.
                  </p>
                )}
              </div>
            </div>
          </motion.section>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body
  );
}
