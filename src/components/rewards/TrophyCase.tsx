'use client';

import { motion } from 'framer-motion';
import { Lock } from 'lucide-react';
import ShareButton from '@/components/ShareButton';
import { useAccountState } from '@/components/account/AccountStateProvider';
import { milestones } from '@/lib/constants/milestones';
import MilestoneBadgeSvg from '@/components/icons/MilestoneBadgeSvg';
import { finch } from '@/lib/themes';
import type { BirdScore } from '@/types';
import { useStoredJson } from '@/hooks/useStoredValue';
import { buildMilestoneSharePayload, buildWeeklyChampionSharePayload } from '@/lib/utils/share-data';
import { formatNumber } from '@/lib/utils/number-format';
import { resolveTheme } from '@/lib/utils/theme-handler';

export default function TrophyCase() {
  const { remoteSummary } = useAccountState();
  const score = useStoredJson<BirdScore | null>('birdScore', null);
  const { textColor } = resolveTheme(useStoredJson('birdTheme', finch));

  const birdsIdentified = score?.birdsIdentified ?? 0;
  const earnedValues = new Set(
    milestones.filter((m) => m.value <= birdsIdentified).map((m) => m.value)
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {milestones.map((milestone, i) => {
          const isEarned = earnedValues.has(milestone.value);
          const milestoneLabel = formatNumber(milestone.value);

          return (
            <motion.div
              key={milestone.value}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className={`relative flex flex-col items-center gap-2 rounded-xl border p-4 transition-colors ${
                isEarned
                  ? 'border-[var(--color-secondary)] bg-[var(--color-surface)]'
                  : 'border-[var(--color-surface-border)] bg-[var(--color-surface)] opacity-50'
              }`}
            >
              <div className="relative flex h-14 w-14 items-center justify-center">
                {isEarned ? (
                  <MilestoneBadgeSvg color={textColor} milestoneValue={milestone.value} />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-surface-border)]">
                    <Lock size={20} className="text-[var(--color-muted)]" />
                  </div>
                )}
                <span
                  aria-label={`${milestoneLabel} birds to earn ${milestone.badge}`}
                  className={`absolute -bottom-1 -right-1 inline-flex min-w-9 items-center justify-center rounded-full border px-2 py-1 text-[0.65rem] font-semibold leading-none ${
                    isEarned
                      ? 'border-[var(--color-secondary)] bg-[var(--color-secondary)] text-[var(--color-on-secondary)]'
                      : 'border-[var(--color-surface-border)] bg-[var(--color-surface)] text-[var(--color-text)]'
                  }`}
                >
                  {milestoneLabel}
                </span>
              </div>
              <span className="font-[family-name:var(--font-display)] text-center text-xs font-semibold leading-tight">
                {milestone.badge}
              </span>
              <span className="text-center text-[0.6rem] leading-snug text-[var(--color-muted)]">
                {isEarned ? milestone.description : `Identify ${formatNumber(milestone.value)} birds to unlock this feather.`}
              </span>
              {isEarned ? (
                <ShareButton
                  payload={buildMilestoneSharePayload({
                    badgeName: milestone.badge,
                    birdsIdentified,
                  })}
                  eventLabel={`badge-${milestone.value}`}
                  className="mt-auto"
                />
              ) : null}
            </motion.div>
          );
        })}
      </div>

      <section className="rounded-2xl border border-[var(--color-surface-border)] bg-[var(--color-surface)] p-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h3 className="font-[family-name:var(--font-display)] text-base font-semibold">Weekly Champions</h3>
            <p className="mt-1 text-sm text-[var(--color-muted)]">Top-three weekly finishes stack up here.</p>
          </div>
          {remoteSummary ? (
            <ShareButton
              payload={buildWeeklyChampionSharePayload({
                firstPlaceCount: remoteSummary.firstPlaceCount,
                secondPlaceCount: remoteSummary.secondPlaceCount,
                thirdPlaceCount: remoteSummary.thirdPlaceCount,
              })}
              eventLabel="weekly-champions"
            />
          ) : null}
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            { label: 'First Place', symbol: '🥇', count: remoteSummary?.firstPlaceCount ?? 0 },
            { label: 'Second Place', symbol: '🥈', count: remoteSummary?.secondPlaceCount ?? 0 },
            { label: 'Third Place', symbol: '🥉', count: remoteSummary?.thirdPlaceCount ?? 0 },
          ].map((item) => (
            <div key={item.label} className="rounded-xl border border-[var(--color-surface-border)] bg-[var(--color-surface-hover)] p-4">
              <p className="text-2xl">{item.symbol}</p>
              <p className="mt-3 text-sm font-semibold">{item.label}</p>
              <p className="mt-1 text-sm text-[var(--color-muted)]">
                {item.count > 0 ? `${item.count} time${item.count === 1 ? '' : 's'}` : 'Not earned yet'}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
