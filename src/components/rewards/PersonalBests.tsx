'use client';

import { Flame, Zap, Target, Bird } from 'lucide-react';
import { useStoredJson } from '@/hooks/useStoredValue';

interface Stats {
  birdsSeen: number;
  birdsIdentified: number;
  currentStreak: number;
  bestStreak: number;
}

export default function PersonalBests() {
  const stats = useStoredJson<Stats | null>('birdScore', null);

  if (!stats) return null;

  const { birdsSeen, birdsIdentified, currentStreak, bestStreak } = stats;
  const accuracy = birdsSeen > 0 ? Math.floor((birdsIdentified / birdsSeen) * 100) : 0;

  const items = [
    { label: 'Best Streak', value: bestStreak, icon: Zap, color: 'text-[var(--color-secondary)]' },
    { label: 'Current Streak', value: currentStreak, icon: Flame, color: 'text-orange-400' },
    { label: 'Accuracy', value: `${accuracy}%`, icon: Target, color: 'text-emerald-400' },
    { label: 'Birds Identified', value: birdsIdentified, icon: Bird, color: 'text-sky-400' },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {items.map(({ label, value, icon: Icon, color }) => (
        <div
          key={label}
          className="flex items-center gap-3 p-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-surface-border)]"
        >
          <Icon size={22} className={color} fill="currentColor" />
          <div className="flex flex-col">
            <span className="font-bold text-lg leading-none">{value}</span>
            <span className="text-[0.65rem] text-[var(--color-muted)] mt-0.5">{label}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
