'use client';

import { CalendarDays, CheckCircle2, Sprout, Trophy } from 'lucide-react';
import MissionPanel from '@/components/game/MissionPanel';
import { useDailyChallengeState } from '@/hooks/useDailyChallengeState';
import { useSessionMissions } from '@/hooks/useSessionMissions';
import { useSound } from '@/hooks/useSound';
import { track } from '@/lib/analytics';
import { claimDailyChallengeBonuses, getUnclaimedDailyChallengeRewardSeeds } from '@/lib/utils/daily-challenge';
import { hasPendingMissionSetBonus } from '@/lib/utils/rewards-notification';

export default function DailyRewardsPanel() {
  const { play } = useSound();
  const { state: dailyState, isComplete } = useDailyChallengeState();
  const { missions, bonusClaimed } = useSessionMissions();
  const pendingDailyRewardSeeds = getUnclaimedDailyChallengeRewardSeeds(dailyState);
  const hasMissionSetBonusReady = hasPendingMissionSetBonus({
    date: dailyState.date,
    missions,
    bonusClaimed,
  });

  return (
    <section className="space-y-4">
      <div>
        <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold mb-3">
          Daily Rewards
        </h2>
        <div className="rounded-2xl border border-[var(--color-surface-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-card)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">
                Daily Challenge
              </p>
              <h3 className="mt-1 font-[family-name:var(--font-display)] text-lg font-semibold">
                Claim your challenge payout
              </h3>
            </div>
            <div className="inline-flex items-center gap-1 rounded-full bg-[var(--color-surface-hover)] px-2 py-1 text-[0.65rem] font-semibold text-[var(--color-muted)]">
              <CalendarDays size={12} />
              {dailyState.correctAnswers}/5
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2 text-[0.7rem] font-semibold text-[var(--color-muted)]">
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-surface-hover)] px-2 py-1">
              <Trophy size={12} />
              {isComplete ? 'Complete' : 'In progress'}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-surface-hover)] px-2 py-1">
              <Sprout size={12} />
              {pendingDailyRewardSeeds > 0 ? `${pendingDailyRewardSeeds} ready` : `${dailyState.bonusSeedsAwarded} total`}
            </span>
          </div>

          <p className="mt-4 text-sm leading-6 text-[var(--color-muted)]">
            {!isComplete
              ? 'Finish the Daily Challenge to unlock today\'s bonus seeds.'
              : pendingDailyRewardSeeds > 0
                ? `Your ${pendingDailyRewardSeeds} daily bonus seeds are waiting here until you claim them.`
                : 'Today\'s Daily Challenge reward has already been claimed.'}
          </p>

          <div className="mt-4 flex items-center justify-between gap-3">
            {pendingDailyRewardSeeds > 0 ? (
              <div className="inline-flex items-center gap-1 text-[0.7rem] font-semibold text-emerald-400">
                <CheckCircle2 size={14} />
                Ready to claim
              </div>
            ) : (
              <span className="text-[0.7rem] text-[var(--color-muted)]">
                {isComplete ? 'Already claimed' : 'Complete today\'s run first'}
              </span>
            )}

            <button
              type="button"
              disabled={pendingDailyRewardSeeds <= 0}
              onClick={() => {
                play('streak');
                claimDailyChallengeBonuses();
                track('daily_reward_claimed', { reward_seeds: pendingDailyRewardSeeds, date: dailyState.date });
              }}
              className={`rounded-full px-3 py-1.5 text-[0.7rem] font-semibold transition ${
                pendingDailyRewardSeeds > 0
                  ? 'bg-[var(--color-secondary)] text-[var(--color-on-secondary)]'
                  : 'bg-[var(--color-surface-border)] text-[var(--color-muted)]'
              }`}
            >
              {pendingDailyRewardSeeds > 0 ? 'Claim Daily Reward' : 'Claimed'}
            </button>
          </div>
        </div>
      </div>

      <MissionPanel containerClassName="w-full" />

      {hasMissionSetBonusReady ? (
        <p className="text-xs text-[var(--color-muted)]">
          The clean sweep mission bonus is ready too.
        </p>
      ) : null}
    </section>
  );
}