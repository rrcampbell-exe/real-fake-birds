'use client';

import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { ShieldCheck } from 'lucide-react';
import posthog from 'posthog-js';
import {
  getAnalyticsConsent,
  setAnalyticsConsent,
  requiresAnalyticsConsent,
} from '@/lib/analytics/consent';
import { useHasHydrated } from '@/hooks/useHasHydrated';

export default function ConsentModal() {
  const hasHydrated = useHasHydrated();
  const prefersReducedMotion = usePrefersReducedMotion();
  // `dismissed` tracks whether the user has responded via the modal UI.
  // `isVisible` is fully derived so no setState call is needed inside an effect.
  const [dismissed, setDismissed] = useState(false);
  const isVisible =
    hasHydrated && !dismissed && requiresAnalyticsConsent() && getAnalyticsConsent() === null;

  // Side-effect only: auto-accept non-EU users. Does not call setState.
  useEffect(() => {
    if (!hasHydrated) return;
    if (!requiresAnalyticsConsent() && getAnalyticsConsent() === null) {
      setAnalyticsConsent('accepted');
      if (typeof posthog.opt_in_capturing === 'function') {
        posthog.opt_in_capturing();
      }
      window.dispatchEvent(new Event('analytics-consent-changed'));
    }
  }, [hasHydrated]);

  const handleAccept = useCallback(() => {
    setAnalyticsConsent('accepted');
    if (typeof posthog.opt_in_capturing === 'function') {
      posthog.opt_in_capturing();
    }
    window.dispatchEvent(new Event('analytics-consent-changed'));
    setDismissed(true);
  }, []);

  const handleDecline = useCallback(() => {
    setAnalyticsConsent('declined');
    if (typeof posthog.opt_out_capturing === 'function') {
      posthog.opt_out_capturing();
    }
    window.dispatchEvent(new Event('analytics-consent-changed'));
    setDismissed(true);
  }, []);

  if (!hasHydrated) {
    return null;
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[59] bg-black/40 backdrop-blur-sm"
            aria-hidden="true"
          />
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0, transition: prefersReducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 260, damping: 24, delay: 1 } }}
            exit={{ opacity: 0, y: 16, transition: prefersReducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 260, damping: 24 } }}
            className="fixed bottom-0 left-0 right-0 z-[60] px-3 pb-[calc(env(safe-area-inset-bottom)+4.5rem)] sm:bottom-4 sm:flex sm:justify-center sm:pb-4"
          >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="consent-modal-title"
            className="w-full max-w-lg rounded-[1.5rem] border border-[var(--color-surface-border)] bg-[var(--color-modal-bg)] p-4 shadow-2xl sm:p-5"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--color-secondary)]/35 bg-[color-mix(in_srgb,var(--color-secondary)_10%,var(--color-surface))]">
                <ShieldCheck size={16} className="text-[var(--color-secondary)]" />
              </div>
              <div className="min-w-0 flex-1">
                <p
                  id="consent-modal-title"
                  className="font-[family-name:var(--font-display)] text-base font-semibold text-[var(--color-text)]"
                >
                  Help improve Real Fake Birds?
                </p>
                <p className="mt-1 text-sm leading-5 text-[var(--color-muted)]">
                  We use analytics to understand how the game feels and fix bugs. No ads, no selling data.
                </p>
              </div>
            </div>
            <div className="mt-4 flex gap-2.5">
              <button
                type="button"
                onClick={handleAccept}
                className="flex-1 rounded-xl border border-[var(--color-secondary)]/35 bg-[color-mix(in_srgb,var(--color-secondary)_12%,var(--color-surface))] px-4 py-2.5 text-sm font-semibold text-[var(--color-secondary)] transition hover:bg-[color-mix(in_srgb,var(--color-secondary)_20%,var(--color-surface))]"
              >
                Allow analytics
              </button>
              <button
                type="button"
                onClick={handleDecline}
                className="flex-1 rounded-xl border border-[var(--color-surface-border)] bg-[var(--color-surface)] px-4 py-2.5 text-sm font-medium text-[var(--color-muted)] transition hover:bg-[var(--color-surface-hover)]"
              >
                No thanks
              </button>
            </div>
          </div>
        </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
