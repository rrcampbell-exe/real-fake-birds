'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { Bot, Camera, Lock, Globe } from 'lucide-react';
import LeaderboardAvatar from '@/components/leaderboard/LeaderboardAvatar';
import FollowerSummary from '@/components/profile/FollowerSummary';

interface ProfileHeaderProps {
  username: string;
  avatarPalette: string;
  avatarFakeBirdImageUrl?: string | null;
  joinedMonthYear: string;
  privacyMode?: 'public' | 'private';
  isOwner?: boolean;
  isPrivacyLoading?: boolean;
  onEditAvatar?: () => void;
  followerCount?: number;
  followingCount?: number;
  isHouseAccount?: boolean;
  onFollowersClick?: () => void;
  onFollowingClick?: () => void;
  followersHref?: string;
  followingHref?: string;
  headerActions?: ReactNode;
  showFollowerSummary?: boolean;
}

export default function ProfileHeader({
  username,
  avatarPalette,
  avatarFakeBirdImageUrl,
  joinedMonthYear,
  privacyMode,
  isOwner = false,
  isPrivacyLoading = false,
  onEditAvatar,
  followerCount,
  followingCount,
  isHouseAccount = false,
  onFollowersClick,
  onFollowingClick,
  followersHref,
  followingHref,
  headerActions,
  showFollowerSummary,
}: ProfileHeaderProps) {
  const isPublic = privacyMode !== 'private';
  const shouldShowFollowerSummary = showFollowerSummary ?? (isPublic || isOwner);

  return (
    <div className="flex items-start gap-4">
      {/* Col 1: Avatar with optional edit overlay */}
      <div className="relative shrink-0">
        <LeaderboardAvatar
          username={username}
          avatarPalette={avatarPalette}
          avatarBirdImageUrl={avatarFakeBirdImageUrl}
          size="lg"
        />
        {isOwner && onEditAvatar && (
          <button
            type="button"
            onClick={onEditAvatar}
            aria-label="Change avatar"
            className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border border-[var(--color-surface-border)] bg-[var(--color-surface)] text-[var(--color-text)] shadow-sm transition hover:bg-[var(--color-surface-hover)]"
          >
            <Camera size={13} aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Col 2: Username, follower summary, joined date */}
      <div className="min-w-0 flex-1 flex flex-col gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <h1 className="truncate font-[family-name:var(--font-display)] text-2xl font-bold leading-tight">
            {username}
          </h1>
          {isHouseAccount ? (
            <Bot size={14} className="shrink-0 text-[var(--color-muted)]" aria-label="House account" />
          ) : null}
        </div>
        {shouldShowFollowerSummary && (
          <FollowerSummary
            followerCount={followerCount}
            followingCount={followingCount}
            onFollowersClick={onFollowersClick}
            onFollowingClick={onFollowingClick}
            followersHref={followersHref}
            followingHref={followingHref}
          />
        )}
        <p className="text-xs text-[var(--color-muted)]">Joined {joinedMonthYear}</p>
      </div>

      {/* Col 3: Privacy pill (own profile) or action buttons (other profiles) */}
      {(headerActions || isOwner) && (
        <div className="shrink-0 flex flex-col items-end gap-2 pt-1">
          {isOwner && isPrivacyLoading && (
            <div className="h-5 w-16 rounded-full bg-[var(--color-surface)] animate-pulse" />
          )}
          {isOwner && !isPrivacyLoading && privacyMode && (
            <Link
              href="/settings"
              className="inline-flex items-center gap-1 rounded-full border border-[var(--color-surface-border)] bg-[var(--color-surface-hover)] px-2 py-px text-[0.65rem] font-medium text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors"
              aria-label="Change privacy setting in Settings"
            >
              {privacyMode === 'private' ? (
                <Lock size={10} aria-hidden="true" />
              ) : (
                <Globe size={10} aria-hidden="true" />
              )}
              {privacyMode === 'private' ? 'Private' : 'Public'}
            </Link>
          )}
          {headerActions}
        </div>
      )}
    </div>
  );
}
