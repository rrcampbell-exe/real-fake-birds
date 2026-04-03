'use client';

import type { HintState, HintType } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import HintPanel from './HintPanel';
import { useSound } from '@/hooks/useSound';

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
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
              >
                {loadingContent}
              </motion.div>
            ) : state === 'question' ? (
              <motion.div
                key="question"
                layout
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                className="flex flex-col items-center gap-6"
              >
                {/* Bird name */}
                <h2 className="font-[family-name:var(--font-display)] text-2xl md:text-4xl font-bold text-center leading-tight">
                  {birdName}
                </h2>

                {/* Answer buttons */}
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

                <HintPanel
                  key={birdName}
                  birdName={birdName}
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
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
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
