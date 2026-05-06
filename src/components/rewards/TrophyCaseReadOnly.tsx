'use client';

import { milestones } from '@/lib/constants/milestones';
import MilestoneBadgeSvg from '@/components/icons/MilestoneBadgeSvg';
import { formatNumber } from '@/lib/utils/number-format';
import { finch } from '@/lib/themes';
import { resolveTheme } from '@/lib/utils/theme-handler';
import { useStoredJson } from '@/hooks/useStoredValue';

interface TrophyCaseReadOnlyProps {
  birdsIdentified: number;
  firstPlaceCount: number;
  secondPlaceCount: number;
  thirdPlaceCount: number;
  /** Max number of milestone badges to show. Defaults to showing all earned. */
  badgeLimit?: number;
}

/**
 * Read-only trophy display for other-user profiles.
 * Shows up to `badgeLimit` most-recently-earned milestone badges + podium finishes.
 * Does not read from AccountState.
 */
export default function TrophyCaseReadOnly({
  birdsIdentified,
  firstPlaceCount,
  secondPlaceCount,
  thirdPlaceCount,
  badgeLimit,
}: TrophyCaseReadOnlyProps) {
  const { textColor } = resolveTheme(useStoredJson('birdTheme', finch));

  const earnedMilestones = milestones.filter((m) => m.value <= birdsIdentified);
  // Show the highest earned badges but keep them ordered lowest->highest across the row.
  const displayMilestones = badgeLimit != null
    ? earnedMilestones.slice(-badgeLimit)
    : [...earnedMilestones];

  const hasPodiums = firstPlaceCount > 0 || secondPlaceCount > 0 || thirdPlaceCount > 0;

  if (displayMilestones.length === 0 && !hasPodiums) {
    return (
      <p className="text-sm text-[var(--color-muted)]">No trophies earned yet.</p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {displayMilestones.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {displayMilestones.map((milestone) => (
            <div
              key={milestone.value}
              className="relative flex flex-col items-center gap-2 rounded-xl border border-[var(--color-secondary)] bg-[var(--color-surface)] p-4"
            >
              <div className="relative flex h-14 w-14 items-center justify-center">
                <MilestoneBadgeSvg color={textColor} milestoneValue={milestone.value} />
                <span
                  aria-label={`${formatNumber(milestone.value)} birds milestone`}
                  className="absolute -bottom-1 -right-1 inline-flex min-w-9 items-center justify-center rounded-full border border-[var(--color-secondary)] bg-[var(--color-secondary)] text-[var(--color-on-secondary)] px-2 py-1 text-[0.65rem] font-semibold leading-none"
                >
                  {formatNumber(milestone.value)}
                </span>
              </div>
              <span className="font-[family-name:var(--font-display)] text-center text-xs font-semibold leading-tight">
                {milestone.badge}
              </span>
              <span className="text-center text-[0.6rem] leading-snug text-[var(--color-muted)]">
                {milestone.description}
              </span>
            </div>
          ))}
        </div>
      )}

      {hasPodiums && (
        <div className="rounded-2xl border border-[var(--color-surface-border)] bg-[var(--color-surface)] p-4">
          <h3 className="font-[family-name:var(--font-display)] text-base font-semibold mb-3">
            Weekly Champions
          </h3>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'First Place', symbol: '🥇', count: firstPlaceCount },
              { label: 'Second Place', symbol: '🥈', count: secondPlaceCount },
              { label: 'Third Place', symbol: '🥉', count: thirdPlaceCount },
            ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-xl border border-[var(--color-surface-border)] bg-[var(--color-surface-hover)] p-4"
                >
                  <p className="text-2xl">{item.symbol}</p>
                  <p className="mt-3 text-sm font-semibold">{item.label}</p>
                  <p className="mt-1 text-sm text-[var(--color-muted)]">
                    {item.count} time{item.count === 1 ? '' : 's'}
                  </p>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
