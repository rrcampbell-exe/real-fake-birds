'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowRight,
  Binoculars,
  Bird,
  Check,
  Search,
  UserMinus,
  X,
} from 'lucide-react';
import SocialUserRow from '@/components/profile/SocialUserRow';
import { useAccountState } from '@/components/account/AccountStateProvider';
import { useScreenViewed } from '@/hooks/useScreenViewed';
import type { FollowEntry, FollowersResponse } from '@/app/api/followers/route';
import type { UserSearchEntry } from '@/app/api/users/search/route';
import type { SocialRelationshipStatus, SocialUserEntry } from '@/types/social';

type CommunityTab = 'find' | 'followers' | 'following' | 'requests';

function parseTab(value: string | null): CommunityTab {
  if (value === 'followers' || value === 'following' || value === 'requests') {
    return value;
  }

  if (value === 'search') {
    return 'find';
  }

  return 'find';
}

export default function CommunityPage() {
  useScreenViewed('community-roost');
  const { isSignedIn, accountPrivacyMode } = useAccountState();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<CommunityTab>(() => parseTab(searchParams.get('tab')));
  const [connections, setConnections] = useState<FollowersResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionPending, setActionPending] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchEntry[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelledRef = useRef(false);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const fetchConnections = useCallback(async () => {
    if (!isSignedIn) {
      setConnections(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    cancelledRef.current = false;
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/followers');
      if (!res.ok) {
        throw new Error('followers_fetch_failed');
      }

      const json = (await res.json()) as FollowersResponse;
      if (!cancelledRef.current) {
        setConnections(json);
      }
    } catch {
      if (!cancelledRef.current) {
        setError('Unable to load your community right now.');
      }
    } finally {
      if (!cancelledRef.current) {
        setIsLoading(false);
      }
    }
  }, [isSignedIn]);

  useEffect(() => {
    setActiveTab(parseTab(searchParams.get('tab')));
  }, [searchParams]);

  useEffect(() => {
    if (activeTab === 'find') {
      searchInputRef.current?.focus();
    }
  }, [activeTab]);

  // Clear any pending debounce and mark cancelled on unmount.
  useEffect(() => {
    return () => {
      cancelledRef.current = true;
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isSignedIn) {
      setConnections(null);
      setSearchResults([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    void fetchConnections();

    return () => {
      cancelledRef.current = true;
    };
  }, [fetchConnections, isSignedIn]);

  const updateTab = (nextTab: CommunityTab) => {
    setActiveTab(nextTab);

    const nextParams = new URLSearchParams(searchParams.toString());
    if (nextTab === 'find') {
      nextParams.delete('tab');
    } else {
      nextParams.set('tab', nextTab);
    }

    const nextQuery = nextParams.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);

    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    if (query.trim().length < 1) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    searchDebounceRef.current = setTimeout(async () => {
      if (cancelledRef.current) return;
      setIsSearching(true);
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(query.trim())}`);
        if (!res.ok) {
          return;
        }

        const json = (await res.json()) as { users: UserSearchEntry[] };
        if (!cancelledRef.current) {
          setSearchResults(json.users ?? []);
        }
      } catch {
        // silently degrade
      } finally {
        if (!cancelledRef.current) {
          setIsSearching(false);
        }
      }
    }, 300);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setIsSearching(false);
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }
    searchInputRef.current?.focus();
  };

  const handleRelationshipAction = async (entry: SocialUserEntry) => {
    const action = entry.capabilities.canUnfollow ? 'unfollow' : entry.capabilities.canFollow ? 'request' : null;
    if (!action) {
      return;
    }

    setActionPending(entry.userId);

    try {
      const res = await fetch('/api/follow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, targetUsername: entry.username }),
      });

      if (!res.ok) {
        return;
      }

      const json = (await res.json().catch(() => ({}))) as { relationship?: SocialRelationshipStatus };
      const nextRelationship: SocialRelationshipStatus = action === 'unfollow'
        ? 'none'
        : json.relationship === 'requested'
          ? 'requested'
          : 'following';

      setSearchResults((prev) =>
        prev.map((candidate) =>
          candidate.userId === entry.userId
            ? {
                ...candidate,
                relationship: nextRelationship,
                capabilities: {
                  canFollow: nextRelationship === 'none',
                  canUnfollow: nextRelationship === 'following',
                },
              }
            : candidate,
        ),
      );

      void fetchConnections();
    } finally {
      setActionPending(null);
    }
  };

  const handleUnfollow = async (entry: FollowEntry) => {
    setActionPending(entry.userId);
    try {
      const res = await fetch('/api/follow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'unfollow', targetUsername: entry.username }),
      });

      if (!res.ok) {
        return;
      }

      setConnections((prev) =>
        prev
          ? { ...prev, following: prev.following.filter((followed) => followed.userId !== entry.userId) }
          : prev,
      );
    } finally {
      setActionPending(null);
    }
  };

  const handleRemoveFollower = async (entry: FollowEntry) => {
    setActionPending(entry.userId);
    try {
      const res = await fetch('/api/follow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'remove_follower', targetUserId: entry.userId }),
      });

      if (!res.ok) {
        return;
      }

      setConnections((prev) =>
        prev
          ? { ...prev, followers: prev.followers.filter((follower) => follower.userId !== entry.userId) }
          : prev,
      );
    } finally {
      setActionPending(null);
    }
  };

  const handleApprove = async (entry: FollowEntry) => {
    setActionPending(entry.userId);
    try {
      const res = await fetch('/api/follow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve', targetUserId: entry.userId }),
      });

      if (!res.ok) {
        return;
      }

      setConnections((prev) =>
        prev
          ? {
              ...prev,
              pendingRequests: prev.pendingRequests.filter((request) => request.userId !== entry.userId),
              followers: [entry, ...prev.followers],
            }
          : prev,
      );
    } finally {
      setActionPending(null);
    }
  };

  const handleDeny = async (entry: FollowEntry) => {
    setActionPending(entry.userId);
    try {
      const res = await fetch('/api/follow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deny', targetUserId: entry.userId }),
      });

      if (!res.ok) {
        return;
      }

      setConnections((prev) =>
        prev
          ? {
              ...prev,
              pendingRequests: prev.pendingRequests.filter((request) => request.userId !== entry.userId),
            }
          : prev,
      );
    } finally {
      setActionPending(null);
    }
  };

  if (!isSignedIn) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
        <section className="overflow-hidden rounded-[2rem] border border-[var(--color-surface-border)] bg-[radial-gradient(circle_at_top_left,color-mix(in_srgb,var(--color-secondary)_16%,transparent),transparent_38%),linear-gradient(145deg,color-mix(in_srgb,var(--color-surface)_82%,#fff_18%),color-mix(in_srgb,var(--color-primary)_62%,black_38%))] p-6 shadow-[var(--shadow-card)]">
          <div className="flex max-w-2xl flex-col gap-4">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[var(--color-surface-border)] bg-[var(--color-surface)] px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-[var(--color-secondary)]">
              <Binoculars size={14} />
              The Roost
            </div>
            <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-[var(--color-text)] md:text-4xl">
              Scout the flock.
            </h1>
            <p className="max-w-xl text-sm leading-6 text-[var(--color-muted)]">
              Find birders by username, keep tabs on your followers, and build a proper little rivalry circle.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/settings"
                className="inline-flex items-center gap-2 rounded-full bg-[var(--color-secondary)] px-4 py-2 text-sm font-semibold text-[var(--color-on-secondary)] transition hover:brightness-105"
              >
                Sign in to join the roost
              </Link>
              <Link
                href="/leaderboard"
                className="inline-flex items-center gap-2 rounded-full border border-[var(--color-surface-border)] bg-[var(--color-surface)] px-4 py-2 text-sm font-semibold text-[var(--color-text)] transition hover:bg-[var(--color-surface-hover)]"
              >
                Browse the leaderboard
              </Link>
            </div>
          </div>
        </section>
      </div>
    );
  }

  const followers = connections?.followers ?? [];
  const following = connections?.following ?? [];
  const pendingRequests = connections?.pendingRequests ?? [];
  const pendingCount = pendingRequests.length;

  const tabs: Array<{ id: CommunityTab; label: string; count?: number }> = [
    { id: 'find', label: 'Find Birders' },
    { id: 'following', label: 'Following', count: following.length },
    { id: 'followers', label: 'Followers', count: followers.length },
    ...(pendingCount > 0 ? [{ id: 'requests' as const, label: 'Requests', count: pendingCount }] : []),
  ];

  const activeList = activeTab === 'followers' ? followers : following;

  const renderUserRow = (entry: FollowEntry, trailingAction?: React.ReactNode) => (
    <SocialUserRow key={entry.userId} entry={entry} trailingControls={trailingAction} />
  );

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8">
      <section className="overflow-hidden rounded-[2rem] border border-[var(--color-surface-border)] bg-[radial-gradient(circle_at_top_left,color-mix(in_srgb,var(--color-secondary)_18%,transparent),transparent_38%),radial-gradient(circle_at_bottom_right,color-mix(in_srgb,var(--color-primary)_22%,transparent),transparent_34%),linear-gradient(145deg,color-mix(in_srgb,var(--color-surface)_82%,#fff_18%),color-mix(in_srgb,var(--color-primary)_62%,black_38%))] p-6 shadow-[var(--shadow-card)]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-surface-border)] bg-[var(--color-surface)] px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-[var(--color-secondary)]">
              <Binoculars size={14} />
              The Roost
            </div>
            <h1 className="mt-4 font-[family-name:var(--font-display)] text-3xl font-bold text-[var(--color-text)] md:text-4xl">
              Find fellow real fake birders.
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--color-muted)]">
              Find friends, follow along, and grow your gaggle.
            </p>
          </div>

          <div className={`grid gap-3 sm:min-w-[18rem] ${accountPrivacyMode === 'private' ? 'grid-cols-3' : 'grid-cols-2'}`}>
            {[
              { label: 'Following', value: following.length },
              { label: 'Followers', value: followers.length },
              ...(accountPrivacyMode === 'private' ? [{ label: 'Requests', value: pendingCount }] : []),
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-[1.35rem] border border-[var(--color-surface-border)] bg-[var(--color-surface)] px-3 py-3 text-center"
              >
                <p className="font-[family-name:var(--font-display)] text-2xl font-bold text-[var(--color-text)]">{item.value}</p>
                <p className="mt-1 text-[0.72rem] uppercase tracking-[0.14em] text-[var(--color-muted)]">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-[var(--color-surface-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-card)]">
        <div className="flex flex-wrap items-center gap-2 border-b border-[var(--color-surface-border)] pb-3">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => updateTab(tab.id)}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
                  isActive
                    ? 'bg-[var(--color-secondary)] text-[var(--color-on-secondary)]'
                    : 'border border-[var(--color-surface-border)] bg-[var(--color-surface)] text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]'
                }`}
              >
                {tab.label}
                {tab.count !== undefined ? (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[0.7rem] ${
                      isActive
                        ? 'bg-[var(--color-on-secondary)]/18 text-[var(--color-on-secondary)]'
                        : 'bg-[var(--color-surface-hover)] text-[var(--color-muted)]'
                    }`}
                  >
                    {tab.count}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        <div className="pt-4">
          {activeTab === 'find' && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-[var(--color-text)]">
                    Scout for birders
                  </h2>
                  <p className="mt-1 text-sm text-[var(--color-muted)]">
                    Search by username, or hop to the leaderboard for a wider field guide.
                  </p>
                </div>
                <Link
                  href="/leaderboard"
                  className="inline-flex items-center gap-2 rounded-full border border-[var(--color-surface-border)] bg-[var(--color-surface)] px-4 py-2 text-sm font-semibold text-[var(--color-text)] transition hover:bg-[var(--color-surface-hover)]"
                >
                  Browse leaderboard
                  <ArrowRight size={14} />
                </Link>
              </div>

              <div className="relative">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)]"
                  aria-hidden="true"
                />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(event) => handleSearchChange(event.target.value)}
                  placeholder="Search by username"
                  className="w-full rounded-[1.35rem] border border-[var(--color-surface-border)] bg-[var(--color-surface)] py-3 pl-10 pr-12 text-sm text-[var(--color-text)] placeholder:text-[var(--color-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                />
                {searchQuery.trim().length > 0 ? (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    aria-label="Clear search"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text)] transition hover:text-[var(--color-secondary)]"
                  >
                    <X size={14} aria-hidden="true" />
                  </button>
                ) : null}
              </div>

              <div className={isSearching || searchResults.length > 0 ? 'max-h-[24rem] overflow-y-auto pr-1' : ''}>
                {isSearching && (
                  <div className="flex flex-col gap-3">
                  {[...Array(3)].map((_, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 rounded-[1.35rem] border border-[var(--color-surface-border)] bg-[var(--color-surface)] px-3 py-3"
                    >
                      <div className="h-10 w-10 shrink-0 rounded-full bg-[var(--color-surface-hover)] animate-pulse" />
                      <div className="h-4 w-32 rounded bg-[var(--color-surface-hover)] animate-pulse" />
                    </div>
                  ))}
                  </div>
                )}

                {!isSearching && searchQuery.trim().length === 0 && (
                  <div className="rounded-[1.5rem] border border-dashed border-[var(--color-surface-border)] bg-[color-mix(in_srgb,var(--color-surface)_88%,white_12%)] p-5">
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-surface)] text-[var(--color-secondary)]">
                        <Bird size={18} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[var(--color-text)]">Start with a username</p>
                        <p className="mt-1 text-sm leading-6 text-[var(--color-muted)]">
                          Search works best when you already know who you are looking for. If you want to explore, the leaderboard is still the quickest field guide.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {!isSearching && searchQuery.trim().length > 0 && searchResults.length > 0 && (
                  <ul className="flex flex-col gap-3">
                    {searchResults.map((entry) => (
                      <SocialUserRow
                        key={entry.userId}
                        entry={entry}
                        onRelationshipAction={handleRelationshipAction}
                        isActionPending={actionPending === entry.userId}
                        hideProfileButtonOnMobile
                      />
                    ))}
                  </ul>
                )}

                {!isSearching && searchQuery.trim().length > 0 && searchResults.length === 0 && (
                  <div className="rounded-[1.5rem] border border-[var(--color-surface-border)] bg-[var(--color-surface)] p-5">
                    <p className="text-sm font-semibold text-[var(--color-text)]">No birders found.</p>
                    <p className="mt-1 text-sm leading-6 text-[var(--color-muted)]">
                      Try a different keyword, full username, or browse the leaderboard to pick a profile from the field.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {(activeTab === 'followers' || activeTab === 'following') && (
            <div className="flex flex-col gap-4">
              <div>
                <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-[var(--color-text)]">
                  {activeTab === 'followers' ? 'Your followers' : 'Birders you follow'}
                </h2>
                <p className="mt-1 text-sm text-[var(--color-muted)]">
                  {activeTab === 'followers'
                    ? 'Anyone who is currently perched on your updates.'
                    : 'The birders whose profiles you can reach again quickly.'}
                </p>
              </div>

              {isLoading && (
                <div className="flex flex-col gap-3">
                  {[...Array(3)].map((_, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 rounded-[1.35rem] border border-[var(--color-surface-border)] bg-[var(--color-surface)] px-3 py-3"
                    >
                      <div className="h-10 w-10 shrink-0 rounded-full bg-[var(--color-surface-hover)] animate-pulse" />
                      <div className="h-4 w-32 rounded bg-[var(--color-surface-hover)] animate-pulse" />
                    </div>
                  ))}
                </div>
              )}

              {!isLoading && error && (
                <div className="rounded-[1.5rem] border border-[var(--color-surface-border)] bg-[var(--color-surface)] p-5">
                  <p className="text-sm text-[var(--color-muted)]">{error}</p>
                </div>
              )}

              {!isLoading && !error && activeList.length === 0 && (
                <div className="rounded-[1.5rem] border border-dashed border-[var(--color-surface-border)] bg-[color-mix(in_srgb,var(--color-surface)_88%,white_12%)] p-5">
                  <p className="text-sm font-semibold text-[var(--color-text)]">
                    {activeTab === 'followers' ? 'No followers yet.' : 'You are not following anyone yet.'}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-[var(--color-muted)]">
                    {activeTab === 'followers'
                      ? 'Give people an obvious way to find you, or go scout a few names yourself to get the flock moving.'
                      : 'The easiest next move is to find a birder by username and follow them from their profile.'}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => updateTab('find')}
                      className="inline-flex items-center gap-2 rounded-full bg-[var(--color-secondary)] px-4 py-2 text-sm font-semibold text-[var(--color-on-secondary)] transition hover:brightness-105"
                    >
                      <Search size={14} />
                      Find birders
                    </button>
                    <Link
                      href="/leaderboard"
                      className="inline-flex items-center gap-2 rounded-full border border-[var(--color-surface-border)] bg-[var(--color-surface)] px-4 py-2 text-sm font-semibold text-[var(--color-text)] transition hover:bg-[var(--color-surface-hover)]"
                    >
                      Browse leaderboard
                    </Link>
                  </div>
                </div>
              )}

              {!isLoading && !error && activeList.length > 0 && (
                <ul className="flex flex-col gap-3">
                  {activeList.map((entry) =>
                    renderUserRow(
                      entry,
                      activeTab === 'following' ? (
                        <button
                          type="button"
                          onClick={() => void handleUnfollow(entry)}
                          disabled={actionPending === entry.userId}
                          aria-label={`Unfollow ${entry.username}`}
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--color-muted)] transition hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)] disabled:opacity-50"
                        >
                          <UserMinus size={16} aria-hidden="true" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => void handleRemoveFollower(entry)}
                          disabled={actionPending === entry.userId}
                          aria-label={`Remove ${entry.username} as follower`}
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--color-muted)] transition hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)] disabled:opacity-50"
                        >
                          <UserMinus size={16} aria-hidden="true" />
                        </button>
                      ),
                    ),
                  )}
                </ul>
              )}
            </div>
          )}

          {activeTab === 'requests' && (
            <div className="flex flex-col gap-4">
              <div>
                <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-[var(--color-text)]">
                  Follow requests
                </h2>
                <p className="mt-1 text-sm text-[var(--color-muted)]">
                  Approve the birders who should be allowed into your private roost.
                </p>
              </div>

              {isLoading && (
                <div className="flex flex-col gap-3">
                  {[...Array(3)].map((_, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 rounded-[1.35rem] border border-[var(--color-surface-border)] bg-[var(--color-surface)] px-3 py-3"
                    >
                      <div className="h-10 w-10 shrink-0 rounded-full bg-[var(--color-surface-hover)] animate-pulse" />
                      <div className="h-4 w-32 rounded bg-[var(--color-surface-hover)] animate-pulse" />
                    </div>
                  ))}
                </div>
              )}

              {!isLoading && pendingRequests.length === 0 && (
                <div className="rounded-[1.5rem] border border-dashed border-[var(--color-surface-border)] bg-[color-mix(in_srgb,var(--color-surface)_88%,white_12%)] p-5">
                  <p className="text-sm font-semibold text-[var(--color-text)]">No pending requests.</p>
                  <p className="mt-1 text-sm leading-6 text-[var(--color-muted)]">
                    Anyone who asks to follow you will show up here.
                  </p>
                </div>
              )}

              {!isLoading && pendingRequests.length > 0 && (
                <ul className="flex flex-col gap-3">
                  {pendingRequests.map((entry) =>
                    renderUserRow(
                      entry,
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => void handleApprove(entry)}
                          disabled={actionPending === entry.userId}
                          aria-label={`Approve follow request from ${entry.username}`}
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-secondary)] text-[var(--color-on-secondary)] transition hover:brightness-110 disabled:opacity-50"
                        >
                          <Check size={16} aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDeny(entry)}
                          disabled={actionPending === entry.userId}
                          aria-label={`Deny follow request from ${entry.username}`}
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--color-muted)] transition hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)] disabled:opacity-50"
                        >
                          <X size={16} aria-hidden="true" />
                        </button>
                      </div>,
                    ),
                  )}
                </ul>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}