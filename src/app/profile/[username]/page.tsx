'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Lock } from 'lucide-react';
import { useScreenViewed } from '@/hooks/useScreenViewed';
import BirdhousePreviewCard from '@/components/profile/BirdhousePreviewCard';
import ProfileConnectionsModal from '@/components/profile/ProfileConnectionsModal';
import ProfileHeader from '@/components/profile/ProfileHeader';
import ProfileSafetyActions from '@/components/profile/ProfileSafetyActions';
import ProgressSummary from '@/components/profile/ProgressSummary';
import PublicBirdhousePreviewCard from '@/components/profile/PublicBirdhousePreviewCard';
import TrophyCaseReadOnly from '@/components/rewards/TrophyCaseReadOnly';
import type { ProfileReadResponse } from '@/types/profile';

function mapFollowError(code: string | null, action: 'request' | 'unfollow'): string {
  if (!code) {
    return action === 'unfollow'
      ? 'Unable to unfollow right now. Please try again.'
      : 'Unable to follow right now. Please try again.';
  }

  if (code === 'target_not_found') return 'That player profile could not be found.';
  if (code === 'cannot_self_action') return 'You cannot follow your own profile.';
  if (code === 'already_following') return 'You are already following this player.';
  if (code === 'request_already_sent') return 'Follow request already sent.';
  if (code === 'blocked') return 'You cannot follow this player.';
  if (code === 'unauthenticated') return 'Please sign in to follow players.';
  if (code === 'rate_limited') return 'Too many follow actions. Please wait and try again.';
  if (code === 'not_following') return 'You are not currently following this player.';
  if (code === 'database_error' || code === 'service_unavailable') {
    return 'The follow service is unavailable right now. Please try again.';
  }

  return action === 'unfollow'
    ? 'Unable to unfollow right now. Please try again.'
    : 'Unable to follow right now. Please try again.';
}

function useProfileData(username: string) {
  const [data, setData] = useState<ProfileReadResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const cancelledRef = useRef(false);

  const fetchProfile = useCallback(async (options?: { background?: boolean }) => {
    if (!options?.background) {
      setIsLoading(true);
      setError(null);
    }

    try {
      const res = await fetch(
        `/api/profile?username=${encodeURIComponent(username.toLowerCase())}`,
      );
      if (!res.ok && res.status !== 200) {
        throw new Error('profile_fetch_failed');
      }
      const json = (await res.json()) as ProfileReadResponse;
      if (!cancelledRef.current) {
        setData(json);
        setError(null);
      }
      return json;
    } catch (cause) {
      if (!cancelledRef.current && !options?.background) {
        setError('Unable to load this profile.');
      }
      throw cause;
    } finally {
      if (!cancelledRef.current && !options?.background) {
        setIsLoading(false);
      }
    }
  }, [username]);

  useEffect(() => {
    if (!username) return;
    cancelledRef.current = false;
    void fetchProfile().catch(() => undefined);
    return () => {
      cancelledRef.current = true;
    };
  }, [username, fetchProfile]);

  return { data, setData, isLoading, error, fetchProfile };
}

