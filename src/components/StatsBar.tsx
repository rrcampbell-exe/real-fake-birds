'use client';

import { Flame, Target, Zap } from 'lucide-react';
import { streakValues } from '@/lib/constants/streaks';
import { isNextStreakEval } from '@/lib/utils/goals-evaluation';

interface Stats {
  birdsSeen: number;
  birdsIdentified: number;
  currentStreak: number;
  bestStreak: number;
}

interface StatsBarProps {
  refreshTrigger?: unknown;
}

export default function StatsBar({ refreshTrigger }: StatsBarProps) {
  void refreshTrigger;

  const stats = (() => {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem('birdScore');
    return raw ? (JSON.parse(raw) as Stats) : null;
  })();

  if (!stats) return null;

  const { birdsSeen, birdsIdentified, currentStreak, bestStreak } = stats;
  const accuracy = birdsSeen > 0 ? Math.floor((birdsIdentified / birdsSeen) * 100) : 0;
  const nextStreak = isNextStreakEval(streakValues, currentStreak);
  const streakProgress = nextStreak ? (currentStreak / nextStreak) * 100 : 100;

  return (
    <div className="w-full max-w-md mx-auto px-4">
      <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-surface-border)] backdrop-blur-sm text-xs">
        {/* Current streak */}
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="relative">
            <Flame
              size={18}
              className={currentStreak > 0 ? 'text-orange-400' : 'text-[var(--color-muted)]'}
              fill={currentStreak > 0 ? 'currentColor' : 'none'}
            />
            {currentStreak >= 5 && (
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-orange-400 rounded-full animate-ping" />
            )}
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-sm leading-none">{currentStreak}</span>
            <span className="text-[var(--color-muted)] text-[0.6rem] leading-tight">streak</span>
          </div>
        </div>

        {/* Streak progress bar */}
        <div className="flex-1 mx-2 flex flex-col justify-center">
          <div className="h-1.5 rounded-full bg-[var(--color-surface-border)] overflow-hidden">
            <div
              className="h-full rounded-full bg-[var(--color-secondary)] transition-all duration-500 ease-out"
              style={{ width: `${Math.min(streakProgress, 100)}%` }}
            />
          </div>
          {nextStreak && (
            <p className="mt-2 text-center text-[0.6rem] leading-tight text-[var(--color-muted)]">
              {nextStreak - currentStreak} to next streak
            </p>
          )}
        </div>

        {/* Accuracy gauge */}
        <div className="flex items-center gap-1.5">
          <Target size={16} className="text-[var(--color-muted)]" />
          <div className="flex flex-col">
            <span className="font-bold text-sm leading-none">{accuracy}%</span>
            <span className="text-[var(--color-muted)] text-[0.6rem] leading-tight">acc</span>
          </div>
        </div>

        {/* Best streak */}
        <div className="flex items-center gap-1.5">
          <Zap size={16} className="text-[var(--color-secondary)]" fill="currentColor" />
          <div className="flex flex-col">
            <span className="font-bold text-sm leading-none">{bestStreak}</span>
            <span className="text-[var(--color-muted)] text-[0.6rem] leading-tight">best</span>
          </div>
        </div>
      </div>
    </div>
  );
}
