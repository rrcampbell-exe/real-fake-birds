'use client';

import { useEffect, useState } from 'react';
import { CalendarDays, CheckCircle2, Gift, Sprout, Trophy } from 'lucide-react';
import MissionPanel from '@/components/game/MissionPanel';
import { useDailyChallengeState } from '@/hooks/useDailyChallengeState';
import { useSessionMissions } from '@/hooks/useSessionMissions';
import { useSound } from '@/hooks/useSound';
import { flushQueuedProgressEventsForSignedInUser } from '@/lib/auth/account-session';
import { claimDailyChallengeBonusesDirect } from '@/lib/auth/account-sync';
import { track } from '@/lib/analytics';
import {
  claimDailyChallengeBonuses,
  getUnclaimedDailyChallengeRewardSeeds,
  markDailyChallengeBonusesClaimed,
  readDailyChallengeState,
  writeDailyChallengeState,
} from '@/lib/utils/daily-challenge';
import { formatNumber } from '@/lib/utils/number-format';
import { hasPendingMissionSetBonus } from '@/lib/utils/rewards-notification';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { hasSupabaseEnv } from '@/lib/supabase/env';
import { readBirdScore, writeBirdScore } from '@/lib/utils/player-progress';

export default function DailyRewardsPanel() {
  const supabaseReady = hasSupabaseEnv();
  const { play } = useSound();
  const { state: dailyState, isComplete } = useDailyChallengeState();
  const {
    missions,
    allCompleted,
    bonusClaimed,
    missionSetBonusSeeds,
    claimMissionReward,
    claimMissionSetBonus,
  } = useSessionMissions();
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [isClaimingDailyReward, setIsClaimingDailyReward] = useState(false);
  const [isClaimingAllRewards, setIsClaimingAllRewards] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);
  const pendingDailyRewardSeeds = getUnclaimedDailyChallengeRewardSeeds(dailyState);
  const hasMissionSetBonusReady = hasPendingMissionSetBonus({
    date: dailyState.date,
    missions,
    bonusClaimed,
  });
  const claimableMissionRewards = missions.filter((mission) => mission.completed && !mission.claimed);
  const claimableRewardCount = (pendingDailyRewardSeeds > 0 ? 1 : 0)
    + claimableMissionRewards.length
    + (hasMissionSetBonusReady ? 1 : 0);

  const claimDailyReward = async (): Promise<boolean> => {
    if (pendingDailyRewardSeeds <= 0 || isClaimingDailyReward) {
      return false;
    }

    play('streak');
    setClaimError(null);
    if (isSignedIn) {
      const previousScore = readBirdScore();
      const previousDailyState = readDailyChallengeState(dailyState.date);

      claimDailyChallengeBonuses();
      setIsClaimingDailyReward(true);

      try {
        await flushQueuedProgressEventsForSignedInUser();
        const response = await claimDailyChallengeBonusesDirect({
          date: dailyState.date,
          rewardSeeds: pendingDailyRewardSeeds,
          correctAnswers: dailyState.correctAnswers,
          roundsPlayed: dailyState.roundsPlayed,
        });
        writeBirdScore({
          birdsSeen: response.progressSummary.birdsSeen,
          birdsIdentified: response.progressSummary.birdsIdentified,
          currentStreak: response.progressSummary.currentStreak,
          seeds: response.progressSummary.seeds,
          bestStreak: response.progressSummary.bestStreak,
          currentDailyStreak: response.progressSummary.currentDailyStreak,
          bestDailyStreak: response.progressSummary.bestDailyStreak,
        });
        markDailyChallengeBonusesClaimed();
      } catch (error) {
        writeBirdScore(previousScore);
        writeDailyChallengeState(previousDailyState);
        setClaimError(error instanceof Error ? error.message : 'Unable to claim the daily reward.');
        return false;
      } finally {
        setIsClaimingDailyReward(false);
      }
    } else {
      claimDailyChallengeBonuses();
    }

    track('daily_reward_claimed', { reward_seeds: pendingDailyRewardSeeds, date: dailyState.date });
    return true;
  };

  const claimAllRewards = async () => {
    if (claimableRewardCount === 0 || isClaimingAllRewards) {
      return;
    }

    setIsClaimingAllRewards(true);
    setClaimError(null);

    try {
      if (pendingDailyRewardSeeds > 0) {
        const claimedDailyReward = await claimDailyReward();
        if (!claimedDailyReward) {
          return;
        }
      }

      for (const mission of claimableMissionRewards) {
        await claimMissionReward(mission.id);
        track('mission_claimed', { mission_id: mission.id, reward_seeds: mission.rewardSeeds });
      }

      if (allCompleted && !bonusClaimed) {
        await claimMissionSetBonus();
        track('mission_claimed', { mission_id: 'daily-set-bonus', reward_seeds: missionSetBonusSeeds });
      }
    } catch (error) {
      setClaimError(error instanceof Error ? error.message : 'Unable to claim all available rewards.');
    } finally {
      setIsClaimingAllRewards(false);
    }
  };

  useEffect(() => {
    if (!supabaseReady) {
      setIsSignedIn(false);
      return;
    }

    const supabase = getSupabaseBrowserClient();
    let active = true;

    const refreshSession = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (active) {
          setIsSignedIn(Boolean(data.session?.user));
        }
      } catch {
        if (active) {
          setIsSignedIn(false);
        }
      }
    };

    void refreshSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void refreshSession();
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [supabaseReady]);

  return (
    <section className="space-y-4">
      <div>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
            Daily Rewards
          </h2>
          <button
            type="button"
            disabled={claimableRewardCount === 0 || isClaimingAllRewards}
            onClick={() => {
              void claimAllRewards();
            }}
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[0.7rem] font-semibold transition ${
              claimableRewardCount > 0 && !isClaimingAllRewards
                ? 'bg-[var(--color-secondary)] text-[var(--color-on-secondary)]'
                : 'bg-[var(--color-surface-border)] text-[var(--color-muted)]'
            }`}
          >
            <Gift size={14} />
            {claimableRewardCount > 0
              ? (isClaimingAllRewards ? 'Claiming...' : `Claim All (${claimableRewardCount})`)
              : 'Nothing to claim'}
          </button>
        </div>
        <div className="rounded-2xl border border-[var(--color-surface-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-card)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">
                Classic Run Bonus
              </p>
              <h3 className="mt-1 font-[family-name:var(--font-display)] text-lg font-semibold">
                Claim your five-round bonus payout
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
              {pendingDailyRewardSeeds > 0 ? `${formatNumber(pendingDailyRewardSeeds)} ready` : `${formatNumber(dailyState.bonusSeedsAwarded)} total`}
            </span>
          </div>

          <p className="mt-4 text-sm leading-6 text-[var(--color-muted)]">
            {!isComplete
              ? 'Finish today\'s optional five-round run to unlock this bonus.'
              : pendingDailyRewardSeeds > 0
                ? `Your ${formatNumber(pendingDailyRewardSeeds)} classic-run bonus seeds are waiting here until you claim them.`
                : 'Today\'s classic-run bonus has already been claimed.'}
          </p>

          <div className="mt-4 flex items-center justify-between gap-3">
            {pendingDailyRewardSeeds > 0 ? (
              <div className="inline-flex items-center gap-1 text-[0.7rem] font-semibold text-emerald-400">
                <CheckCircle2 size={14} />
                Ready to claim
              </div>
            ) : (
              <span className="text-[0.7rem] text-[var(--color-muted)]">
                {isComplete ? 'Already claimed' : 'Complete today\'s five-round run first'}
              </span>
            )}

            <button
              type="button"
              onClick={() => {
                void claimDailyReward();
              }}
              className={`rounded-full px-3 py-1.5 text-[0.7rem] font-semibold transition ${
                pendingDailyRewardSeeds > 0 && !isClaimingDailyReward
                  ? 'bg-[var(--color-secondary)] text-[var(--color-on-secondary)]'
                  : 'bg-[var(--color-surface-border)] text-[var(--color-muted)]'
              }`}
              disabled={pendingDailyRewardSeeds <= 0 || isClaimingDailyReward}
            >
              {pendingDailyRewardSeeds > 0 ? (isClaimingDailyReward ? 'Claiming...' : 'Claim Run Bonus') : 'Claimed'}
            </button>
          </div>

          {claimError ? (
            <p className="mt-3 text-[0.7rem] text-red-400">{claimError}</p>
          ) : null}
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