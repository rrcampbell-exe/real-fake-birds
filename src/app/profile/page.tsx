'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Binoculars, Bird } from 'lucide-react';
import { useAccountState } from '@/components/account/AccountStateProvider';
import { useScreenViewed } from '@/hooks/useScreenViewed';
import { useHasHydrated } from '@/hooks/useHasHydrated';
import { usePageProgressSync } from '@/hooks/usePageProgressSync';
import { useBirdhouse } from '@/hooks/useBirdhouse';
import { useBirdJournal } from '@/hooks/useBirdJournal';
import { saveAvatarFakeBird } from '@/lib/auth/account-sync';
import ProfileHeader from '@/components/profile/ProfileHeader';
import AvatarPickerSheet from '@/components/profile/AvatarPickerSheet';
import RewardsSection from '@/components/profile/RewardsSection';
import BirdhousePreviewCard from '@/components/profile/BirdhousePreviewCard';
import type { OwnProfilePayload } from '@/types/profile';
import type { FollowersResponse } from '@/app/api/followers/route';

// Module-level cache: persists across client-side navigation within the same session.
const ownProfileCache = new Map<string, OwnProfilePayload>();

function useOwnProfile(username: string | null) {
  const key = username?.toLowerCase() ?? null;
  const cachedProfile = key ? ownProfileCache.get(key) ?? null : null;
  const [fetchedProfile, setFetchedProfile] = useState<OwnProfilePayload | null>(cachedProfile);
  const [loadedKey, setLoadedKey] = useState<string | null>(cachedProfile ? key : null);

  useEffect(() => {
    if (!key || cachedProfile) {
      return;
    }

    let cancelled = false;

    fetch(`/api/profile?username=${encodeURIComponent(key)}`)
      .then(async (res) => res.json())
      .then((data) => {
        if (!cancelled && data?.profile?.kind === 'own') {
          ownProfileCache.set(key, data.profile as OwnProfilePayload);
          setFetchedProfile(data.profile as OwnProfilePayload);
          setLoadedKey(key);
        }
      })
      .catch(() => {/* silently degrade */})

    return () => { cancelled = true; };
  }, [cachedProfile, key]);

  const profile = cachedProfile ?? (loadedKey === key ? fetchedProfile : null);
  const isLoading = Boolean(key && !cachedProfile && loadedKey !== key);

  return { profile, isLoading };
}


