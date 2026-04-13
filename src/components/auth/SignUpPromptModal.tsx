'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { Bird, ShieldCheck, Sparkles, Trophy, X } from 'lucide-react';
import UsernameAvailabilityCard from '@/components/auth/UsernameAvailabilityCard';
import { fetchWeeklyLeaderboard, type GetLeaderboardResponse } from '@/lib/auth/account-sync';
import { track } from '@/lib/analytics';
import { hasSupabaseEnv } from '@/lib/supabase/env';
import { UNLOCKED_THEMES_STORAGE_KEY } from '@/lib/utils/player-progress';
import { buildSignUpPromptContent } from '@/lib/utils/signup-prompt';
import { useStoredJson } from '@/hooks/useStoredValue';

interface SignUpPromptModalProps {
  birdsSeen: number;
  birdsIdentified: number;
  seeds: number;
  threshold: number;
  onDismiss: () => void;
  onAuthenticated: () => void;
}

export default function SignUpPromptModal({
  birdsSeen,
  birdsIdentified,
  seeds,
  threshold,
  onDismiss,
  onAuthenticated,
}: SignUpPromptModalProps) {
  const unlockedThemeNames = useStoredJson<string[]>(UNLOCKED_THEMES_STORAGE_KEY, []);
  const prefersReducedMotion = usePrefersReducedMotion();
  const shouldLoadLeaderboard = birdsSeen >= 50 && hasSupabaseEnv();
  const [leaderboard, setLeaderboard] = useState<GetLeaderboardResponse['leaderboard'] | null>(null);
  const [leaderboardStatus, setLeaderboardStatus] = useState<'idle' | 'ready' | 'error'>('idle');

  const handleDismiss = useCallback(() => {
    track('signup_prompt_dismissed', {
      threshold,
      birds_seen: birdsSeen,
      birds_identified: birdsIdentified,
      challenge_id: leaderboard?.challenge.id,
    });
    onDismiss();
  }, [birdsIdentified, birdsSeen, leaderboard, onDismiss, threshold]);

  const handleAuthenticated = useCallback(() => {
    track('signup_prompt_authenticated', {
      threshold,
      birds_seen: birdsSeen,
      birds_identified: birdsIdentified,
      challenge_id: leaderboard?.challenge.id,
    });
    onAuthenticated();
  }, [birdsIdentified, birdsSeen, leaderboard, onAuthenticated, threshold]);

  useEffect(() => {
    track('signup_prompt_viewed', {
      threshold,
      birds_seen: birdsSeen,
      birds_identified: birdsIdentified,
      seeds,
    });
  }, [birdsIdentified, birdsSeen, seeds, threshold]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleDismiss();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleDismiss]);

  useEffect(() => {
    if (!shouldLoadLeaderboard) {
      return;
    }

    const controller = new AbortController();

    fetchWeeklyLeaderboard(controller.signal)
      .then((response) => {
        if (controller.signal.aborted) {
          return;
        }

        setLeaderboard(response.leaderboard);
        setLeaderboardStatus('ready');
      })
      .catch(() => {
        if (controller.signal.aborted) {
          return;
        }

        setLeaderboardStatus('error');
      });

    return () => {
      controller.abort();
    };
  }, [shouldLoadLeaderboard]);

  const resolvedLeaderboardStatus = shouldLoadLeaderboard
    ? leaderboardStatus === 'error'
      ? 'error'
      : leaderboard
        ? 'ready'
        : 'loading'
    : 'idle';

  const content = useMemo(() => buildSignUpPromptContent({
    birdsSeen,
    birdsIdentified,
    seeds,
    unlockedThemeNames,
    leaderboard,
  }), [birdsIdentified, birdsSeen, leaderboard, seeds, unlockedThemeNames]);

  const highlightLines = [content.leaderboardLine, content.nextRewardLine, content.achievementLine].filter(
    (value): value is string => Boolean(value)
  ).slice(0, 2);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[70] flex items-center justify-center bg-black/55 px-3 py-3 backdrop-blur-sm sm:px-4 sm:py-4"
        onClick={handleDismiss}
      >
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="signup-prompt-title"
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.98 }}
          transition={prefersReducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 260, damping: 24 }}
          className="relative max-h-[calc(100dvh-1.5rem)] w-full max-w-xl overflow-y-auto rounded-[1.75rem] border border-[var(--color-surface-border)] bg-[var(--color-modal-bg)] shadow-2xl [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden sm:max-h-[calc(100dvh-2rem)]"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,color-mix(in_srgb,var(--color-secondary)_22%,transparent)_0%,transparent_48%),radial-gradient(circle_at_bottom_left,color-mix(in_srgb,var(--color-primary)_18%,transparent)_0%,transparent_42%)]" />

          <div className="relative p-5 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] sm:p-6 sm:pb-6">
            <button
              type="button"
              aria-label="Close sign up prompt"
              onClick={handleDismiss}
              className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-surface-border)] bg-[var(--color-surface)] text-[var(--color-muted)] transition hover:bg-[var(--color-surface-hover)]"
            >
              <X size={16} />
            </button>

            <motion.div
              initial="hidden"
              animate="visible"
              variants={{
                hidden: {},
                visible: { transition: prefersReducedMotion ? {} : { staggerChildren: 0.05 } },
              }}
            >
                <motion.div
                  variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}
                  className="inline-flex w-fit items-center gap-2 rounded-full border border-[var(--color-secondary)]/35 bg-[color-mix(in_srgb,var(--color-secondary)_10%,var(--color-surface))] px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[var(--color-secondary)]"
                >
                  <Sparkles size={14} />
                  {content.eyebrow}
                </motion.div>

                <motion.h2
                  id="signup-prompt-title"
                  variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}
                  className="mt-4 max-w-xl font-[family-name:var(--font-display)] text-3xl font-bold leading-tight"
                >
                  {content.title}
                </motion.h2>

                <motion.p
                  variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}
                  className="mt-3 pr-10 text-sm leading-6 text-[var(--color-muted)]"
                >
                  {content.body}
                </motion.p>

                <motion.div
                  variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}
                  className="mt-4 inline-flex w-fit items-center gap-2 rounded-full border border-[var(--color-surface-border)] bg-[var(--color-surface-hover)] px-3 py-2 text-xs font-medium text-[var(--color-muted)]"
                >
                  {content.summary}
                </motion.div>

                <div className="mt-5 space-y-2.5">
                  {resolvedLeaderboardStatus === 'loading' ? (
                    <motion.div
                      variants={{ hidden: { opacity: 0, x: -10 }, visible: { opacity: 1, x: 0 } }}
                      className="flex items-start gap-3 rounded-2xl border border-[var(--color-surface-border)] bg-[var(--color-surface-hover)] px-4 py-3"
                    >
                      <Trophy size={18} className="mt-0.5 shrink-0 text-[var(--color-secondary)]" />
                      <p className="text-sm leading-6 text-[var(--color-text)]">Checking this week&apos;s challenge pace.</p>
                    </motion.div>
                  ) : null}

                  {highlightLines.map((line, index) => {
                    const icon = index === 0 && content.leaderboardLine === line
                      ? <Trophy size={18} className="mt-0.5 shrink-0 text-[var(--color-secondary)]" />
                      : index === 0
                        ? <Bird size={18} className="mt-0.5 shrink-0 text-[var(--color-secondary)]" />
                        : <ShieldCheck size={18} className="mt-0.5 shrink-0 text-[var(--color-secondary)]" />;

                    return (
                      <motion.div
                        key={line}
                        variants={{ hidden: { opacity: 0, x: -10 }, visible: { opacity: 1, x: 0 } }}
                        className={`flex items-start gap-3 rounded-2xl px-4 py-3 ${
                          content.leaderboardLine === line
                            ? 'border border-[var(--color-secondary)]/25 bg-[color-mix(in_srgb,var(--color-secondary)_10%,var(--color-surface))]'
                            : 'border border-[var(--color-surface-border)] bg-[var(--color-surface-hover)]'
                        }`}
                      >
                        {icon}
                        <p className="text-sm leading-6 text-[var(--color-text)]">{line}</p>
                      </motion.div>
                    );
                  })}
                </div>

                <motion.div
                  variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}
                  className="mt-5"
                >
                  <UsernameAvailabilityCard compact onAuthSuccess={handleAuthenticated} />
                </motion.div>
            </motion.div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}