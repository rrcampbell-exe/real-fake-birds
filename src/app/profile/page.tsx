'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bird } from 'lucide-react';
import { useAccountState } from '@/components/account/AccountStateProvider';
import { useScreenViewed } from '@/hooks/useScreenViewed';
import { useHasHydrated } from '@/hooks/useHasHydrated';
import { usePageProgressSync } from '@/hooks/usePageProgressSync';
import ProfileHeader from '@/components/profile/ProfileHeader';
import ProgressSummary from '@/components/profile/ProgressSummary';
import RewardsSection from '@/components/profile/RewardsSection';
import BirdhousePreviewCard from '@/components/profile/BirdhousePreviewCard';
import type { OwnProfilePayload } from '@/types/profile';

// Module-level cache: persists across client-side navigation within the same session.
const ownProfileCache = new Map<string, OwnProfilePayload>();

function useOwnProfile(username: string | null) {
  const key = username?.toLowerCase() ?? null;
  const [profile, setProfile] = useState<OwnProfilePayload | null>(
    () => (key ? ownProfileCache.get(key) ?? null : null)
  );
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!key) return;
    if (ownProfileCache.has(key)) return; // already cached — skip fetch

    let cancelled = false;

    fetch(`/api/profile?username=${encodeURIComponent(key)}`)
      .then(async (res) => res.json())
      .then((data) => {
        if (!cancelled && data?.profile?.kind === 'own') {
          ownProfileCache.set(key, data.profile as OwnProfilePayload);
          setProfile(data.profile as OwnProfilePayload);
        }
      })
      .catch(() => {/* silently degrade */})
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => { cancelled = true; };
  }, [key]);

  return { profile, isLoading };
}


export default function ProfilePage() {
  useScreenViewed('profile');
  const isHydrated = useHasHydrated();
  const { isSignedIn, accountUsername, remoteSummary } = useAccountState();
  const { isPageBackgroundRefreshing } = usePageProgressSync();
  const { profile, isLoading: isProfileLoading } = useOwnProfile(
    isSignedIn && accountUsername ? accountUsername : null,
  );

  if (!isHydrated) {
    return (
      <div className="w-full max-w-lg mx-auto px-4 py-8">
        <div className="h-8 w-48 rounded bg-[var(--color-surface)] animate-pulse mb-2" />
        <div className="h-4 w-64 rounded bg-[var(--color-surface)] animate-pulse" />
      </div>
    );
  }

  if (!isSignedIn || !accountUsername) {
    return (
      <div className="w-full max-w-lg mx-auto px-4 py-8 flex flex-col gap-4">
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold">
          Profile
        </h1>
        <p className="text-sm text-[var(--color-muted)]">
          Sign in to view your profile.
        </p>
        <Link
          href="/settings"
          className="inline-flex items-center justify-center rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white w-fit"
        >
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-lg mx-auto px-4 py-8 flex flex-col gap-8">
      {isProfileLoading || !profile ? (
        <div className="flex flex-col gap-4">
          <div className="h-10 w-10 rounded-full bg-[var(--color-surface)] animate-pulse" />
          <div className="h-6 w-48 rounded bg-[var(--color-surface)] animate-pulse" />
          <div className="h-4 w-32 rounded bg-[var(--color-surface)] animate-pulse" />
        </div>
      ) : (
        <>
          <ProfileHeader
            username={profile.username}
            avatarPalette={profile.avatarPalette}
            joinedMonthYear={profile.joinedMonthYear}
            privacyMode={profile.privacyMode}
            isOwner
          />
        </>
      )}

      {isPageBackgroundRefreshing ? (
        <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-surface-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-medium text-[var(--color-muted)] w-fit">
          <Bird size={14} className="text-[var(--color-secondary)]" />
          Syncing your stats...
        </div>
      ) : null}

      {remoteSummary ? (
        <ProgressSummary
          progress={{
            birdsIdentified: remoteSummary.birdsIdentified,
            seeds: remoteSummary.seeds,
            bestStreak: remoteSummary.bestStreak,
            bestDailyStreak: remoteSummary.bestDailyStreak,
            bestWeeklyPlacement: remoteSummary.bestWeeklyPlacement,
          }}
        />
      ) : null}

      <BirdhousePreviewCard />

      <RewardsSection />
    </div>
  );
}