export default function ProfilePage() {
  useScreenViewed('profile');
  const isHydrated = useHasHydrated();
  const { isSignedIn, isHouseAccount, accountUsername, accountAvatarPalette, accountJoinedMonthYear, accountAvatarFakeBirdKey, refreshAccountState } = useAccountState();
  const { isPageBackgroundRefreshing } = usePageProgressSync();
  const { birdhouse } = useBirdhouse();
  const { journalByKey } = useBirdJournal();
  const { profile, isLoading: isProfileLoading } = useOwnProfile(
    isSignedIn && accountUsername ? accountUsername : null,
  );
  const [pickerOpen, setPickerOpen] = useState(false);
  // Tracks the key we just saved so the avatar updates instantly without
  // waiting for refreshAccountState() to round-trip and update the context.
  const [pendingAvatarBirdKey, setPendingAvatarBirdKey] = useState<string | null | undefined>(undefined);

  const [followerCounts, setFollowerCounts] = useState<{ followers: number; following: number } | null>(null);
  const cancelledRef = useRef(false);

  const fetchFollowerCounts = useCallback(async () => {
    cancelledRef.current = false;
    try {
      const res = await fetch('/api/followers');
      if (!res.ok) return;
      const json = (await res.json()) as FollowersResponse;
      if (!cancelledRef.current) {
        setFollowerCounts({ followers: json.followers.length, following: json.following.length });
      }
    } catch {
      // silently degrade
    }
  }, []);

  useEffect(() => {
    if (!isSignedIn) {
      return;
    }

    queueMicrotask(() => {
      void fetchFollowerCounts();
    });

    return () => { cancelledRef.current = true; };
  }, [isSignedIn, fetchFollowerCounts]);


  const fakeBirdsForPicker = birdhouse.fake
    .map((birdKey) => {
      const entry = journalByKey[birdKey];
      return {
        birdKey,
        birdName: entry?.birdName ?? birdKey,
        imageUrl: entry?.metadata.imageThumbUrl ?? entry?.metadata.imageUrl ?? null,
      };
    });

  // Pending key is active while it differs from the server-confirmed value; becomes a no-op once the context catches up.
  const effectiveAvatarBirdKey =
    pendingAvatarBirdKey !== undefined && pendingAvatarBirdKey !== accountAvatarFakeBirdKey
      ? pendingAvatarBirdKey
      : (accountAvatarFakeBirdKey ?? null);
  const avatarFakeBirdImageUrl = effectiveAvatarBirdKey
    ? (journalByKey[effectiveAvatarBirdKey]?.metadata.imageThumbUrl ?? journalByKey[effectiveAvatarBirdKey]?.metadata.imageUrl ?? profile?.avatarFakeBirdImageUrl ?? null)
    : (profile?.avatarFakeBirdImageUrl ?? null);

  const handleAvatarSelect = async (birdKey: string | null) => {
    setPickerOpen(false);
    setPendingAvatarBirdKey(birdKey);
    try {
      await saveAvatarFakeBird(birdKey);
      await refreshAccountState();
    } catch {
      // silently degrade — pending key will still show the selection
    }
  };

  if (!isHydrated) {
    return (
      <div className="w-full max-w-lg mx-auto px-4 py-8 flex flex-col gap-8">
        <div className="flex items-start gap-4">
          <div className="h-16 w-16 shrink-0 rounded-full bg-[var(--color-surface)] animate-pulse" />
          <div className="flex-1 flex flex-col gap-2 pt-1">
            <div className="h-7 w-40 rounded bg-[var(--color-surface)] animate-pulse" />
            <div className="h-4 w-52 rounded bg-[var(--color-surface)] animate-pulse" />
            <div className="h-3 w-28 rounded bg-[var(--color-surface)] animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="h-16 rounded-2xl bg-[var(--color-surface)] animate-pulse" />
          <div className="h-16 rounded-2xl bg-[var(--color-surface)] animate-pulse" />
          <div className="h-16 rounded-2xl bg-[var(--color-surface)] animate-pulse" />
          <div className="h-16 rounded-2xl bg-[var(--color-surface)] animate-pulse" />
        </div>
        <div className="h-12 rounded-2xl bg-[var(--color-surface)] animate-pulse" />
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
      <ProfileHeader
        username={accountUsername}
        avatarPalette={accountAvatarPalette ?? ''}
        avatarFakeBirdImageUrl={avatarFakeBirdImageUrl}
        joinedMonthYear={accountJoinedMonthYear ?? ''}
        privacyMode={profile?.privacyMode}
        isOwner
        isPrivacyLoading={isProfileLoading}
        onEditAvatar={() => setPickerOpen(true)}
        followerCount={followerCounts?.followers}
        followingCount={followerCounts?.following}
        isHouseAccount={isHouseAccount}
        followersHref="/community?tab=followers"
        followingHref="/community?tab=following"
      />

      <AvatarPickerSheet
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={handleAvatarSelect}
        fakeBirds={fakeBirdsForPicker}
        currentBirdKey={accountAvatarFakeBirdKey ?? null}
      />

      {isPageBackgroundRefreshing ? (
        <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-surface-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-medium text-[var(--color-muted)] w-fit">
          <Bird size={14} className="text-[var(--color-secondary)]" />
          Syncing your stats...
        </div>
      ) : null}

      <Link
        href="/community"
        className="flex items-center gap-3 rounded-2xl border border-[var(--color-surface-border)] bg-[var(--color-surface)] px-4 py-3 transition hover:bg-[var(--color-surface-hover)]"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-surface-hover)] text-[var(--color-secondary)]">
          <Binoculars size={18} aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[var(--color-text)]">The Roost</p>
          <p className="text-xs text-[var(--color-muted)]">
            Find birders, manage followers, and keep your flock in one place.
          </p>
        </div>
        <span className="text-xs text-[var(--color-muted)]">&rsaquo;</span>
      </Link>

      <BirdhousePreviewCard />

      <RewardsSection />
    </div>
  );
}
