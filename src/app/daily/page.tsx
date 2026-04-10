'use client';

import { Bird, CalendarDays, Flame, Gift, Sprout } from 'lucide-react';
import Link from 'next/link';
import ShareButton from '@/components/ShareButton';
import MissionPanel from '@/components/game/MissionPanel';
import { usePageProgressSync } from '@/hooks/usePageProgressSync';
import { useSessionMissions } from '@/hooks/useSessionMissions';
import { useStoredJson } from '@/hooks/useStoredValue';
import { finch } from '@/lib/themes';
import { buildDailyMissionSharePayload } from '@/lib/utils/share-data';
import { DAILY_MISSION_HISTORY_STORAGE_KEY, getDailyMissionStreaks } from '@/lib/utils/daily-mission-history';
import { resolveTheme } from '@/lib/utils/theme-handler';
import type { DailyMissionHistoryEntry, Theme } from '@/types';

export default function DailyChallengePage() {
  const { isPageBackgroundRefreshing } = usePageProgressSync();
  const { missions, allCompleted, bonusClaimed } = useSessionMissions();
  const missionHistory = useStoredJson<DailyMissionHistoryEntry[]>(DAILY_MISSION_HISTORY_STORAGE_KEY, []);
  const storedTheme = useStoredJson<Theme>('birdTheme', finch);
  const { currentStreak } = getDailyMissionStreaks(missionHistory);
  const currentTheme = resolveTheme(storedTheme);
  const completedCount = missions.filter((mission) => mission.completed).length;
  const rewardedCount = missions.filter((mission) => mission.claimed).length + (bonusClaimed ? 1 : 0);
  const sharePayload = buildDailyMissionSharePayload({
    currentStreak,
    completedCount,
    missionCount: missions.length,
  });

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
          {isPageBackgroundRefreshing ? (
            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-[var(--color-surface-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-medium text-[var(--color-muted)]">
              <Bird size={14} className="text-[var(--color-secondary)]" />
              Checking today&apos;s flock tasks...
            </div>
          ) : null}

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
                Rewards Paid
              </div>
              <p className="mt-3 font-[family-name:var(--font-display)] text-3xl font-bold">{rewardedCount}</p>
              <p className="mt-2 text-xs text-[var(--color-muted)]">
                {allCompleted ? 'Today\'s mission rewards have already been awarded.' : 'Mission rewards land instantly when you finish them.'}
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <ShareButton
              payload={sharePayload}
              eventLabel="daily-summary"
              imageParams={{
                type: 'daily-summary',
                params: {
                  themeName: currentTheme.name,
                  currentStreak,
                  completedCount,
                  rewardedCount,
                  missionCount: missions.length,
                },
              }}
            />
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