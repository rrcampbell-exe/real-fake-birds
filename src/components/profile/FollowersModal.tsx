'use client';

import { apiFetch } from '@/lib/api/client';
import { useEffect, useRef, useState } from 'react';
import { Check, Search, UserMinus, X } from 'lucide-react';
import Link from 'next/link';
import LeaderboardAvatar from '@/components/leaderboard/LeaderboardAvatar';
import type { FollowEntry, FollowersResponse } from '@/app/api/followers/route';
import type { UserSearchEntry } from '@/app/api/users/search/route';

type Tab = 'followers' | 'following' | 'requests' | 'search';

interface FollowersModalProps {
  isOpen: boolean;
  initialTab?: Tab;
  /** True when the viewer is also the owner — enables remove/approve/deny buttons */
  isOwner?: boolean;
  onClose: () => void;
  onUnfollowed?: (userId: string) => void;
}

export default function FollowersModal({
  isOpen,
  initialTab = 'followers',
  isOwner = false,
  onClose,
  onUnfollowed,
}: FollowersModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [data, setData] = useState<FollowersResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Action pending state (maps userId → action type)
  const [actionPending, setActionPending] = useState<string | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchEntry[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelledRef = useRef(false);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  useEffect(() => {
    if (!isOpen) return;
    cancelledRef.current = false;

    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const res = await apiFetch('/api/followers');
        if (!res.ok) throw new Error('fetch_failed');
        const json = (await res.json()) as FollowersResponse;
        if (!cancelledRef.current) {
          setData(json);
        }
      } catch {
        if (!cancelledRef.current) {
          setError('Unable to load followers.');
        }
      } finally {
        if (!cancelledRef.current) {
          setIsLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelledRef.current = true;
    };
  }, [isOpen]);

  const handleUnfollow = async (entry: FollowEntry) => {
    setActionPending(entry.userId);
    try {
      const res = await apiFetch('/api/follow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'unfollow', targetUsername: entry.username }),
      });
      if (!res.ok) return;
      setData((prev) =>
        prev ? { ...prev, following: prev.following.filter((f) => f.userId !== entry.userId) } : prev,
      );
      onUnfollowed?.(entry.userId);
    } finally {
      setActionPending(null);
    }
  };

  const handleRemoveFollower = async (entry: FollowEntry) => {
    setActionPending(entry.userId);
    try {
      const res = await apiFetch('/api/follow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'remove_follower', targetUserId: entry.userId }),
      });
      if (!res.ok) return;
      setData((prev) =>
        prev ? { ...prev, followers: prev.followers.filter((f) => f.userId !== entry.userId) } : prev,
      );
    } finally {
      setActionPending(null);
    }
  };

  const handleApprove = async (entry: FollowEntry) => {
    setActionPending(entry.userId);
    try {
      const res = await apiFetch('/api/follow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve', targetUserId: entry.userId }),
      });
      if (!res.ok) return;
      setData((prev) =>
        prev
          ? {
              ...prev,
              pendingRequests: prev.pendingRequests.filter((r) => r.userId !== entry.userId),
              followers: [...prev.followers, entry],
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
      const res = await apiFetch('/api/follow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deny', targetUserId: entry.userId }),
      });
      if (!res.ok) return;
      setData((prev) =>
        prev
          ? { ...prev, pendingRequests: prev.pendingRequests.filter((r) => r.userId !== entry.userId) }
          : prev,
      );
    } finally {
      setActionPending(null);
    }
  };

  const searchCancelledRef = useRef(false);

  useEffect(() => {
    if (!isOpen) {
      searchCancelledRef.current = true;
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
        searchDebounceRef.current = null;
      }
      setIsSearching(false);
      return;
    }

    searchCancelledRef.current = false;

    return () => {
      searchCancelledRef.current = true;
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
        searchDebounceRef.current = null;
      }
    };
  }, [isOpen]);

  const handleSearchChange = (q: string) => {
    setSearchQuery(q);
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
      searchDebounceRef.current = null;
    }
    if (q.trim().length < 1) {
      setSearchResults([]);
      return;
    }
    searchDebounceRef.current = setTimeout(async () => {
      if (searchCancelledRef.current) return;

      setIsSearching(true);
      try {
        const res = await apiFetch(`/api/users/search?q=${encodeURIComponent(q.trim())}`);
        if (!res.ok || searchCancelledRef.current) return;
        const json = (await res.json()) as { users: UserSearchEntry[] };
        if (searchCancelledRef.current) return;
        setSearchResults(json.users ?? []);
      } catch {
        // silently degrade
      } finally {
        if (!searchCancelledRef.current) {
          setIsSearching(false);
        }
      }
    }, 300);
  };

  if (!isOpen) return null;

  const pendingCount = data?.pendingRequests?.length ?? 0;

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: 'followers', label: 'Followers', count: data?.followers.length },
    { id: 'following', label: 'Following', count: data?.following.length },
    ...(isOwner && pendingCount > 0 ? [{ id: 'requests' as Tab, label: 'Requests', count: pendingCount }] : []),
    { id: 'search', label: 'Search' },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Social connections"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
    >
      <div className="absolute inset-0 bg-black/70" onClick={onClose} aria-hidden="true" />

      <div className="relative z-10 w-full max-w-lg bg-[var(--color-surface)] border border-[var(--color-surface-border)] rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[80vh]" style={{ backgroundColor: 'var(--color-surface)' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2 shrink-0">
          <div className="flex gap-3 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`text-sm font-semibold pb-1 border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-[var(--color-primary)] text-[var(--color-text)]'
                    : 'border-transparent text-[var(--color-muted)] hover:text-[var(--color-text)]'
                }`}
              >
                {tab.label}
                {tab.count !== undefined ? ` (${tab.count})` : ''}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="ml-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--color-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)] transition-colors"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-4 pb-4">
          {/* Search tab */}
          {activeTab === 'search' && (
            <div className="pt-2">
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)]" aria-hidden="true" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder="Search by username"
                  className="w-full rounded-xl border border-[var(--color-surface-border)] bg-[var(--color-surface)] py-2 pl-9 pr-3 text-sm text-[var(--color-text)] placeholder:text-[var(--color-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                />
              </div>
              {isSearching && (
                <div className="flex flex-col gap-3 pt-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-[var(--color-surface)] animate-pulse shrink-0" />
                      <div className="h-4 w-32 rounded bg-[var(--color-surface)] animate-pulse" />
                    </div>
                  ))}
                </div>
              )}
              {!isSearching && searchResults.length > 0 && (
                <ul className="flex flex-col gap-1 pt-3">
                  {searchResults.map((entry) => (
                    <li key={entry.userId} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-[var(--color-surface-hover)] transition-colors">
                      <Link
                        href={`/profile/${entry.username}`}
                        onClick={onClose}
                        className="flex items-center gap-3 flex-1 min-w-0"
                      >
                        <LeaderboardAvatar
                          username={entry.username}
                          avatarPalette={entry.avatarPalette}
                          avatarBirdImageUrl={entry.avatarFakeBirdImageUrl ?? null}
                          size="sm"
                        />
                        <span className="text-sm font-medium truncate">{entry.username}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              {!isSearching && searchQuery.trim().length > 0 && searchResults.length === 0 && (
                <p className="pt-4 text-sm text-[var(--color-muted)]">No users found.</p>
              )}
            </div>
          )}

          {/* Requests tab */}
          {activeTab === 'requests' && isOwner && (
            <>
              {isLoading && (
                <div className="flex flex-col gap-3 pt-2">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-[var(--color-surface)] animate-pulse shrink-0" />
                      <div className="h-4 w-32 rounded bg-[var(--color-surface)] animate-pulse" />
                    </div>
                  ))}
                </div>
              )}
              {!isLoading && (data?.pendingRequests?.length ?? 0) === 0 && (
                <p className="pt-4 text-sm text-[var(--color-muted)]">No pending follow requests.</p>
              )}
              {!isLoading && (data?.pendingRequests?.length ?? 0) > 0 && (
                <ul className="flex flex-col gap-1 pt-2">
                  {(data?.pendingRequests ?? []).map((entry) => (
                    <li key={entry.userId} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-[var(--color-surface-hover)] transition-colors">
                      <Link
                        href={`/profile/${entry.username}`}
                        onClick={onClose}
                        className="flex items-center gap-3 flex-1 min-w-0"
                      >
                        <LeaderboardAvatar
                          username={entry.username}
                          avatarPalette={entry.avatarPalette}
                          avatarBirdImageUrl={entry.avatarFakeBirdImageUrl ?? null}
                          size="sm"
                        />
                        <span className="text-sm font-medium truncate">{entry.username}</span>
                      </Link>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleApprove(entry)}
                          disabled={actionPending === entry.userId}
                          aria-label={`Approve follow request from ${entry.username}`}
                          className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-secondary)] text-[var(--color-on-secondary)] transition hover:brightness-110 disabled:opacity-50"
                        >
                          <Check size={14} aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeny(entry)}
                          disabled={actionPending === entry.userId}
                          aria-label={`Deny follow request from ${entry.username}`}
                          className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)] transition-colors disabled:opacity-50"
                        >
                          <X size={14} aria-hidden="true" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}

          {/* Followers / Following tabs */}
          {(activeTab === 'followers' || activeTab === 'following') && (
            <>
              {isLoading && (
                <div className="flex flex-col gap-3 pt-2">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-[var(--color-surface)] animate-pulse shrink-0" />
                      <div className="h-4 w-32 rounded bg-[var(--color-surface)] animate-pulse" />
                    </div>
                  ))}
                </div>
              )}

              {error && <p className="pt-4 text-sm text-[var(--color-muted)]">{error}</p>}

              {!isLoading && !error && (activeTab === 'followers' ? data?.followers ?? [] : data?.following ?? []).length === 0 && (
                <p className="pt-4 text-sm text-[var(--color-muted)]">
                  {activeTab === 'followers' ? 'No followers yet.' : 'Not following anyone yet.'}
                </p>
              )}

              {!isLoading && !error && (() => {
                const list = activeTab === 'followers' ? (data?.followers ?? []) : (data?.following ?? []);
                return list.length > 0 ? (
                  <ul className="flex flex-col gap-1 pt-2">
                    {list.map((entry) => (
                      <li key={entry.userId} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-[var(--color-surface-hover)] transition-colors">
                        <Link
                          href={`/profile/${entry.username}`}
                          onClick={onClose}
                          className="flex items-center gap-3 flex-1 min-w-0"
                        >
                          <LeaderboardAvatar
                            username={entry.username}
                            avatarPalette={entry.avatarPalette}
                            avatarBirdImageUrl={entry.avatarFakeBirdImageUrl ?? null}
                            size="sm"
                          />
                          <span className="text-sm font-medium truncate">{entry.username}</span>
                        </Link>
                        {isOwner && activeTab === 'following' && (
                          <button
                            type="button"
                            onClick={() => handleUnfollow(entry)}
                            disabled={actionPending === entry.userId}
                            aria-label={`Unfollow ${entry.username}`}
                            className="shrink-0 flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)] transition-colors disabled:opacity-50"
                          >
                            <UserMinus size={15} aria-hidden="true" />
                          </button>
                        )}
                        {isOwner && activeTab === 'followers' && (
                          <button
                            type="button"
                            onClick={() => handleRemoveFollower(entry)}
                            disabled={actionPending === entry.userId}
                            aria-label={`Remove ${entry.username} as follower`}
                            className="shrink-0 flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)] transition-colors disabled:opacity-50"
                          >
                            <UserMinus size={15} aria-hidden="true" />
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : null;
              })()}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
