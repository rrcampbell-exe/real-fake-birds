'use client';

import { Flame, Target, Trophy, Zap } from 'lucide-react';
import SeedIcon from '@/components/icons/SeedIcon';
import { milestones } from '@/lib/constants/milestones';
import { streakValues } from '@/lib/constants/streaks';
import { getThemeUnlockByMilestoneValue } from '@/lib/constants/theme-unlocks';
import { isNextMilestoneEval, isNextStreakEval } from '@/lib/utils/goals-evaluation';
import { useStoredJson } from '@/hooks/useStoredValue';
import { defaultBirdScore, getUnlockedThemeNames, normalizeBirdScore } from '@/lib/utils/player-progress';

interface StatsBarProps {
  refreshTrigger?: unknown;
}

export default function StatsBar({ refreshTrigger }: StatsBarProps) {
  void refreshTrigger;

  const storedStats = useStoredJson<typeof defaultBirdScore | null>('birdScore', null);

  if (!storedStats) return null;

  const { birdsSeen, birdsIdentified, currentStreak, bestStreak, seeds } = normalizeBirdScore(storedStats);
  const accuracy = birdsSeen > 0 ? Math.floor((birdsIdentified / birdsSeen) * 100) : 0;
  const nextStreak = isNextStreakEval(streakValues, currentStreak);
  const streakCountdown = nextStreak ? `${nextStreak - currentStreak} to streak` : 'max streak tier';
  const milestoneValues = milestones.map((milestone) => milestone.value);
  const nextMilestone = isNextMilestoneEval(milestoneValues, birdsIdentified);
  const previousMilestone = [...milestoneValues].reverse().find((value) => value <= birdsIdentified) ?? 0;
  const nextUnlock = nextMilestone ? getThemeUnlockByMilestoneValue(nextMilestone) : undefined;
  const unlockedThemeNames = new Set(getUnlockedThemeNames({ birdsSeen, birdsIdentified, currentStreak, bestStreak, seeds }));
  const isNextThemeAlreadyUnlocked = Boolean(nextUnlock?.themeName && unlockedThemeNames.has(nextUnlock.themeName));
  const remainingMilestoneBirds = nextMilestone ? nextMilestone - birdsIdentified : 0;
  const unlockProgress = nextMilestone
    ? ((birdsIdentified - previousMilestone) / (nextMilestone - previousMilestone)) * 100
    : 100;
  const unlockLabel = nextMilestone
    ? nextUnlock && !nextUnlock.comingSoon && !isNextThemeAlreadyUnlocked
      ? `${remainingMilestoneBirds} to unlock ${nextUnlock.milestoneBadge} Badge and ${nextUnlock.themeName} Theme`
      : `${remainingMilestoneBirds} to unlock ${milestones.find((milestone) => milestone.value === nextMilestone)?.badge} Badge`
    : 'All live themes unlocked';

  return (
    <div className="w-full max-w-md mx-auto px-4">
      <div className="rounded-xl bg-[var(--color-surface)] border border-[var(--color-surface-border)] p-3 backdrop-blur-sm text-xs">
        <div className="grid grid-cols-4 gap-2">
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
            <div className="flex min-w-0 flex-col">
              <span className="font-bold text-sm leading-none">{currentStreak}</span>
              <span className="text-[var(--color-muted)] text-[0.6rem] leading-tight truncate">
                {streakCountdown}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 min-w-0">
            <SeedIcon size={18} color="var(--color-secondary)" />
            <div className="flex min-w-0 flex-col">
              <span className="font-bold text-sm leading-none">{seeds}</span>
              <span className="text-[var(--color-muted)] text-[0.6rem] leading-tight">seeds</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 min-w-0">
            <Target size={16} className="text-[var(--color-muted)]" />
            <div className="flex min-w-0 flex-col">
              <span className="font-bold text-sm leading-none">{accuracy}%</span>
              <span className="text-[var(--color-muted)] text-[0.6rem] leading-tight">acc</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 min-w-0">
            <Zap size={16} className="text-[var(--color-secondary)]" fill="currentColor" />
            <div className="flex min-w-0 flex-col">
              <span className="font-bold text-sm leading-none">{bestStreak}</span>
              <span className="text-[var(--color-muted)] text-[0.6rem] leading-tight">best</span>
            </div>
          </div>
        </div>

        <div className="mt-3 flex items-start gap-2">
          <Trophy size={16} className="mt-0.5 shrink-0 text-[var(--color-secondary)]" />
          <div className="min-w-0 flex-1">
            <div className="h-1.5 rounded-full bg-[var(--color-surface-border)] overflow-hidden">
              <div
                className="h-full rounded-full bg-[var(--color-secondary)] transition-all duration-500 ease-out"
                style={{ width: `${Math.min(unlockProgress, 100)}%` }}
              />
            </div>
            <p className="mt-2 text-[0.65rem] leading-tight text-[var(--color-muted)]">
              {unlockLabel}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
