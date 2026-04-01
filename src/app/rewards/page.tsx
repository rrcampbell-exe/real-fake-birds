'use client';

import { useEffect } from 'react';
import TrophyCase from '@/components/rewards/TrophyCase';
import PersonalBests from '@/components/rewards/PersonalBests';
import { setStoredBoolean, UNSEEN_BADGES_STORAGE_KEY } from '@/lib/utils/player-progress';

export default function RewardsPage() {
  useEffect(() => {
    setStoredBoolean(UNSEEN_BADGES_STORAGE_KEY, false);
  }, []);

  return (
    <div className="w-full max-w-lg mx-auto px-4 py-8 flex flex-col gap-8">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold mb-1">
          Rewards
        </h1>
        <p className="text-sm text-[var(--color-muted)]">
          Your bird-watching achievements.
        </p>
      </div>

      <section>
        <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold mb-3">
          Personal Bests
        </h2>
        <PersonalBests />
      </section>

      <section>
        <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold mb-3">
          Trophy Case
        </h2>
        <TrophyCase />
      </section>
    </div>
  );
}
