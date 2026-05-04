'use client';

import SeedIcon from '@/components/icons/SeedIcon';
import { formatNumber } from '@/lib/utils/number-format';
import type { ProfileProgressSummary } from '@/types/profile';

interface ProgressSummaryProps {
  progress: ProfileProgressSummary;
}

export default function ProgressSummary({ progress }: ProgressSummaryProps) {
  return (
    <section>
      <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold mb-3">
        Stats
      </h2>
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Birds Identified" value={formatNumber(progress.birdsIdentified)} />
        <StatCard label="Best Streak" value={formatNumber(progress.bestStreak)} />
        <StatCard label="Best Daily Streak" value={formatNumber(progress.bestDailyStreak)} />
        <div className="rounded-2xl border border-[var(--color-surface-border)] bg-[var(--color-surface-hover)] px-4 py-3 flex flex-col gap-1">
          <p className="text-[0.65rem] uppercase tracking-[0.12em] text-[var(--color-muted)] font-medium">Seeds</p>
          <p className="font-[family-name:var(--font-display)] text-xl font-bold flex items-center gap-1">
            <SeedIcon size={16} />
            {formatNumber(progress.seeds)}
          </p>
        </div>
      </div>
    </section>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--color-surface-border)] bg-[var(--color-surface-hover)] px-4 py-3 flex flex-col gap-1">
      <p className="text-[0.65rem] uppercase tracking-[0.12em] text-[var(--color-muted)] font-medium">{label}</p>
      <p className="font-[family-name:var(--font-display)] text-xl font-bold">{value}</p>
    </div>
  );
}
