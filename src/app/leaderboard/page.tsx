'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Binoculars, Bird, BookOpen, Bot, Feather, Flame, Sprout, Target, Trophy, HatGlasses, UserStar } from 'lucide-react';
import ShareButton from '@/components/ShareButton';
import { useAccountState } from '@/components/account/AccountStateProvider';
import LeaderboardAvatar from '@/components/leaderboard/LeaderboardAvatar';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { useHasHydrated } from '@/hooks/useHasHydrated';
import { useScreenViewed } from '@/hooks/useScreenViewed';
import { buildWeeklyLeaderboardSharePayload } from '@/lib/utils/share-data';
import { getTimeRemainingInWeek, markLeaderboardWeekSeen } from '@/lib/utils/weekly-leaderboard';
import type { WeeklyChallengeIcon } from '@/types';

function toBadgeAssetName(badgeName: string) {
  return badgeName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

const challengeIcons: Record<WeeklyChallengeIcon, typeof Trophy> = {
  bird: Bird,
  binoculars: Binoculars,
  collection: BookOpen,
  feather: Feather,
  flame: Flame,
  masks: HatGlasses,
  sprout: Sprout,
  target: Target,
};

function useMinuteTimestamp(enabled: boolean) {
  const [timestamp, setTimestamp] = useState(() => Date.now());

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const interval = window.setInterval(() => {
      setTimestamp(Date.now());
    }, 60_000);

    return () => {
      window.clearInterval(interval);
    };
  }, [enabled]);

  return timestamp;
}

