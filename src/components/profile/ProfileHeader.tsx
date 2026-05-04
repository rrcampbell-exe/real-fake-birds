'use client';

import Link from 'next/link';
import { Camera, Lock, Globe } from 'lucide-react';
import LeaderboardAvatar from '@/components/leaderboard/LeaderboardAvatar';
import FollowerSummary from '@/components/profile/FollowerSummary';

interface ProfileHeaderProps {
  username: string;
  avatarPalette: string;
  avatarFakeBirdImageUrl?: string | null;
  joinedMonthYear: string;
  privacyMode?: 'public' | 'private';
  isOwner?: boolean;
  onEditAvatar?: () => void;
}

export default function ProfileHeader({
  username,
  avatarPalette,
  avatarFakeBirdImageUrl,
  joinedMonthYear,
  privacyMode,
  isOwner = false,
  onEditAvatar,
}: ProfileHeaderProps) {
  const isPublic = privacyMode !== 'private';

  return (
    <div className="flex items-start gap-4">
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
      <div className="min-w-0 flex-1 flex flex-col gap-2">
        <div className="flex items-start gap-2">
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold leading-tight truncate flex-1">
            {username}
          </h1>
          {isOwner && privacyMode && (
            <Link
              href="/settings"
              className="shrink-0 inline-flex items-center gap-1 rounded-full border border-[var(--color-surface-border)] bg-[var(--color-surface-hover)] px-2 py-px text-[0.65rem] font-medium text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors"
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
        </div>
        {(isPublic || isOwner) && <FollowerSummary />}
        <p className="text-xs text-[var(--color-muted)]">Joined {joinedMonthYear}</p>
      </div>
    </div>
  );
}
