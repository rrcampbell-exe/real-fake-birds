'use client';

import { useEffect } from 'react';
import { Bird } from 'lucide-react';
import ShareButton from '@/components/ShareButton';
import TrophyCase from '@/components/rewards/TrophyCase';
import PersonalBests from '@/components/rewards/PersonalBests';
import { usePageProgressSync } from '@/hooks/usePageProgressSync';
import { useScreenViewed } from '@/hooks/useScreenViewed';
import { useStoredJson } from '@/hooks/useStoredValue';
import { buildStatsSharePayload } from '@/lib/utils/share-data';
import { defaultBirdScore, normalizeBirdScore, setStoredBoolean, UNSEEN_BADGES_STORAGE_KEY } from '@/lib/utils/player-progress';

export default function RewardsPage() {
  const { isPageBackgroundRefreshing } = usePageProgressSync();
  useScreenViewed('rewards');

  useEffect(() => {
    setStoredBoolean(UNSEEN_BADGES_STORAGE_KEY, false);
  }, []);

  const storedStats = useStoredJson<typeof defaultBirdScore | null>('birdScore', null);
  const normalizedStats = normalizeBirdScore(storedStats);
  const accuracy = normalizedStats.birdsSeen > 0
    ? Math.floor((normalizedStats.birdsIdentified / normalizedStats.birdsSeen) * 100)
    : 0;
  const statsSharePayload = buildStatsSharePayload({
    bestStreak: normalizedStats.bestStreak,
    currentStreak: normalizedStats.currentStreak,
    birdsIdentified: normalizedStats.birdsIdentified,
    accuracy,
  });

  return (
    <div className="w-full max-w-lg mx-auto px-4 py-8 flex flex-col gap-8">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold mb-1">
          Rewards
        </h1>
        <p className="text-sm text-[var(--color-muted)]">
          Your bird-watching achievements.
        </p>
        {isPageBackgroundRefreshing ? (
          <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-[var(--color-surface-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-medium text-[var(--color-muted)]">
            <Bird size={14} className="text-[var(--color-secondary)]" />
            Polishing your trophy shelf...
          </div>
        ) : null}
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
            Personal Bests
          </h2>
          <ShareButton payload={statsSharePayload} eventLabel="stats" />
        </div>
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
