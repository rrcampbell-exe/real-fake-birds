'use client';

import MissionPanel from '@/components/game/MissionPanel';
import { useSessionMissions } from '@/hooks/useSessionMissions';

export default function DailyRewardsPanel() {
  const { missions, bonusClaimed } = useSessionMissions();
  const completedCount = missions.filter((mission) => mission.completed).length;

  return (
    <section className="space-y-4">
      <div>
        <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
          Daily Rewards
        </h2>
        <p className="mt-2 text-sm text-[var(--color-muted)]">
          {completedCount > 0
            ? `You\'ve completed ${completedCount} of ${missions.length}${completedCount === 1 ? ' mission' : ' missions'} today${bonusClaimed ? ', including the high flyer bonus.' : '.'}`
            : ''}
        </p>
      </div>

      <MissionPanel containerClassName="w-full" />
    </section>
  );
}