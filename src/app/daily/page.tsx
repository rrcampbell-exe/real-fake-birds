'use client';

import { CalendarDays, Flame, Gift, Sprout } from 'lucide-react';
import Link from 'next/link';
import MissionPanel from '@/components/game/MissionPanel';
import { useSessionMissions } from '@/hooks/useSessionMissions';
import { useStoredJson } from '@/hooks/useStoredValue';
import { DAILY_MISSION_HISTORY_STORAGE_KEY, getDailyMissionStreaks } from '@/lib/utils/daily-mission-history';
import type { DailyMissionHistoryEntry } from '@/types';

export default function DailyChallengePage() {
  const { missions, allCompleted, bonusClaimed } = useSessionMissions();
  const missionHistory = useStoredJson<DailyMissionHistoryEntry[]>(DAILY_MISSION_HISTORY_STORAGE_KEY, []);
  const { currentStreak } = getDailyMissionStreaks(missionHistory);
  const completedCount = missions.filter((mission) => mission.completed).length;
  const readyToClaimCount = missions.filter((mission) => mission.completed && !mission.claimed).length;
  const canClaimSweepBonus = allCompleted && !bonusClaimed;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8">

      <section className="rounded-[2rem] border border-[var(--color-surface-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)]">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-[var(--color-secondary)]">
            Daily Missions
          </p>
          <h1 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-bold leading-tight">
            Keep the streak alive by finishing all three missions.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--color-muted)]">
            Complete three missions each day to keep your daily streak alive.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-[var(--color-surface-border)] bg-[var(--color-surface-hover)] p-4">
              <div className="inline-flex items-center gap-2 text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">
                <Flame size={14} />
                Current Streak
              </div>
              <p className="mt-3 font-[family-name:var(--font-display)] text-3xl font-bold">{currentStreak}</p>
              <p className="mt-2 text-xs text-[var(--color-muted)]">Consecutive mission days completed</p>
            </div>

            <div className="rounded-2xl border border-[var(--color-surface-border)] bg-[var(--color-surface-hover)] p-4">
              <div className="inline-flex items-center gap-2 text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">
                <CalendarDays size={14} />
                Today
              </div>
              <p className="mt-3 font-[family-name:var(--font-display)] text-3xl font-bold">{completedCount}/3</p>
              <p className="mt-2 text-xs text-[var(--color-muted)]">Mission cards completed so far</p>
            </div>

            <div className="rounded-2xl border border-[var(--color-surface-border)] bg-[var(--color-surface-hover)] p-4">
              <div className="inline-flex items-center gap-2 text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">
                <Gift size={14} />
                Claim Queue
              </div>
              <p className="mt-3 font-[family-name:var(--font-display)] text-3xl font-bold">
                {readyToClaimCount + (canClaimSweepBonus ? 1 : 0)}
              </p>
              <p className="mt-2 text-xs text-[var(--color-muted)]">Rewards waiting in Missions or Rewards</p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/rewards"
              className="inline-flex items-center gap-2 rounded-full bg-[var(--color-secondary)] px-4 py-2 text-sm font-semibold text-[var(--color-on-secondary)] transition hover:brightness-110"
            >
              <Sprout size={16} />
              Open Rewards
            </Link>
          </div>
      </section>

      <MissionPanel containerClassName="w-full" />
    </div>
  );
}