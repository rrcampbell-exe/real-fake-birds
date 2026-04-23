'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bird, ChevronRight, Palette, Trophy, X } from 'lucide-react';
import SeedIcon from '@/components/icons/SeedIcon';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';

interface OnboardingStep {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const STEPS: OnboardingStep[] = [
  {
    icon: (
      <div className="inline-flex items-center justify-center rounded-2xl border border-[var(--color-surface-border)] bg-[var(--color-surface-hover)] p-3">
        <Bird size={32} strokeWidth={1.5} className="text-[var(--color-secondary)]" />
      </div>
    ),
    title: 'Welcome to Real Fake Birds',
    description:
      'A guessing game where you decide: is each bird a real species or something entirely made up?',
  },
  {
    icon: (
      <div className="inline-flex items-center gap-3 rounded-2xl border border-[var(--color-surface-border)] bg-[var(--color-surface-hover)] px-5 py-3 text-2xl font-bold leading-none">
        <span className="text-green-400">Real</span>
        <span className="text-[var(--color-muted)]">/</span>
        <span className="text-red-400">Fake</span>
      </div>
    ),
    title: 'Real or Fake?',
    description:
      'Each round you see a bird name. Tap Real if you believe it exists, or Fake if you think we made it up. Get it right to build your streak.',
  },
  {
    icon: (
      <div className="inline-flex items-center gap-4 rounded-2xl border border-[var(--color-surface-border)] bg-[var(--color-surface-hover)] px-5 py-3">
        <SeedIcon size={28} className="text-[var(--color-secondary)]" />
        <Palette size={28} strokeWidth={1.5} className="text-[var(--color-secondary)]" />
        <Trophy size={28} strokeWidth={1.5} className="text-[var(--color-secondary)]" />
      </div>
    ),
    title: 'Earn seeds, badges & more',
    description:
      'Correct answers earn seeds and new themes. Hit milestones to earn badges, compete on the weekly leaderboard, and collect your favorite birds in a personal Birdhouse.',
  },
];

interface OnboardingOverlayProps {
  onDismiss: () => void;
}

export default function OnboardingOverlay({ onDismiss }: OnboardingOverlayProps) {
  const [step, setStep] = useState(0);
  const prefersReducedMotion = usePrefersReducedMotion();

  const isLastStep = step === STEPS.length - 1;
  const current = STEPS[step];

  const handleNext = () => {
    if (isLastStep) {
      onDismiss();
    } else {
      setStep((s) => s + 1);
    }
  };

  const transition = { duration: prefersReducedMotion ? 0 : 0.22, ease: 'easeOut' as const };

  return (
    <motion.div
      className="fixed inset-0 z-[60] flex items-center justify-center px-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={transition}
    >
      {/* Backdrop */}
      <motion.div
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
        onClick={onDismiss}
        aria-hidden="true"
      />

      {/* Card */}
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
        className="relative w-full max-w-sm rounded-2xl border border-[var(--color-surface-border)] bg-[var(--color-surface)] p-6 shadow-2xl max-h-[calc(100dvh-8rem)] overflow-y-auto"
        initial={{ y: prefersReducedMotion ? 0 : 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: prefersReducedMotion ? 0 : 24, opacity: 0 }}
        transition={{ ...transition, delay: 0.05 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Skip / close */}
        <button
          type="button"
          aria-label="Skip onboarding"
          onClick={onDismiss}
          className="absolute right-3 top-3 rounded-full border border-[var(--color-surface-border)] p-1.5 text-[var(--color-muted)] transition hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
        >
          <X size={14} />
        </button>

        {/* Step indicator dots */}
        <div className="flex items-center gap-1.5 mb-5">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === step
                  ? 'w-5 bg-[var(--color-secondary)]'
                  : i < step
                    ? 'w-1.5 bg-[var(--color-secondary)]/40'
                    : 'w-1.5 bg-[var(--color-surface-border)]'
              }`}
            />
          ))}
        </div>

        {/* Step content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: prefersReducedMotion ? 0 : 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: prefersReducedMotion ? 0 : -16 }}
            transition={transition}
            className="flex flex-col gap-4"
          >
            <div className="text-[var(--color-text)]">
              {current?.icon}
            </div>
            <div className="flex flex-col gap-1.5">
              <h2
                id="onboarding-title"
                className="font-[family-name:var(--font-display)] text-xl font-bold text-[var(--color-text)]"
              >
                {current?.title}
              </h2>
              <p className="text-sm leading-6 text-[var(--color-muted)]">
                {current?.description}
              </p>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Actions */}
        <div className="mt-6 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onDismiss}
            className="text-xs text-[var(--color-muted)] underline decoration-[var(--color-muted)] underline-offset-2 hover:text-[var(--color-text)]"
          >
            Skip
          </button>
          <button
            type="button"
            onClick={handleNext}
            className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-secondary)] px-5 py-2.5 text-sm font-semibold text-[var(--color-on-secondary)] transition hover:opacity-90"
          >
            {isLastStep ? 'Start playing' : 'Next'}
            {!isLastStep && <ChevronRight size={14} />}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
