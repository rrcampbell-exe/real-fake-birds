'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock } from 'lucide-react';
import { milestones } from '@/lib/constants/milestones';
import MilestoneBadgeSvg from '@/components/icons/MilestoneBadgeSvg';
import { getTheme } from '@/lib/utils/theme-handler';
import type { Milestone } from '@/types';

export default function TrophyCase() {
  const [earned] = useState<Milestone[]>(() => {
    if (typeof window === 'undefined') return [];
    const raw = localStorage.getItem('birdMilestonesArray');
    return raw ? (JSON.parse(raw) as Milestone[]) : [];
  });
  const { textColor } = getTheme();

  const earnedValues = new Set(earned.map((m) => m.value));

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {milestones.map((milestone, i) => {
        const isEarned = earnedValues.has(milestone.value);

        return (
          <motion.div
            key={milestone.value}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border transition-colors ${
              isEarned
                ? 'bg-[var(--color-surface)] border-[var(--color-secondary)]'
                : 'bg-[var(--color-surface)] border-[var(--color-surface-border)] opacity-50'
            }`}
          >
            {isEarned ? (
              <MilestoneBadgeSvg color={textColor} milestoneValue={milestone.value} />
            ) : (
              <div className="w-12 h-12 flex items-center justify-center rounded-full bg-[var(--color-surface-border)]">
                <Lock size={20} className="text-[var(--color-muted)]" />
              </div>
            )}
            <span className="font-[family-name:var(--font-display)] text-xs font-semibold text-center leading-tight">
              {milestone.badge}
            </span>
            <span className="text-[0.6rem] text-[var(--color-muted)] text-center leading-snug">
              {isEarned ? milestone.description : `Identify ${milestone.value} birds`}
            </span>
          </motion.div>
        );
      })}
    </div>
  );
}
