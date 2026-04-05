'use client';

import { ArrowLeft, CalendarDays, Flame, Gift, Sprout } from 'lucide-react';
import Link from 'next/link';
import MissionPanel from '@/components/game/MissionPanel';
import { useSessionMissions } from '@/hooks/useSessionMissions';
import { useStoredJson } from '@/hooks/useStoredValue';
import { DAILY_MISSION_HISTORY_STORAGE_KEY, getDailyMissionStreaks } from '@/lib/utils/daily-mission-history';
import { formatNumber } from '@/lib/utils/number-format';
import type { DailyMissionHistoryEntry } from '@/types';

export default function DailyChallengePage() {
  const { missions, allCompleted, bonusClaimed, missionSetBonusSeeds } = useSessionMissions();
  const missionHistory = useStoredJson<DailyMissionHistoryEntry[]>(DAILY_MISSION_HISTORY_STORAGE_KEY, []);
  const { currentStreak, bestStreak } = getDailyMissionStreaks(missionHistory);
  const completedCount = missions.filter((mission) => mission.completed).length;
  const claimedCount = missions.filter((mission) => mission.claimed).length;
  const readyToClaimCount = missions.filter((mission) => mission.completed && !mission.claimed).length;
  const canClaimSweepBonus = allCompleted && !bonusClaimed;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8">
      <div className="w-full">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-muted)]">
          <ArrowLeft size={16} />
          Back to classic play
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-[minmax(0,1.2fr)_minmax(16rem,0.8fr)]">
        <section className="rounded-[2rem] border border-[var(--color-surface-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)]">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-[var(--color-secondary)]">
            Daily Missions
          </p>
          <h1 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-bold leading-tight">
            Keep the streak alive by finishing all three missions.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--color-muted)]">
            The old five-round daily run is gone. Your day counts as complete the moment all three missions are done, whether you claim the seeds now or later.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-[var(--color-surface-border)] bg-[var(--color-surface-hover)] p-4">
              <div className="inline-flex items-center gap-2 text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">
                <Flame size={14} />
                Current Streak
              </div>
              <p className="mt-3 font-[family-name:var(--font-display)] text-3xl font-bold">{currentStreak}</p>
              <p className="mt-2 text-xs text-[var(--color-muted)]">Consecutive mission days completed.</p>
            </div>

            <div className="rounded-2xl border border-[var(--color-surface-border)] bg-[var(--color-surface-hover)] p-4">
              <div className="inline-flex items-center gap-2 text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">
                <CalendarDays size={14} />
                Today
              </div>
              <p className="mt-3 font-[family-name:var(--font-display)] text-3xl font-bold">{completedCount}/3</p>
              <p className="mt-2 text-xs text-[var(--color-muted)]">Mission cards completed so far.</p>
            </div>

            <div className="rounded-2xl border border-[var(--color-surface-border)] bg-[var(--color-surface-hover)] p-4">
              <div className="inline-flex items-center gap-2 text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">
                <Gift size={14} />
                Claim Queue
              </div>
              <p className="mt-3 font-[family-name:var(--font-display)] text-3xl font-bold">
                {readyToClaimCount + (canClaimSweepBonus ? 1 : 0)}
              </p>
              <p className="mt-2 text-xs text-[var(--color-muted)]">Rewards waiting in Missions or Rewards.</p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/rewards"
              className="inline-flex items-center gap-2 rounded-full bg-[var(--color-secondary)] px-4 py-2 text-sm font-semibold text-[var(--color-on-secondary)] transition hover:brightness-110"
            >
              <Sprout size={16} />
              Open rewards
            </Link>
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-surface-border)] bg-[var(--color-surface-hover)] px-4 py-2 text-sm text-[var(--color-muted)]">
              Best streak: {bestStreak}
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-surface-border)] bg-[var(--color-surface-hover)] px-4 py-2 text-sm text-[var(--color-muted)]">
              Claimed today: {claimedCount}/{missions.length || 3}
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-[var(--color-surface-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)]">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
            Sweep Bonus
          </p>
          <h2 className="mt-2 font-[family-name:var(--font-display)] text-2xl font-bold leading-tight">
            {allCompleted
              ? `Clean sweep unlocked: ${formatNumber(missionSetBonusSeeds)} bonus seeds.`
              : 'Finish the full set for an extra clean sweep payout.'}
          </h2>
          <p className="mt-3 text-sm leading-6 text-[var(--color-muted)]">
            {allCompleted
              ? bonusClaimed
                ? 'You already locked in today\'s sweep bonus.'
                : 'The streak is already safe for today. Claim the sweep bonus whenever you want.'
              : 'Mission completion preserves the streak immediately. Claiming is just the payout layer.'}
          </p>
        </section>
      </div>

      <MissionPanel containerClassName="w-full" />
    </div>
  );
}