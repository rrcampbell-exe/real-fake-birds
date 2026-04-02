'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Check, X } from 'lucide-react';
import SeedIcon from '@/components/icons/SeedIcon';
import { correctnessText } from '@/lib/utils/correctness-text';
import { useSound } from '@/hooks/useSound';

interface AnswerProps {
  birdData: string;
  isReal: boolean;
  isStreak: boolean;
  isCorrect: boolean;
  isMilestone: boolean;
  seedsEarned: number;
  newThemeUnlockName: string | null;
  earnedBadgeName: string | null;
  onTryAgain: () => void;
}

export default function Answer({
  birdData,
  isReal,
  isStreak,
  isCorrect,
  isMilestone,
  seedsEarned,
  newThemeUnlockName,
  earnedBadgeName,
  onTryAgain,
}: AnswerProps) {
  const { play } = useSound();

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
      play('streak');
    }
  }, [isStreak, isMilestone, play]);

  useEffect(() => {
    if (isStreak || isMilestone || newThemeUnlockName) {
      const duration = 2500;
      const end = Date.now() + duration;

      const frame = () => {
        confetti({ particleCount: 2, angle: 60, spread: 55, origin: { x: 0 }, colors: ['var(--color-secondary)', '#FFD700', '#fff'] });
        confetti({ particleCount: 2, angle: 120, spread: 55, origin: { x: 1 }, colors: ['var(--color-secondary)', '#FFD700', '#fff'] });
        if (Date.now() < end) requestAnimationFrame(frame);
      };
      frame();
    }
  }, [isStreak, isMilestone, newThemeUnlockName]);

  return (
    <div className="flex flex-col items-center gap-5">
      {/* Correctness indicator */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 15, delay: 0.1 }}
        className={`w-14 h-14 rounded-full flex items-center justify-center ${
          isCorrect
            ? 'bg-emerald-500/20 text-emerald-400'
            : 'bg-red-500/20 text-red-400'
        }`}
      >
        {isCorrect ? <Check size={28} strokeWidth={3} /> : <X size={28} strokeWidth={3} />}
      </motion.div>

      {/* Feedback text */}
      <p className="whitespace-pre-line text-sm font-medium text-[var(--color-muted)] text-center">
        {correctnessText(isCorrect, isStreak, isMilestone)}
      </p>

      {(isMilestone || seedsEarned > 0 || newThemeUnlockName) && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          {isMilestone && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--color-surface-border)] bg-[var(--color-surface)] px-3 py-1 text-xs font-semibold"
            >
              <span>
                {earnedBadgeName
                  ? `Earned the ${earnedBadgeName} Badge!`
                  : 'Badge Unlocked!'}
              </span>
            </motion.div>
          )}

          {seedsEarned > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--color-surface-border)] bg-[var(--color-surface)] px-3 py-1 text-xs font-semibold"
            >
              <SeedIcon size={16} color="var(--color-secondary)" />
              <span>+{seedsEarned} {seedsEarned === 1 ? 'seed' : 'seeds'}</span>
            </motion.div>
          )}

          {newThemeUnlockName && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--color-surface-border)] bg-[var(--color-surface)] px-3 py-1 text-xs font-semibold"
            >
              <span>Unlocked {newThemeUnlockName} Theme!</span>
            </motion.div>
          )}
        </div>
      )}

      {/* Bird name + real/fake badge */}
      <div className="text-center">
        <h2 className="font-[family-name:var(--font-display)] text-2xl md:text-3xl font-bold leading-tight mb-2">
          {birdData}
        </h2>
        <motion.span
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={`inline-block px-4 py-1 rounded-full text-sm font-bold tracking-wide uppercase ${
            isReal
              ? 'bg-emerald-500/20 text-emerald-400'
              : 'bg-red-500/20 text-red-400'
          }`}
        >
          {isReal ? 'Real' : 'Fake'}
        </motion.span>
      </div>

      {/* Try again button */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35 }}
        onClick={() => { play('whoosh'); onTryAgain(); }}
        className="mt-2 py-3 px-8 rounded-xl font-[family-name:var(--font-display)] font-semibold text-base
          bg-[var(--color-secondary)] text-[var(--color-on-secondary)] border-none
          shadow-[var(--shadow-button)] hover:brightness-110 active:scale-[0.97]
          transition-all duration-150 cursor-pointer"
      >
        Next Bird
      </motion.button>
    </div>
  );
}
