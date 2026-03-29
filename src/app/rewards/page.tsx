'use client';

import { useEffect } from 'react';
import TrophyCase from '@/components/rewards/TrophyCase';
import PersonalBests from '@/components/rewards/PersonalBests';

export default function RewardsPage() {
  useEffect(() => {
    localStorage.setItem('hasUnseenBadges', 'false');
  }, []);

  return (
    <div className="max-w-lg mx-auto px-4 py-8 flex flex-col gap-8">
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
