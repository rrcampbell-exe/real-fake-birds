'use client';

import { useState } from 'react';
import { Gift } from 'lucide-react';
import MissionPanel from '@/components/game/MissionPanel';
import { useSessionMissions } from '@/hooks/useSessionMissions';
import { track } from '@/lib/analytics';
import { hasPendingMissionSetBonus } from '@/lib/utils/rewards-notification';

export default function DailyRewardsPanel() {
  const {
    missions,
    allCompleted,
    bonusClaimed,
    missionSetBonusSeeds,
    claimMissionReward,
    claimMissionSetBonus,
  } = useSessionMissions();
  const [isClaimingAllRewards, setIsClaimingAllRewards] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);
  const hasMissionSetBonusReady = hasPendingMissionSetBonus({
    date: new Date().toISOString().slice(0, 10),
    missions,
    bonusClaimed,
  });
  const claimableMissionRewards = missions.filter((mission) => mission.completed && !mission.claimed);
  const claimableRewardCount = claimableMissionRewards.length
    + (hasMissionSetBonusReady ? 1 : 0);

  const claimAllRewards = async () => {
    if (claimableRewardCount === 0 || isClaimingAllRewards) {
      return;
    }

    setIsClaimingAllRewards(true);
    setClaimError(null);

    try {
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
      </div>

      <MissionPanel containerClassName="w-full" />

      {claimError ? (
        <p className="text-[0.7rem] text-[var(--color-error)]">{claimError}</p>
      ) : null}

      {hasMissionSetBonusReady ? (
        <p className="text-xs text-[var(--color-muted)]">
          The clean sweep mission bonus is ready too.
        </p>
      ) : null}
    </section>
  );
}