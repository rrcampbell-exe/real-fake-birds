'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Bird, BookOpen, Compass, Eye, Feather, Flame, Sprout, Target, Trophy } from 'lucide-react';
import { useAccountState } from '@/components/account/AccountStateProvider';
import { useStoredJson } from '@/hooks/useStoredValue';
import {
  LEADERBOARD_LAST_SEEN_WEEK_STORAGE_KEY,
  markLeaderboardWeekSeen,
} from '@/lib/utils/weekly-leaderboard';
import type { WeeklyChallengeIcon } from '@/types';

const challengeIcons: Record<WeeklyChallengeIcon, typeof Trophy> = {
  bird: Bird,
  binoculars: Compass,
  collection: BookOpen,
  feather: Feather,
  flame: Flame,
  masks: Eye,
  sprout: Sprout,
  target: Target,
};

export default function WeeklyChallengeBanner() {
  const { accountUsername, weeklyOverview } = useAccountState();
  const lastSeenWeek = useStoredJson<string | null>(LEADERBOARD_LAST_SEEN_WEEK_STORAGE_KEY, null);
  const [dismissed, setDismissed] = useState(false);

  if (!accountUsername || !weeklyOverview || dismissed || lastSeenWeek === weeklyOverview.currentWeekStart) {
    return null;
  }

  const { challenge } = weeklyOverview;
  const ChallengeIcon = challengeIcons[challenge.icon] ?? Trophy;

  const handleDismiss = () => {
    markLeaderboardWeekSeen(weeklyOverview.currentWeekStart);
    setDismissed(true);
  };

  return (
    <div className="w-full max-w-md px-4">
      <section className="rounded-2xl border border-[var(--color-secondary)]/35 bg-[color-mix(in_srgb,var(--color-secondary)_10%,var(--color-surface))] p-4 shadow-[var(--shadow-card)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-[var(--color-secondary)]">
              Weekly Challenge
            </p>
            <div className="mt-1.5 flex items-center gap-2">
              <span className="rounded-full border border-[var(--color-secondary)]/30 bg-[var(--color-surface)] p-1.5 text-[var(--color-secondary)]">
                <ChallengeIcon size={14} />
              </span>
              <h2 className="font-[family-name:var(--font-display)] text-lg font-bold leading-tight">
                {challenge.name}
              </h2>
            </div>
          </div>
          <Link
            href="/leaderboard"
            onClick={handleDismiss}
            className="inline-flex items-center gap-2 rounded-full bg-[var(--color-secondary)] px-3 py-1.5 text-xs font-semibold text-[var(--color-on-secondary)]"
          >
            View Leaderboard
          </Link>
        </div>

      </section>
    </div>
  );
}
