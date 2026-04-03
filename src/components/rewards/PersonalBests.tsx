'use client';

import { Flame, Zap, Target, Bird } from 'lucide-react';
import SeedIcon from '@/components/icons/SeedIcon';
import { useStoredJson } from '@/hooks/useStoredValue';
import { defaultBirdScore, normalizeBirdScore } from '@/lib/utils/player-progress';

export default function PersonalBests() {
  const storedStats = useStoredJson<typeof defaultBirdScore | null>('birdScore', null);

  if (!storedStats) return null;

  const { birdsSeen, birdsIdentified, currentStreak, bestStreak, seeds } = normalizeBirdScore(storedStats);
  const accuracy = birdsSeen > 0 ? Math.floor((birdsIdentified / birdsSeen) * 100) : 0;

  const items = [
    { label: 'Best Streak', value: bestStreak, icon: Zap, color: 'text-[var(--color-secondary)]' },
    { label: 'Current Streak', value: currentStreak, icon: Flame, color: 'text-orange-400' },
    { label: 'Accuracy', value: `${accuracy}%`, icon: Target, color: 'text-emerald-400' },
    { label: 'Birds Identified', value: birdsIdentified, icon: Bird, color: 'text-sky-400' },
    { label: 'Seeds', value: seeds, icon: SeedIcon, color: 'text-[var(--color-secondary)]' },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
        {items.map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            className="flex items-center gap-3 rounded-xl border border-[var(--color-surface-border)] bg-[var(--color-surface)] p-4"
          >
            {label === 'Seeds' ? (
              <Icon size={22} className={color} />
            ) : (
              <Icon size={22} className={color} fill="currentColor" />
            )}
            <div className="flex flex-col">
              <span className="text-lg font-bold leading-none">{value}</span>
              <span className="mt-0.5 text-[0.65rem] text-[var(--color-muted)]">{label}</span>
            </div>
          </div>
        ))}
    </div>
  );
}
