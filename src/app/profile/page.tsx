'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bird } from 'lucide-react';
import { useAccountState } from '@/components/account/AccountStateProvider';
import { useScreenViewed } from '@/hooks/useScreenViewed';
import { useHasHydrated } from '@/hooks/useHasHydrated';
import { usePageProgressSync } from '@/hooks/usePageProgressSync';
import { useBirdhouse } from '@/hooks/useBirdhouse';
import { useBirdJournal } from '@/hooks/useBirdJournal';
import { saveAvatarFakeBird } from '@/lib/auth/account-sync';
import ProfileHeader from '@/components/profile/ProfileHeader';
import AvatarPickerSheet from '@/components/profile/AvatarPickerSheet';
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
  const { isSignedIn, accountUsername, accountAvatarPalette, accountJoinedMonthYear, accountAvatarFakeBirdKey, refreshAccountState, remoteSummary } = useAccountState();
  const { isPageBackgroundRefreshing } = usePageProgressSync();
  const { birdhouse } = useBirdhouse();
  const { journalByKey } = useBirdJournal();
  const { profile } = useOwnProfile(
    isSignedIn && accountUsername ? accountUsername : null,
  );
  const [pickerOpen, setPickerOpen] = useState(false);
  // Tracks the key we just saved so the avatar updates instantly without
  // waiting for refreshAccountState() to round-trip and update the context.
  const [pendingAvatarBirdKey, setPendingAvatarBirdKey] = useState<string | null | undefined>(undefined);


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
      <ProfileHeader
        username={accountUsername}
        avatarPalette={accountAvatarPalette ?? ''}
        avatarFakeBirdImageUrl={avatarFakeBirdImageUrl}
        joinedMonthYear={accountJoinedMonthYear ?? ''}
        privacyMode={profile?.privacyMode}
        isOwner
        onEditAvatar={() => setPickerOpen(true)}
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