export default function UserProfilePage() {
  useScreenViewed('profile-view');
  const params = useParams();
  const router = useRouter();
  const username = typeof params?.username === 'string' ? params.username : '';
  const { data, setData, isLoading, error, fetchProfile } = useProfileData(username);
  const [isFollowActionPending, setIsFollowActionPending] = useState(false);
  const [followActionError, setFollowActionError] = useState<string | null>(null);
  const [connectionsModalTab, setConnectionsModalTab] = useState<'followers' | 'following'>('followers');
  const [isConnectionsModalOpen, setIsConnectionsModalOpen] = useState(false);

  const handleFollowAction = async () => {
    if (!data?.profile) return;

    const action = data.relationship === 'following' ? 'unfollow' : 'request';
    const targetUsername = username || data.profile.username;
    const isRestrictedProfile = data.profile.kind === 'restricted';

    // Compute optimistic next state
    const optimisticRelationship =
      action === 'unfollow'
        ? ('none' as const)
        : isRestrictedProfile
          ? ('requested' as const)
          : ('following' as const);

    const optimisticCapabilities = {
      ...data.capabilities,
      canFollow: action === 'unfollow',
      canUnfollow: action === 'request' && !isRestrictedProfile,
    };

    // Optimistically update follower count on public profiles
    const optimisticProfile =
      data.profile && data.profile.kind === 'public'
        ? {
            ...data.profile,
            followerCount:
              action === 'unfollow'
                ? Math.max(0, data.profile.followerCount - 1)
                : data.profile.followerCount + 1,
          }
        : data.profile;

    // Snapshot for rollback
    const snapshot = data;

    // Apply optimistic update immediately — no loading state, no page flash
    setData({ ...data, relationship: optimisticRelationship, capabilities: optimisticCapabilities, profile: optimisticProfile });
    setFollowActionError(null);
    setIsFollowActionPending(true);

    try {
      const response = await fetch('/api/follow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, targetUsername }),
      });

      if (!response.ok) {
        let errorCode: string | null = null;
        try {
          const errorData = (await response.json()) as { error?: string };
          errorCode = typeof errorData.error === 'string' ? errorData.error : null;
        } catch {
          // ignore parse error
        }
        // Rollback optimistic update
        setData(snapshot);
        setFollowActionError(mapFollowError(errorCode, action));
      }
    } catch {
      // Rollback optimistic update
      setData(snapshot);
      setFollowActionError(mapFollowError(null, action));
    } finally {
      setIsFollowActionPending(false);
    }
  };

  const handleProfileBlocked = useCallback(() => {
    setFollowActionError(null);
    setIsConnectionsModalOpen(false);
    setData((current) => {
      if (!current?.profile) {
        return current;
      }

      return {
        visibility: { reason: 'blocked', canViewFull: false, canFollow: false },
        relationship: 'blocked',
        blockState: 'viewer_blocked_target',
        capabilities: {
          canFollow: false,
          canUnfollow: false,
          canChallengeBirdBlitz: false,
        },
        profile: {
          kind: 'blocked',
          username: current.profile.username,
          isHouseAccount: current.profile.isHouseAccount,
          joinedMonthYear: current.profile.joinedMonthYear,
        },
      };
    });
  }, [setData]);

  const handleProfileUnblocked = useCallback(async () => {
    await fetchProfile({ background: true });
  }, [fetchProfile]);

  const profileSafetyActions = data?.profile ? (
    <ProfileSafetyActions
      targetUsername={data.profile.username}
      blockState={data.blockState}
      onBlocked={handleProfileBlocked}
      onUnblocked={handleProfileUnblocked}
    />
  ) : null;

  useEffect(() => {
    if (data?.visibility.reason === 'owner') {
      router.replace('/profile');
    }
  }, [data?.visibility.reason, router]);

  if (isLoading) {
    return (
      <div className="w-full max-w-lg mx-auto px-4 py-8 flex flex-col gap-8">
        {/* Header: avatar | text | action pill */}
        <div className="flex items-start gap-4">
          <div className="h-16 w-16 shrink-0 rounded-full bg-[var(--color-surface)] animate-pulse" />
          <div className="flex-1 flex flex-col gap-2 pt-1">
            <div className="h-7 w-40 rounded bg-[var(--color-surface)] animate-pulse" />
            <div className="h-4 w-52 rounded bg-[var(--color-surface)] animate-pulse" />
            <div className="h-3 w-28 rounded bg-[var(--color-surface)] animate-pulse" />
          </div>
          <div className="h-8 w-16 shrink-0 rounded-full bg-[var(--color-surface)] animate-pulse" />
        </div>
        {/* Stats: label + 2×2 grid */}
        <div className="flex flex-col gap-3">
          <div className="h-6 w-12 rounded bg-[var(--color-surface)] animate-pulse" />
          <div className="grid grid-cols-2 gap-3">
            <div className="h-16 rounded-2xl bg-[var(--color-surface)] animate-pulse" />
            <div className="h-16 rounded-2xl bg-[var(--color-surface)] animate-pulse" />
            <div className="h-16 rounded-2xl bg-[var(--color-surface)] animate-pulse" />
            <div className="h-16 rounded-2xl bg-[var(--color-surface)] animate-pulse" />
          </div>
        </div>
        {/* Birdhouse link row */}
        <div className="h-14 rounded-2xl bg-[var(--color-surface)] animate-pulse" />
        {/* Trophy case: label + badge row */}
        <div className="flex flex-col gap-3">
          <div className="h-6 w-28 rounded bg-[var(--color-surface)] animate-pulse" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="h-28 rounded-xl bg-[var(--color-surface)] animate-pulse" />
            <div className="h-28 rounded-xl bg-[var(--color-surface)] animate-pulse" />
            <div className="h-28 rounded-xl bg-[var(--color-surface)] animate-pulse" />
            <div className="h-28 rounded-xl bg-[var(--color-surface)] animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-lg mx-auto px-4 py-8">
        <p className="text-sm text-[var(--color-muted)]">{error}</p>
      </div>
    );
  }

  if (data?.visibility.reason === 'owner') {
    return null;
  }

  if (!data || !data.profile) {
    if (data?.visibility.reason === 'blocked') {
      return (
        <div className="w-full max-w-lg mx-auto px-4 py-8">
          <p className="text-sm text-[var(--color-muted)]">This profile is not available.</p>
        </div>
      );
    }

    return (
      <div className="w-full max-w-lg mx-auto px-4 py-8">
        <p className="text-sm text-[var(--color-muted)]">Profile not found.</p>
      </div>
    );
  }

  const { profile, relationship, capabilities } = data;

  if (profile.kind === 'blocked') {
    return (
      <div className="w-full max-w-lg mx-auto px-4 py-8 flex flex-col gap-4">
        <ProfileHeader
          username={profile.username}
          avatarPalette=""
          joinedMonthYear={profile.joinedMonthYear}
          isHouseAccount={profile.isHouseAccount}
          headerActions={profileSafetyActions}
          showFollowerSummary={false}
        />
        <div className="rounded-[1.5rem] border border-red-300/12 bg-[color-mix(in_srgb,var(--color-primary)_82%,black)] px-4 py-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-red-300/15 bg-red-500/10 text-red-100">
              <Lock size={16} />
            </div>
            <div>
              <p className="font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--color-text)]">
                This player is blocked.
              </p>
              <p className="mt-1 text-sm leading-6 text-[var(--color-muted)]">
                This player will not be able to interact with you until you unblock them.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (profile.kind === 'restricted') {
    return (
      <div className="w-full max-w-lg mx-auto px-4 py-8 flex flex-col gap-4">
        <ProfileHeader
          username={profile.username}
          avatarPalette=""
          joinedMonthYear={profile.joinedMonthYear}
          isHouseAccount={profile.isHouseAccount}
          followerCount={profile.followerCount}
          followingCount={profile.followingCount}
          headerActions={
            <div className="flex items-start gap-2">
              {capabilities.canFollow && (
                <button
                  type="button"
                  onClick={handleFollowAction}
                  disabled={isFollowActionPending}
                  className="inline-flex h-8 items-center justify-center rounded-full border border-[var(--color-secondary)] bg-[var(--color-secondary)] px-3 text-xs font-semibold text-[var(--color-on-secondary)] transition hover:brightness-105 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Follow
                </button>
              )}
              {relationship === 'requested' && (
                <span className="inline-flex h-8 items-center justify-center rounded-full border border-[var(--color-surface-border)] bg-[var(--color-surface)] px-3 text-xs font-medium text-[var(--color-muted)]">
                  Request sent
                </span>
              )}
              {profileSafetyActions}
            </div>
          }
        />
        <div className="flex items-center gap-2 text-sm text-[var(--color-muted)]">
          <Lock size={14} />
          <span>This profile is private.</span>
        </div>
        {followActionError && (
          <p className="text-xs text-red-600">{followActionError}</p>
        )}
      </div>
    );
  }

  // Full profile (public or approved follower)
  return (
    <div className="w-full max-w-lg mx-auto px-4 py-8 flex flex-col gap-8">
      <ProfileHeader
        username={profile.username}
        avatarPalette={profile.avatarPalette ?? ''}
        avatarFakeBirdImageUrl={profile.avatarFakeBirdImageUrl ?? null}
        joinedMonthYear={profile.joinedMonthYear}
        followerCount={'followerCount' in profile ? profile.followerCount : undefined}
        followingCount={'followingCount' in profile ? profile.followingCount : undefined}
        isHouseAccount={profile.isHouseAccount}
        onFollowersClick={data.visibility.reason === 'public_profile' ? () => {
          setConnectionsModalTab('followers');
          setIsConnectionsModalOpen(true);
        } : undefined}
        onFollowingClick={data.visibility.reason === 'public_profile' ? () => {
          setConnectionsModalTab('following');
          setIsConnectionsModalOpen(true);
        } : undefined}
        headerActions={
          <div className="flex items-start gap-2">
            {(capabilities.canFollow || capabilities.canUnfollow) && (
              <button
                type="button"
                onClick={handleFollowAction}
                disabled={isFollowActionPending}
                className={`inline-flex h-8 items-center justify-center rounded-full px-3 text-xs font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed ${
                  capabilities.canUnfollow
                    ? 'border border-[var(--color-secondary)] bg-[var(--color-surface)] text-[var(--color-secondary)] hover:bg-[var(--color-surface-hover)]'
                    : 'border border-[var(--color-secondary)] bg-[var(--color-secondary)] text-[var(--color-on-secondary)] hover:brightness-105'
                }`}
              >
                {capabilities.canUnfollow ? 'Unfollow' : 'Follow'}
              </button>
            )}
            {profileSafetyActions}
          </div>
        }
      />

      {followActionError && (
        <p className="-mt-5 text-xs text-red-600">{followActionError}</p>
      )}

      <ProgressSummary progress={profile.progress} />

      {data.visibility.reason === 'owner' ? (
        <BirdhousePreviewCard />
      ) : (
        <PublicBirdhousePreviewCard username={profile.username} />
      )}

      <section>
        <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold mb-3">
          Trophy Case
        </h2>
        <TrophyCaseReadOnly
          birdsIdentified={profile.progress.birdsIdentified}
          firstPlaceCount={profile.progress.firstPlaceCount}
          secondPlaceCount={profile.progress.secondPlaceCount}
          thirdPlaceCount={profile.progress.thirdPlaceCount}
          badgeLimit={4}
        />
      </section>

      {data.visibility.reason === 'public_profile' ? (
        <ProfileConnectionsModal
          isOpen={isConnectionsModalOpen}
          username={profile.username}
          initialTab={connectionsModalTab}
          followerCount={'followerCount' in profile ? profile.followerCount : undefined}
          followingCount={'followingCount' in profile ? profile.followingCount : undefined}
          onClose={() => setIsConnectionsModalOpen(false)}
        />
      ) : null}
    </div>
  );
}
