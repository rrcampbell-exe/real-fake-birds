'use client';

import { Bird, CalendarArrowUp, CalendarDays, Flame, Target, Zap, Award } from 'lucide-react';
import SeedIcon from '@/components/icons/SeedIcon';
import { useAccountState } from '@/components/account/AccountStateProvider';
import { useStoredJson } from '@/hooks/useStoredValue';
import { DAILY_MISSION_HISTORY_STORAGE_KEY, getDailyMissionStreaks } from '@/lib/utils/daily-mission-history';
import { formatNumber } from '@/lib/utils/number-format';
import { defaultBirdScore, normalizeBirdScore } from '@/lib/utils/player-progress';
import type { DailyMissionHistoryEntry } from '@/types';

export default function PersonalBests({ includeSummaryStats = false }: { includeSummaryStats?: boolean }) {
  const { remoteSummary } = useAccountState();
  const storedStats = useStoredJson<typeof defaultBirdScore | null>('birdScore', null);
  const dailyHistory = useStoredJson<DailyMissionHistoryEntry[]>(
    DAILY_MISSION_HISTORY_STORAGE_KEY,
    []
  );

  if (!storedStats) return null;

  const {
    birdsSeen,
    birdsIdentified,
    currentStreak,
    currentDailyStreak,
    bestDailyStreak,
  } = normalizeBirdScore(storedStats);
  const derivedDailyStreaks = getDailyMissionStreaks(dailyHistory);
  const accuracy = birdsSeen > 0 ? Math.floor((birdsIdentified / birdsSeen) * 100) : 0;
  const effectiveCurrentDailyStreak = Math.max(currentDailyStreak, derivedDailyStreaks.currentStreak);
  const effectiveBestDailyStreak = Math.max(bestDailyStreak, derivedDailyStreaks.bestStreak, remoteSummary?.bestDailyStreak ?? 0);

  const summaryItems = includeSummaryStats && remoteSummary
    ? [
        {
          label: 'Birds Identified',
          value: remoteSummary.birdsIdentified,
          icon: Bird,
          color: 'text-[var(--color-text)]',
        },
        {
          label: 'Best Guess Streak',
          value: remoteSummary.bestStreak,
          icon: Zap,
          color: 'text-[var(--color-secondary)]',
        },
        {
          label: 'Best Daily Streak',
          value: effectiveBestDailyStreak,
          icon: CalendarArrowUp,
          color: 'text-[var(--color-success)]',
        },
        {
          label: 'Seeds',
          value: remoteSummary.seeds,
          icon: SeedIcon,
          color: 'text-[var(--color-secondary)]',
        },
      ]
    : [];

  const items = [
    ...summaryItems,
    {
      label: 'Current Guess Streak',
      value: currentStreak,
      icon: Flame,
      color: 'text-[var(--color-streak)]',
    },
    {
      label: 'Current Daily Streak',
      value: effectiveCurrentDailyStreak,
      icon: CalendarDays,
      color: 'text-[var(--color-success)]',
    },
    { label: 'Accuracy', value: `${accuracy}%`, icon: Target, color: 'text-[var(--color-success)]' },
    {
      label: 'Best Weekly Finish',
      value: remoteSummary?.bestWeeklyPlacement ? `#${remoteSummary.bestWeeklyPlacement}` : '---',
      icon: Award,
      color: 'text-[var(--color-secondary)]',
    },
  ];
  const hasOddItemCount = items.length % 2 === 1;

  return (
    <div className="grid grid-cols-2 gap-3">
      {items.map(({ label, value, icon: Icon, color }, index) => (
        <div
          key={label}
          className={`flex items-center gap-3 rounded-xl border border-[var(--color-surface-border)] bg-[var(--color-surface)] p-4 ${
            hasOddItemCount && index === items.length - 1 ? 'col-span-2' : ''
          }`}
        >
          {label === 'Seeds' ? (
            <Icon size={22} className={color} />
          ) : (
            <Icon size={22} className={color} fill="currentColor" />
          )}
          <div className="flex flex-col">
            <span className="text-lg font-bold leading-none">{typeof value === 'number' ? formatNumber(value) : value}</span>
            <span className="mt-0.5 text-[0.65rem] text-[var(--color-muted)]">{label}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