export default function LeaderboardPage() {
  const { accountUsername } = useAccountState();
  useScreenViewed('leaderboard');
  const { leaderboard, isLoading, error, reload } = useLeaderboard();
  const hasMounted = useHasHydrated();
  const now = useMinuteTimestamp(Boolean(leaderboard));
  const clock = useMemo(
    () => (leaderboard ? getTimeRemainingInWeek(new Date(now), leaderboard.weekStart) : {
      totalMs: 0,
      days: 0,
      hours: 0,
      minutes: 0,
    }),
    [leaderboard, now]
  );

  useEffect(() => {
    if (!leaderboard) {
      return;
    }

    markLeaderboardWeekSeen(leaderboard.weekStart);
  }, [leaderboard]);

  const sharePayload = useMemo(() => {
    if (!leaderboard?.currentUserEntry) {
      return null;
    }

    return buildWeeklyLeaderboardSharePayload({
      challengeName: leaderboard.challenge.name,
      rank: leaderboard.currentUserEntry.rank,
      isFinal: false,
    });
  }, [leaderboard]);

  const Icon = leaderboard ? challengeIcons[leaderboard.challenge.icon] : UserStar;
  const isSkeleton = isLoading && !leaderboard && !error;

  const renderSkeletonRows = () => (
    <div className="overflow-x-auto">
      <table className="w-full table-fixed border-separate border-spacing-y-2 text-left text-sm">
        <thead>
          <tr className="text-[0.72rem] uppercase tracking-[0.14em] text-[var(--color-muted)]">
            <th className="w-10 sm:w-14 whitespace-nowrap px-2 sm:px-3 py-2">Rank</th>
            <th className="px-3 py-2">Birder</th>
            <th className="w-16 sm:w-20 px-3 py-2">Score</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 8 }).map((_, index) => (
            <tr key={`skeleton-${index}`} className="animate-pulse">
              <td className="rounded-l-2xl border-y border-l border-[var(--color-surface-border)] bg-[var(--color-surface-hover)] px-2 sm:px-3 py-3">
                <div className="h-3 w-8 rounded bg-[var(--color-surface-border)]" />
              </td>
              <td className="overflow-hidden border-y border-[var(--color-surface-border)] bg-[var(--color-surface-hover)] px-3 py-3">
                <div className="flex items-center gap-2">
                  <span className="shrink-0">
                    <div className="h-10 w-10 rounded-full bg-[var(--color-surface-border)]" />
                  </span>
                  <div className="h-3 w-24 rounded bg-[var(--color-surface-border)]" />
                </div>
              </td>
              <td className="rounded-r-2xl border-y border-r border-[var(--color-surface-border)] bg-[var(--color-surface-hover)] px-3 py-3">
                <div className="h-3 w-10 rounded bg-[var(--color-surface-border)]" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8">
      <div className="flex flex-col gap-4 rounded-[2rem] border border-[var(--color-surface-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)]">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-[var(--color-secondary)]">
              Weekly Leaderboard
            </p>
            <div className="mt-2 flex items-center gap-3">
              <div className="rounded-full bg-[var(--color-surface-hover)] p-3 text-[var(--color-secondary)]">
                <Icon size={20} />
              </div>
              <div>
                <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold leading-tight">
                  {leaderboard?.challenge.name ?? 'Loading Weekly Challenge...'}
                </h1>
                <p className="mt-1 text-sm text-[var(--color-muted)]">
                  {leaderboard
                    ? `${leaderboard.challenge.description} This week's tiebreaker is ${leaderboard.challenge.tiebreakerLabel.toLowerCase()}. ${leaderboard.challenge.qualificationText ?? 'All logged-in players are eligible.'}`
                    : 'Fetching this week\'s standings.'}
                </p>
              </div>
            </div>
          </div>

          <div className="min-w-[10rem] rounded-2xl border border-[var(--color-surface-border)] bg-[var(--color-surface-hover)] px-4 py-3 text-sm">
            <p className="whitespace-nowrap text-[0.7rem] uppercase tracking-[0.14em] text-[var(--color-muted)]">Time Remaining</p>
            <p className="mt-1 font-semibold" suppressHydrationWarning>
              {hasMounted ? `${clock.days}d ${clock.hours}h ${clock.minutes}m` : '--d --h --m'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {sharePayload ? <ShareButton payload={sharePayload} eventLabel="weekly-leaderboard" /> : null}
          {hasMounted && Boolean(accountUsername) ? (
            <Link
              href="/community"
              className="inline-flex items-center gap-2 rounded-full border border-[var(--color-surface-border)] bg-[var(--color-surface)] px-4 py-2 text-sm font-semibold text-[var(--color-text)] transition hover:bg-[var(--color-surface-hover)]"
            >
              The Roost
            </Link>
          ) : null}
          {hasMounted && !accountUsername && !isLoading && Boolean(leaderboard) ? (
            <Link
              href="/settings"
              className="inline-flex items-center gap-2 rounded-full border border-[var(--color-surface-border)] bg-[var(--color-surface)] px-4 py-2 text-sm font-semibold text-[var(--color-text)]"
            >
              Create an account to compete
            </Link>
          ) : null}
        </div>
      </div>

      <div className="rounded-[2rem] border border-[var(--color-surface-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-card)]">
        {isSkeleton ? (
          renderSkeletonRows()
        ) : error ? (
          <div className="flex flex-col gap-3 p-4">
            <p className="text-sm text-[var(--color-error)]">{error}</p>
            <button
              type="button"
              onClick={() => void reload()}
              className="w-fit rounded-full border border-[var(--color-surface-border)] bg-[var(--color-surface-hover)] px-4 py-2 text-sm font-semibold"
            >
              Try again
            </button>
          </div>
        ) : leaderboard ? (
          <div className="overflow-x-auto">
            <table className="w-full table-fixed border-separate border-spacing-y-2 text-left text-sm">
              <thead>
                <tr className="text-[0.72rem] uppercase tracking-[0.14em] text-[var(--color-muted)]">
                  <th className="w-10 sm:w-14 whitespace-nowrap px-2 sm:px-3 py-2">Rank</th>
                  <th className="px-3 py-2">Birder</th>
                  <th className="w-16 sm:w-20 px-3 py-2">Score</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.entries.map((entry) => {
                  const isHighlighted = entry.isCurrentUser;
                  const baseBackground = entry.rank <= 3
                    ? 'bg-[color-mix(in_srgb,var(--color-secondary)_12%,var(--color-surface))]'
                    : 'bg-[var(--color-surface-hover)]';
                  const borderColor = isHighlighted ? 'border-[var(--color-secondary)]' : 'border-[var(--color-surface-border)]';

                  return (
                    <tr key={`${entry.rank}-${entry.username}`}>
                      <td className={`whitespace-nowrap rounded-l-2xl border-y border-l ${borderColor} ${baseBackground} px-2 sm:px-3 py-3 font-semibold`}>#{entry.rank}</td>
                      <td className={`overflow-hidden border-y ${borderColor} ${baseBackground} px-3 py-3 font-medium`}>
                        <div className="flex items-center gap-2">
                          <span className="shrink-0"><LeaderboardAvatar username={entry.username} avatarPalette={entry.avatarPalette} avatarBirdImageUrl={entry.avatarFakeBirdImageUrl ?? null} /></span>
                          <Link href={`/profile/${entry.username}`} className="hover:underline">{entry.username}</Link>
                          {entry.isHouseAccount ? (
                            <Bot size={11} className="shrink-0 text-[var(--color-muted)]" aria-label="House account" />
                          ) : entry.latestBadgeName ? (
                            <Image
                              src={`/images/badges/${toBadgeAssetName(entry.latestBadgeName)}.png`}
                              alt={entry.latestBadgeName}
                              width={18}
                              height={18}
                              className="shrink-0 rounded-full border-1 border-[var(--color-text)] opacity-75"
                              title={entry.latestBadgeName}
                            />
                          ) : null}
                        </div>
                      </td>
                      <td className={`rounded-r-2xl border-y border-r ${borderColor} ${baseBackground} px-3 py-3`}>{entry.primaryDisplayValue}</td>
                    </tr>
                  );
                })}

                {leaderboard.currentUserEntry && leaderboard.currentUserEntry.rank > 10 ? (
                  <tr>
                    <td colSpan={3} className="px-3 py-2 text-[0.72rem] uppercase tracking-[0.14em] text-[var(--color-muted)]">
                      Your Position
                    </td>
                  </tr>
                ) : null}
                {leaderboard.currentUserEntry && leaderboard.currentUserEntry.rank > 10 ? (
                  <tr>
                    <td className="whitespace-nowrap rounded-l-2xl border-y border-l border-[var(--color-secondary)] bg-[color-mix(in_srgb,var(--color-secondary)_12%,var(--color-surface))] px-2 sm:px-3 py-3 font-semibold">#{leaderboard.currentUserEntry.rank}</td>
                    <td className="overflow-hidden border-y border-[var(--color-secondary)] bg-[color-mix(in_srgb,var(--color-secondary)_12%,var(--color-surface))] px-3 py-3 font-medium">
                      <div className="flex items-center gap-2">
                        <span className="shrink-0"><LeaderboardAvatar
                          username={leaderboard.currentUserEntry.username}
                          avatarPalette={leaderboard.currentUserEntry.avatarPalette}
                          avatarBirdImageUrl={leaderboard.currentUserEntry.avatarFakeBirdImageUrl ?? null}
                        /></span>
                        <Link href={`/profile/${leaderboard.currentUserEntry.username}`} className="hover:underline">{leaderboard.currentUserEntry.username}</Link>
                        {leaderboard.currentUserEntry.latestBadgeName ? (
                          <Image
                            src={`/images/badges/${toBadgeAssetName(leaderboard.currentUserEntry.latestBadgeName)}.png`}
                            alt={leaderboard.currentUserEntry.latestBadgeName}
                            width={18}
                            height={18}
                            className="shrink-0 rounded-full border-2 border-[var(--color-text)] opacity-75"
                            title={leaderboard.currentUserEntry.latestBadgeName}
                          />
                        ) : null}
                      </div>
                    </td>
                    <td className="rounded-r-2xl border-y border-r border-[var(--color-secondary)] bg-[color-mix(in_srgb,var(--color-secondary)_12%,var(--color-surface))] px-3 py-3">{leaderboard.currentUserEntry.primaryDisplayValue}</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
            {leaderboard.entries.some((e) => e.isHouseAccount) ? (
              <div className="mt-3 flex flex-wrap items-center justify-center gap-x-1 gap-y-0.5 text-center text-xs text-[var(--color-muted)]">
                <Bot size={12} className="shrink-0" />
                <span>This icon designates a house account. Can you beat the bots?</span>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
