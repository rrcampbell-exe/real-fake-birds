'use client';

import { useEffect } from 'react';
import ShareButton from '@/components/ShareButton';
import TrophyCase from '@/components/rewards/TrophyCase';
import PersonalBests from '@/components/rewards/PersonalBests';
import { useStoredJson } from '@/hooks/useStoredValue';
import { buildStatsSharePayload } from '@/lib/utils/share-data';
import {
  defaultBirdScore,
  normalizeBirdScore,
  setStoredBoolean,
  UNSEEN_BADGES_STORAGE_KEY,
} from '@/lib/utils/player-progress';

export default function RewardsSection() {
  useEffect(() => {
    setStoredBoolean(UNSEEN_BADGES_STORAGE_KEY, false);
  }, []);

  const storedStats = useStoredJson<typeof defaultBirdScore | null>('birdScore', null);
  const normalizedStats = normalizeBirdScore(storedStats);
  const accuracy =
    normalizedStats.birdsSeen > 0
      ? Math.floor((normalizedStats.birdsIdentified / normalizedStats.birdsSeen) * 100)
      : 0;
  const statsSharePayload = buildStatsSharePayload({
    bestStreak: normalizedStats.bestStreak,
    currentStreak: normalizedStats.currentStreak,
    birdsIdentified: normalizedStats.birdsIdentified,
    accuracy,
  });

  return (
    <>
      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
            Stats
          </h2>
          <ShareButton payload={statsSharePayload} eventLabel="stats" />
        </div>
        <PersonalBests includeSummaryStats />
      </section>

      <section>
        <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold mb-3">
          Trophy Case
        </h2>
        <TrophyCase />
      </section>
    </>
  );
}
