'use client';

import Link from 'next/link';

interface FollowerSummaryProps {
  followerCount?: number;
  followingCount?: number;
  onFollowersClick?: () => void;
  onFollowingClick?: () => void;
  followersHref?: string;
  followingHref?: string;
}

export default function FollowerSummary({
  followerCount,
  followingCount,
  onFollowersClick,
  onFollowingClick,
  followersHref,
  followingHref,
}: FollowerSummaryProps) {
  const isLoading = followerCount === undefined || followingCount === undefined;

  const pillClassName = 'inline-flex items-center gap-1.5 rounded-full border border-[var(--color-surface-border)] bg-[var(--color-surface)] px-3 py-1 text-sm transition-colors';

  const renderPill = (
    count: number,
    label: 'followers' | 'following',
    href?: string,
    onClick?: () => void,
  ) => {
    const ariaLabel = `${count} ${label}`;
    const content = (
      <>
        <span className="font-semibold text-[var(--color-text)]">{count}</span>
        <span className="text-[var(--color-muted)]">{label}</span>
      </>
    );

    if (href) {
      return (
        <Link href={href} aria-label={ariaLabel} className={`${pillClassName} hover:bg-[var(--color-surface-hover)]`}>
          {content}
        </Link>
      );
    }

    if (onClick) {
      return (
        <button
          type="button"
          onClick={onClick}
          aria-label={ariaLabel}
          className={`${pillClassName} hover:bg-[var(--color-surface-hover)]`}
        >
          {content}
        </button>
      );
    }

    return (
      <span className={pillClassName} aria-label={ariaLabel}>
        {content}
      </span>
    );
  };

  return (
    <section data-testid="follower-summary">
      <div className="flex items-center gap-2">
        {isLoading ? (
          <span className="flex items-center gap-2" aria-label="Loading follower counts">
            <span className="h-7 w-24 rounded-full bg-[var(--color-surface)] animate-pulse inline-block" />
            <span className="h-7 w-28 rounded-full bg-[var(--color-surface)] animate-pulse inline-block" />
          </span>
        ) : (
          <>
            {renderPill(followerCount, 'followers', followersHref, onFollowersClick)}
            {renderPill(followingCount, 'following', followingHref, onFollowingClick)}
          </>
        )}
      </div>
    </section>
  );
}
