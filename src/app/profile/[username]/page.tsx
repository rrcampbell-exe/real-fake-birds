'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Lock, Birdhouse } from 'lucide-react';
import { useScreenViewed } from '@/hooks/useScreenViewed';
import LeaderboardAvatar from '@/components/leaderboard/LeaderboardAvatar';
import type { ProfileReadResponse } from '@/types/profile';

function useProfileData(username: string) {
  const [data, setData] = useState<ProfileReadResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!username) return;

    let cancelled = false;

    fetch(`/api/profile?username=${encodeURIComponent(username.toLowerCase())}`)
      .then(async (res) => {
        if (!res.ok && res.status !== 200) {
          throw new Error('profile_fetch_failed');
        }
        return res.json() as Promise<ProfileReadResponse>;
      })
      .then((json) => {
        if (!cancelled) {
          setData(json);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError('Unable to load this profile.');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [username]);

  return { data, isLoading, error, refetch: () => {
    setIsLoading(true);
    fetch(`/api/profile?username=${encodeURIComponent(username.toLowerCase())}`)
      .then(async (res) => {
        if (!res.ok && res.status !== 200) {
          throw new Error('profile_fetch_failed');
        }
        return res.json() as Promise<ProfileReadResponse>;
      })
      .then((json) => {
        if (!cancelled) {
          setData(json);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError('Unable to load this profile.');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });
  } };
}

export default function UserProfilePage() {
  useScreenViewed('profile-view');
  const params = useParams();
  const username = typeof params?.username === 'string' ? params.username : '';
  const { data, isLoading, error, refetch } = useProfileData(username);
  const [isFollowActionPending, setIsFollowActionPending] = useState(false);
  const [followActionError, setFollowActionError] = useState<string | null>(null);

  const handleFollowAction = async () => {
    if (!data?.profile || data.profile.kind === 'restricted') {
      return;
    }

    setIsFollowActionPending(true);
    setFollowActionError(null);

    try {
      // Determine action based on current relationship
      const action = data.relationship === 'following' ? 'unfollow' : 'request';

      const response = await fetch('/api/follow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          targetUsername: profile.username,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setFollowActionError(errorData.error || 'Failed to update follow status');
        return;
      }

      // Refetch profile data to get updated relationship state
      await refetch();
    } catch (err) {
      setFollowActionError('Failed to update follow status');
    } finally {
      setIsFollowActionPending(false);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full max-w-lg mx-auto px-4 py-8 flex flex-col gap-4">
        <div className="h-8 w-48 rounded bg-[var(--color-surface)] animate-pulse" />
        <div className="h-4 w-32 rounded bg-[var(--color-surface)] animate-pulse" />
        <div className="h-4 w-64 rounded bg-[var(--color-surface)] animate-pulse" />
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

  const { profile, visibility, relationship, capabilities } = data;

  if (profile.kind === 'restricted') {
    return (
      <div className="w-full max-w-lg mx-auto px-4 py-8 flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <LeaderboardAvatar username={profile.username} avatarPalette={null} size="lg" />
          <div>
            <h1 className="font-[family-name:var(--font-display)] text-xl font-bold">
              {profile.username}
            </h1>
            <p className="text-xs text-[var(--color-muted)]">Joined {profile.joinedMonthYear}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-[var(--color-muted)]">
          <Lock size={14} />
          <span>This profile is private.</span>
        </div>
        {capabilities.canFollow && (
          <button
            type="button"
            onClick={handleFollowAction}
            disabled={isFollowActionPending}
            className="inline-flex items-center justify-center rounded-lg border border-[var(--color-surface-border)] bg-[var(--color-surface)] px-4 py-2 text-sm font-medium w-fit transition hover:bg-[var(--color-surface-hover)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isFollowActionPending ? 'Requesting...' : 'Request to follow'}
          </button>
        )}
        {relationship === 'requested' && (
          <div className="inline-flex items-center justify-center rounded-lg border border-[var(--color-surface-border)] bg-[var(--color-surface)] px-4 py-2 text-sm font-medium w-fit text-[var(--color-muted)]">
            Request sent
          </div>
        )}
        {followActionError && (
          <p className="text-xs text-red-600">{followActionError}</p>
        )}
      </div>
    );
  }

  // Full profile (public or approved follower)
  return (
    <div className="w-full max-w-lg mx-auto px-4 py-8 flex flex-col gap-8">
      <div className="flex items-center gap-3">
        <LeaderboardAvatar
          username={profile.username}
          avatarPalette={profile.avatarPalette ?? null}
          avatarBirdImageUrl={profile.avatarFakeBirdImageUrl ?? null}
          size="lg"
        />
        <div className="flex-1">
          <h1 className="font-[family-name:var(--font-display)] text-xl font-bold">
            {profile.username}
          </h1>
          <p className="text-xs text-[var(--color-muted)]">Joined {profile.joinedMonthYear}</p>
        </div>
      </div>

      {/* Follow action button for non-owned profiles */}
      {relationship !== 'owner' && (
        <div className="flex gap-2">
          {capabilities.canFollow && (
            <button
              type="button"
              onClick={handleFollowAction}
              disabled={isFollowActionPending}
              className="flex-1 rounded-lg border border-[var(--color-surface-border)] bg-[var(--color-surface)] px-4 py-2 text-sm font-medium transition hover:bg-[var(--color-surface-hover)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isFollowActionPending ? 'Following...' : 'Follow'}
            </button>
          )}
          {capabilities.canUnfollow && (
            <button
              type="button"
              onClick={handleFollowAction}
              disabled={isFollowActionPending}
              className="flex-1 rounded-lg border border-[var(--color-surface-border)] bg-[var(--color-surface)] px-4 py-2 text-sm font-medium transition hover:bg-[var(--color-surface-hover)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isFollowActionPending ? 'Unfollowing...' : 'Unfollow'}
            </button>
          )}
        </div>
      )}
      {followActionError && (
        <p className="text-xs text-red-600">{followActionError}</p>
      )}

      <div className="grid grid-cols-3 gap-4 text-center">
        <div>
          <p className="font-[family-name:var(--font-display)] text-2xl font-bold">
            {profile.progress.birdsIdentified}
          </p>
          <p className="text-xs text-[var(--color-muted)]">Birds ID&apos;d</p>
        </div>
        <div>
          <p className="font-[family-name:var(--font-display)] text-2xl font-bold">
            {profile.progress.bestStreak}
          </p>
          <p className="text-xs text-[var(--color-muted)]">Best Streak</p>
        </div>
        <div>
          <p className="font-[family-name:var(--font-display)] text-2xl font-bold">
            {profile.progress.seeds}
          </p>
          <p className="text-xs text-[var(--color-muted)]">Seeds</p>
        </div>
      </div>

      {/* Bird Blitz CTA - placeholder, gated by backend capability */}
      {capabilities.canChallengeBirdBlitz && (
        <button
          type="button"
          disabled
          className="flex items-center gap-3 rounded-2xl border border-[var(--color-surface-border)] bg-[var(--color-surface)] px-4 py-3 text-[var(--color-muted)] opacity-50 cursor-not-allowed"
        >
          <div className="flex-1 min-w-0 text-left">
            <p className="text-sm font-semibold">Bird Blitz</p>
            <p className="text-xs">Coming soon</p>
          </div>
          <span className="text-xs">&rsaquo;</span>
        </button>
      )}

      <Link
        href={`/profile/${username}/birdhouse`}
        className="flex items-center gap-3 rounded-2xl border border-[var(--color-surface-border)] bg-[var(--color-surface)] px-4 py-3 transition hover:bg-[var(--color-surface-hover)]"
      >
        <Birdhouse size={20} className="shrink-0 text-[var(--color-secondary)]" aria-hidden="true" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">Birdhouse</p>
          <p className="text-xs text-[var(--color-muted)]">Birds worth keeping</p>
        </div>
        <span className="text-xs text-[var(--color-muted)]">&rsaquo;</span>
      </Link>
    </div>
  );
}
