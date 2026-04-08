'use client';

import { CheckCircle2, Sprout } from 'lucide-react';
import Link from 'next/link';
import { useSessionMissions } from '@/hooks/useSessionMissions';
import { useSound } from '@/hooks/useSound';
import { track } from '@/lib/analytics';
import { formatNumber } from '@/lib/utils/number-format';

interface MissionPanelProps {
  showClaimActions?: boolean;
  containerClassName?: string;
  isLoading?: boolean;
}

export default function MissionPanel({
  showClaimActions = true,
  containerClassName = 'w-full max-w-md px-4',
  isLoading = false,
}: MissionPanelProps) {
  const { play } = useSound();
  const {
    missions,
    allCompleted,
    bonusClaimed,
    missionSetBonusSeeds,
    claimMissionReward,
    claimMissionSetBonus,
  } = useSessionMissions();

  if (isLoading) {
    return (
      <section className={containerClassName}>
        <div className="rounded-2xl border border-[var(--color-surface-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-card)] animate-pulse">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="h-3 w-24 rounded bg-[var(--color-surface-border)]" />
              <div className="mt-2 h-6 w-40 rounded bg-[var(--color-surface-border)]" />
            </div>
            <div className="h-7 w-12 rounded-full bg-[var(--color-surface-border)]" />
          </div>

          <div className="mt-4 space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={`mission-skeleton-${index}`}
                className="rounded-xl border border-[var(--color-surface-border)] bg-[var(--color-surface-hover)] p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="h-4 w-4/5 rounded bg-[var(--color-surface-border)]" />
                    <div className="mt-2 h-3 w-24 rounded bg-[var(--color-surface-border)]" />
                  </div>
                  <div className="h-7 w-14 rounded-full bg-[var(--color-surface)]" />
                </div>

                <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--color-surface-border)]">
                  <div
                    className="h-full rounded-full bg-[color-mix(in_srgb,var(--color-secondary)_40%,var(--color-surface-border))]"
                    style={{ width: `${35 + index * 20}%` }}
                  />
                </div>

                <div className="mt-3 flex items-center justify-between gap-3">
                  <div className="h-3 w-20 rounded bg-[var(--color-surface-border)]" />
                  <div className="h-8 w-16 rounded-full bg-[var(--color-surface-border)]" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (missions.length === 0) {
    return null;
  }

  return (
    <section className={containerClassName}>
      <div className="rounded-2xl border border-[var(--color-surface-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-card)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">
              Daily Missions
            </p>
            <h2 className="mt-1 font-[family-name:var(--font-display)] text-lg font-semibold">
              Small wins, extra seeds
            </h2>
          </div>
          <div className="inline-flex items-center gap-1 rounded-full bg-[var(--color-surface-hover)] px-2 py-1 text-[0.65rem] font-semibold text-[var(--color-muted)]">
            <Sprout size={12} />
            {missions.filter((mission) => mission.claimed).length}/{missions.length}
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {missions.map((mission) => {
            const progressWidth = `${Math.min((mission.progress / mission.target) * 100, 100)}%`;

            return (
              <div
                key={mission.id}
                className="rounded-xl border border-[var(--color-surface-border)] bg-[var(--color-surface-hover)] p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold leading-tight">{mission.description}</p>
                    <p className="mt-1 text-[0.7rem] text-[var(--color-muted)]">
                      {mission.progress}/{mission.target} progress
                    </p>
                  </div>
                  <div className="inline-flex items-center gap-1 rounded-full bg-[var(--color-surface)] px-2 py-1 text-[0.65rem] font-semibold text-[var(--color-muted)]">
                    <Sprout size={12} />
                    {formatNumber(mission.rewardSeeds)}
                  </div>
                </div>

                <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--color-surface-border)]">
                  <div
                    className="h-full rounded-full bg-[var(--color-secondary)] transition-all duration-300"
                    style={{ width: progressWidth }}
                  />
                </div>

                <div className="mt-3 flex items-center justify-between gap-3">
                  {mission.completed ? (
                    <div className="inline-flex items-center gap-1 text-[0.7rem] font-semibold text-[var(--color-success)]">
                      <CheckCircle2 size={14} />
                      {mission.claimed ? 'Claimed' : 'Ready to claim'}
                    </div>
                  ) : (
                    <span className="text-[0.7rem] text-[var(--color-muted)]">Keep going</span>
                  )}

                  {showClaimActions ? (
                    <button
                      type="button"
                      disabled={!mission.completed || mission.claimed}
                      onClick={async () => {
                        play('streak');
                        try {
                          await claimMissionReward(mission.id);
                          track('mission_claimed', { mission_id: mission.id, reward_seeds: mission.rewardSeeds });
                        } catch {
                          // The hook restores local state if the direct claim fails.
                        }
                      }}
                      className={`rounded-full px-3 py-1.5 text-[0.7rem] font-semibold transition ${
                        mission.completed && !mission.claimed
                          ? 'bg-[var(--color-secondary)] text-[var(--color-on-secondary)]'
                          : 'bg-[var(--color-surface-border)] text-[var(--color-muted)]'
                      }`}
                    >
                      {mission.claimed ? 'Claimed' : 'Claim'}
                    </button>
                  ) : mission.completed && !mission.claimed ? (
                    <Link
                      href="/rewards"
                      className="rounded-full bg-[var(--color-surface)] px-3 py-1.5 text-[0.7rem] font-semibold text-[var(--color-text)]"
                    >
                      Claim in Rewards
                    </Link>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>

        {allCompleted && (
          <div className="mt-4 rounded-xl border border-dashed border-[var(--color-secondary)] bg-[var(--color-surface-hover)] p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">Clean sweep bonus</p>
                <p className="text-[0.7rem] text-[var(--color-muted)]">
                  Claim {formatNumber(missionSetBonusSeeds)} more seeds for finishing all three missions.
                </p>
              </div>
              {showClaimActions ? (
                <button
                  type="button"
                  disabled={!allCompleted || bonusClaimed}
                  onClick={async () => {
                    play('streak');
                    try {
                      await claimMissionSetBonus();
                      track('mission_claimed', { mission_id: 'daily-set-bonus', reward_seeds: missionSetBonusSeeds });
                    } catch {
                      // The hook restores local state if the direct claim fails.
                    }
                  }}
                  className={`rounded-full px-3 py-1.5 text-[0.7rem] font-semibold transition ${
                    allCompleted && !bonusClaimed
                      ? 'bg-[var(--color-secondary)] text-[var(--color-on-secondary)]'
                      : 'bg-[var(--color-surface-border)] text-[var(--color-muted)]'
                  }`}
                >
                  {bonusClaimed ? 'Claimed' : 'Claim'}
                </button>
              ) : allCompleted && !bonusClaimed ? (
                <Link
                  href="/rewards"
                  className="rounded-full bg-[var(--color-surface)] px-3 py-1.5 text-[0.7rem] font-semibold text-[var(--color-text)]"
                >
                  Claim in Rewards
                </Link>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}