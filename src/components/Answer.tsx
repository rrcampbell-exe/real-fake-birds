'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Check, X } from 'lucide-react';
import { correctnessText } from '@/lib/utils/correctness-text';

interface AnswerProps {
  birdData: string;
  isReal: boolean;
  isStreak: boolean;
  isCorrect: boolean;
  isMilestone: boolean;
  onTryAgain: () => void;
}

export default function Answer({
  birdData,
  isReal,
  isStreak,
  isCorrect,
  isMilestone,
  onTryAgain,
}: AnswerProps) {
  useEffect(() => {
    if (isStreak || isMilestone) {
      const duration = 2500;
      const end = Date.now() + duration;

      const frame = () => {
        confetti({ particleCount: 2, angle: 60, spread: 55, origin: { x: 0 }, colors: ['var(--color-secondary)', '#FFD700', '#fff'] });
        confetti({ particleCount: 2, angle: 120, spread: 55, origin: { x: 1 }, colors: ['var(--color-secondary)', '#FFD700', '#fff'] });
        if (Date.now() < end) requestAnimationFrame(frame);
      };
      frame();
    }
  }, [isStreak, isMilestone]);

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
      <p className="text-sm font-medium text-[var(--color-muted)]">
        {correctnessText(isCorrect, isStreak, isMilestone)}
      </p>

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
        onClick={onTryAgain}
        className="mt-2 py-3 px-8 rounded-xl font-[family-name:var(--font-display)] font-semibold text-base
          bg-[var(--color-secondary)] text-[var(--color-text)] border-none
          shadow-[var(--shadow-button)] hover:brightness-110 active:scale-[0.97]
          transition-all duration-150 cursor-pointer"
      >
        Next Bird
      </motion.button>
    </div>
  );
}
