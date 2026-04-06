'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bird, Menu } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useAccountState } from '@/components/account/AccountStateProvider';
import { useHasHydrated } from '@/hooks/useHasHydrated';
import { useStoredBoolean, useStoredJson } from '@/hooks/useStoredValue';
import { useSound } from '@/hooks/useSound';
import { NEW_THEME_UNLOCK_STORAGE_KEY, UNSEEN_BADGES_STORAGE_KEY } from '@/lib/utils/player-progress';
import { DAILY_CHALLENGE_STORAGE_KEY } from '@/lib/constants/daily-challenge';
import { SESSION_MISSIONS_STORAGE_KEY } from '@/lib/constants/missions';
import { createDailyChallengeState } from '@/lib/utils/daily-challenge';
import { readSessionMissions } from '@/lib/utils/missions';
import { hasPendingRewards } from '@/lib/utils/rewards-notification';
import { LEADERBOARD_LAST_SEEN_WEEK_STORAGE_KEY, getCurrentWeekStart } from '@/lib/utils/weekly-leaderboard';
import type { DailyChallengeState, SessionMissionsState } from '@/types';
import MenuDrawer from './MenuDrawer';

export default function BottomNav() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const { accountUsername } = useAccountState();
  const hasUnseenBadges = useStoredBoolean(UNSEEN_BADGES_STORAGE_KEY);
  const hasNewThemeUnlock = useStoredBoolean(NEW_THEME_UNLOCK_STORAGE_KEY);
  const lastSeenLeaderboardWeek = useStoredJson<string | null>(LEADERBOARD_LAST_SEEN_WEEK_STORAGE_KEY, null);
  const dailyChallengeState = useStoredJson<DailyChallengeState>(
    DAILY_CHALLENGE_STORAGE_KEY,
    createDailyChallengeState()
  );
  const sessionMissionsState = useStoredJson<SessionMissionsState>(
    SESSION_MISSIONS_STORAGE_KEY,
    readSessionMissions()
  );
  const hasPendingRewardClaims = hasPendingRewards(dailyChallengeState, sessionMissionsState);
  const { play } = useSound();
  const hasIncompleteDaily = sessionMissionsState.missions.some((mission) => !mission.completed);
  const rewardsNotificationLabel = hasPendingRewardClaims
    ? 'Visit Rewards to claim what is waiting for you.'
    : hasUnseenBadges
      ? 'Visit Rewards to see your newest badge.'
      : undefined;
  const settingsNotificationLabel = hasNewThemeUnlock
    ? 'Visit Settings to try your new theme.'
    : undefined;
  const currentWeekStart = getCurrentWeekStart();
  const showLeaderboardNotification = Boolean(accountUsername) && lastSeenLeaderboardWeek !== currentWeekStart;
  const hasMounted = useHasHydrated();
  const showMenuDot = useMemo(
    () => hasMounted && (hasIncompleteDaily || hasPendingRewardClaims || hasUnseenBadges || hasNewThemeUnlock || showLeaderboardNotification),
    [hasMounted, hasIncompleteDaily, hasNewThemeUnlock, hasPendingRewardClaims, hasUnseenBadges, showLeaderboardNotification]
  );
  const playActive = pathname === '/';

  return (
    <>
      <nav className="fixed bottom-3 left-4 right-4 z-50 flex items-center justify-center rounded-3xl border border-[var(--color-surface-border)] bg-[var(--color-surface)] px-4 pb-[calc(env(safe-area-inset-bottom)+0.45rem)] pt-3 shadow-[var(--shadow-card)] backdrop-blur-md md:hidden">
        <div className="flex w-full max-w-sm items-center gap-3">
          <Link
            href="/"
            onClick={() => play('navTap')}
            className={`flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-semibold transition-colors ${
              playActive
                ? 'bg-[var(--color-secondary)] text-[var(--color-on-secondary)]'
                : 'bg-[var(--color-surface-hover)] text-[var(--color-text)]'
            }`}
          >
            <Bird size={20} strokeWidth={playActive ? 2.5 : 2} />
            Play
          </Link>
          <button
            type="button"
            aria-label="Open menu"
            onClick={() => {
              play('navTap');
              setMenuOpen(true);
            }}
            className={`relative inline-flex items-center gap-2 rounded-full border border-[var(--color-surface-border)] bg-[var(--color-surface)] px-4 py-3 text-sm font-semibold text-[var(--color-text)] transition hover:bg-[var(--color-surface-hover)] ${
              showMenuDot ? 'pr-8' : ''
            }`}
          >
            <Menu size={20} />
            Menu
            {showMenuDot ? (
              <span className="absolute right-3 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-[var(--color-secondary)]" />
            ) : null}
          </button>
        </div>
      </nav>
      <MenuDrawer
        isOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
        notifications={{
          '/daily': {
            show: hasIncompleteDaily,
            label: hasIncompleteDaily ? 'Visit Daily Missions to keep your streak alive today.' : undefined,
          },
          '/leaderboard': {
            show: showLeaderboardNotification,
            label: showLeaderboardNotification ? 'Visit Leaderboard to see this week\'s challenge and standings.' : undefined,
          },
          '/rewards': {
            show: hasPendingRewardClaims || hasUnseenBadges,
            label: rewardsNotificationLabel,
          },
          '/settings': {
            show: hasNewThemeUnlock,
            label: settingsNotificationLabel,
          },
        }}
      />
    </>
  );
}
