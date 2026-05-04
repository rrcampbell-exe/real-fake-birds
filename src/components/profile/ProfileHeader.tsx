'use client';

import Link from 'next/link';
import { Lock, Globe } from 'lucide-react';
import LeaderboardAvatar from '@/components/leaderboard/LeaderboardAvatar';
import FollowerSummary from '@/components/profile/FollowerSummary';

interface ProfileHeaderProps {
  username: string;
  avatarPalette: string;
  joinedMonthYear: string;
  privacyMode?: 'public' | 'private';
  isOwner?: boolean;
}

export default function ProfileHeader({
  username,
  avatarPalette,
  joinedMonthYear,
  privacyMode,
  isOwner = false,
}: ProfileHeaderProps) {
  const isPublic = privacyMode !== 'private';

  return (
    <div className="flex items-start gap-4">
      <LeaderboardAvatar username={username} avatarPalette={avatarPalette} size="lg" />
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
