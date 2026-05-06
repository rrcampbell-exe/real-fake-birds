'use client';

import type { ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Bot } from 'lucide-react';
import LeaderboardAvatar from '@/components/leaderboard/LeaderboardAvatar';
import { toBadgeAssetName } from '@/lib/utils/badge-assets';
import type { SocialUserEntry } from '@/types/social';

interface SocialUserRowProps {
  entry: SocialUserEntry;
  onRelationshipAction?: (entry: SocialUserEntry) => void;
  isActionPending?: boolean;
  profileHref?: string;
  onProfileClick?: () => void;
  trailingControls?: ReactNode;
  hideProfileButtonOnMobile?: boolean;
}

function getRelationshipLabel(entry: SocialUserEntry): string | null {
  if (entry.capabilities.canUnfollow) {
    return 'Unfollow';
  }

  if (entry.relationship === 'requested') {
    return 'Requested';
  }

  if (entry.capabilities.canFollow) {
    return 'Follow';
  }

  return null;
}

export default function SocialUserRow({
  entry,
  onRelationshipAction,
  isActionPending = false,
  profileHref,
  onProfileClick,
  trailingControls,
  hideProfileButtonOnMobile = false,
}: SocialUserRowProps) {
  const resolvedProfileHref = profileHref ?? `/profile/${entry.username}`;
  const relationshipLabel = getRelationshipLabel(entry);
  const isRelationshipDisabled = entry.relationship === 'requested' || isActionPending;
  const defaultControls = (
    <>
      {relationshipLabel ? (
        <button
          type="button"
          onClick={() => onRelationshipAction?.(entry)}
          disabled={isRelationshipDisabled}
          aria-label={`${relationshipLabel} ${entry.username}`}
          className={`inline-flex h-9 items-center justify-center rounded-full px-3 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
            entry.capabilities.canUnfollow
              ? 'border border-[var(--color-secondary)] bg-[var(--color-surface)] text-[var(--color-secondary)] hover:bg-[var(--color-surface-hover)]'
              : entry.relationship === 'requested'
                ? 'border border-[var(--color-surface-border)] bg-[var(--color-surface)] text-[var(--color-muted)]'
                : 'bg-[var(--color-secondary)] text-[var(--color-on-secondary)] hover:brightness-105'
          }`}
        >
          {relationshipLabel}
        </button>
      ) : null}
      <Link
        href={resolvedProfileHref}
        onClick={onProfileClick}
        className={`${
          hideProfileButtonOnMobile ? 'hidden sm:inline-flex' : 'inline-flex'
        } h-9 items-center justify-center gap-1.5 rounded-full border border-[var(--color-surface-border)] bg-[var(--color-surface)] px-3 text-xs font-semibold text-[var(--color-text)] transition hover:bg-[var(--color-surface-hover)]`}
      >
        See profile
        <ArrowRight size={13} aria-hidden="true" />
      </Link>
    </>
  );

  return (
    <li className="flex items-center gap-3 rounded-[1.35rem] border border-[var(--color-surface-border)] bg-[var(--color-surface)] px-3 py-3 transition hover:bg-[var(--color-surface-hover)]">
      <Link href={resolvedProfileHref} onClick={onProfileClick} className="flex min-w-0 flex-1 items-center gap-3">
        <LeaderboardAvatar
          username={entry.username}
          avatarPalette={entry.avatarPalette}
          avatarBirdImageUrl={entry.avatarFakeBirdImageUrl ?? null}
          size="sm"
        />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <p className="truncate text-sm font-semibold text-[var(--color-text)]">{entry.username}</p>
            {entry.isHouseAccount ? (
              <Bot size={12} className="shrink-0 text-[var(--color-muted)]" aria-label="House account" />
            ) : entry.latestBadgeName ? (
              <Image
                src={`/images/badges/${toBadgeAssetName(entry.latestBadgeName)}.png`}
                alt={entry.latestBadgeName}
                width={18}
                height={18}
                className="shrink-0 rounded-full border border-[var(--color-text)] opacity-75"
                title={entry.latestBadgeName}
              />
            ) : null}
          </div>
        </div>
      </Link>
      <div className="flex shrink-0 items-center gap-2">
        {trailingControls ?? defaultControls}
      </div>
    </li>
  );
}