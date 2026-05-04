'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bird, Menu } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useAccountState } from '@/components/account/AccountStateProvider';
import { isNativePlatform } from '@/lib/native/platform';
import { useHasHydrated } from '@/hooks/useHasHydrated';
import { useStoredBoolean, useStoredJson } from '@/hooks/useStoredValue';
import { useSound } from '@/hooks/useSound';
import { NEW_THEME_UNLOCK_STORAGE_KEY, UNSEEN_BADGES_STORAGE_KEY } from '@/lib/utils/player-progress';
import { SESSION_MISSIONS_STORAGE_KEY } from '@/lib/constants/missions';
import { DAILY_MISSION_LAST_SEEN_DATE_STORAGE_KEY } from '@/lib/utils/daily-mission-notification';
import { readSessionMissions } from '@/lib/utils/missions';
import { LEADERBOARD_LAST_SEEN_WEEK_STORAGE_KEY, getCurrentWeekStart } from '@/lib/utils/weekly-leaderboard';
import type { SessionMissionsState } from '@/types';
import MenuDrawer from './MenuDrawer';

export default function BottomNav() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const { accountUsername, isAppChromeVisible } = useAccountState();
  const hasUnseenBadges = useStoredBoolean(UNSEEN_BADGES_STORAGE_KEY);
  const hasNewThemeUnlock = useStoredBoolean(NEW_THEME_UNLOCK_STORAGE_KEY);
  const lastSeenLeaderboardWeek = useStoredJson<string | null>(LEADERBOARD_LAST_SEEN_WEEK_STORAGE_KEY, null);
  const lastSeenDailyMissionDate = useStoredJson<string | null>(DAILY_MISSION_LAST_SEEN_DATE_STORAGE_KEY, null);
  const sessionMissionsState = useStoredJson<SessionMissionsState>(
    SESSION_MISSIONS_STORAGE_KEY,
    readSessionMissions()
  );
  const { play } = useSound();
  const hasIncompleteDaily = sessionMissionsState.missions.some((mission) => !mission.completed);
  const showDailyNotification = hasIncompleteDaily && lastSeenDailyMissionDate !== sessionMissionsState.date;
  const profileNotificationLabel = hasUnseenBadges ? 'See your newest badge now!' : undefined;
  const settingsNotificationLabel = hasNewThemeUnlock
    ? 'Try your new theme now!'
    : undefined;
  const currentWeekStart = getCurrentWeekStart();
  const showLeaderboardNotification = Boolean(accountUsername) && lastSeenLeaderboardWeek !== currentWeekStart;
  const hasMounted = useHasHydrated();
  const showMenuDot = useMemo(
    () => hasMounted && (showDailyNotification || hasUnseenBadges || hasNewThemeUnlock || showLeaderboardNotification),
    [hasMounted, hasNewThemeUnlock, hasUnseenBadges, showDailyNotification, showLeaderboardNotification]
  );
  const isNative = hasMounted && isNativePlatform();
  const playActive = pathname === '/';

  if (!isAppChromeVisible) {
    return null;
  }

  return (
    <>
      <nav className={`app-bottom-nav fixed left-4 right-4 z-50 flex items-center justify-center rounded-3xl border border-[var(--color-surface-border)] bg-[var(--color-surface)] px-4 py-[0.65rem] shadow-[var(--shadow-card)] backdrop-blur-md md:hidden ${isNative ? 'bottom-[calc(env(safe-area-inset-bottom)+0.375rem)]' : 'bottom-3 pb-[calc(env(safe-area-inset-bottom)+0.45rem)] pt-3'}`}>
        <div className="flex w-full max-w-sm items-center gap-3">
          <Link
            href="/"
            onClick={() => play('navTap')}
            className={`flex flex-1 items-center justify-center gap-2 rounded-full px-4 ${isNative ? 'py-[0.65rem]' : 'py-3'} text-sm font-semibold transition-colors ${
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
            className={`relative inline-flex items-center gap-2 rounded-full border border-[var(--color-surface-border)] bg-[var(--color-surface)] px-4 ${isNative ? 'py-[0.65rem]' : 'py-3'} text-sm font-semibold text-[var(--color-text)] transition hover:bg-[var(--color-surface-hover)] ${
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
            show: showDailyNotification,
            label: showDailyNotification ? 'Visit Daily Missions to keep your streak alive today.' : undefined,
          },
          '/leaderboard': {
            show: showLeaderboardNotification,
            label: showLeaderboardNotification ? 'Visit Leaderboard to see this week\'s challenge and standings.' : undefined,
          },
          '/profile': {
            show: hasUnseenBadges,
            label: profileNotificationLabel,
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
