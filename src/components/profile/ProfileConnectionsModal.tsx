'use client';

import { apiFetch } from '@/lib/api/client';
import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import SocialUserRow from '@/components/profile/SocialUserRow';
import { formatNumber } from '@/lib/utils/number-format';
import type { SocialConnectionsListResponse, SocialRelationshipStatus, SocialUserEntry } from '@/types/social';

type ConnectionsTab = 'followers' | 'following';

interface ProfileConnectionsModalProps {
  isOpen: boolean;
  username: string;
  initialTab: ConnectionsTab;
  followerCount?: number;
  followingCount?: number;
  onClose: () => void;
}

function getNextRelationship(action: 'request' | 'unfollow', relationship: SocialRelationshipStatus | undefined): SocialRelationshipStatus {
  if (action === 'unfollow') {
    return 'none';
  }

  return relationship === 'requested' ? 'requested' : 'following';
}

export default function ProfileConnectionsModal({
  isOpen,
  username,
  initialTab,
  followerCount,
  followingCount,
  onClose,
}: ProfileConnectionsModalProps) {
  const [activeTab, setActiveTab] = useState<ConnectionsTab>(initialTab);
  const [entries, setEntries] = useState<SocialUserEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionPending, setActionPending] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [initialTab, isOpen]);

  useEffect(() => {
    if (!isOpen || !username) {
      return;
    }

    let cancelled = false;

    async function loadEntries() {
      setIsLoading(true);
      setError(null);

      try {
        const res = await apiFetch(
          `/api/profile/connections?username=${encodeURIComponent(username)}&list=${encodeURIComponent(activeTab)}`,
        );

        if (!res.ok) {
          throw new Error('connections_fetch_failed');
        }

        const json = (await res.json()) as SocialConnectionsListResponse;
        if (!cancelled) {
          setEntries(json.entries ?? []);
        }
      } catch {
        if (!cancelled) {
          setError('Unable to load these connections right now.');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadEntries();

    return () => {
      cancelled = true;
    };
  }, [activeTab, isOpen, username]);

  const handleRelationshipAction = async (entry: SocialUserEntry) => {
    const action = entry.capabilities.canUnfollow ? 'unfollow' : entry.capabilities.canFollow ? 'request' : null;
    if (!action) {
      return;
    }

    setActionPending(entry.userId);

    try {
      const res = await apiFetch('/api/follow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, targetUsername: entry.username }),
      });

      if (!res.ok) {
        return;
      }

      const json = (await res.json().catch(() => ({}))) as { relationship?: SocialRelationshipStatus };
      const nextRelationship = getNextRelationship(action, json.relationship);
      setEntries((prev) =>
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
    } finally {
      setActionPending(null);
    }
  };

  if (!isOpen) {
    return null;
  }

  const countLabelByTab: Record<ConnectionsTab, string | null> = {
    followers: followerCount === undefined ? null : formatNumber(followerCount),
    following: followingCount === undefined ? null : formatNumber(followingCount),
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/55 px-3 py-4 backdrop-blur-sm sm:items-center sm:px-4 sm:py-6"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Profile connections"
        className="relative flex max-h-[80vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-[var(--color-surface-border)] bg-[var(--color-modal-bg)] shadow-2xl sm:rounded-3xl"
      >
        <div className="flex items-center justify-between border-b border-[var(--color-surface-border)] px-4 py-3">
          <div className="flex items-center gap-2">
            {(['followers', 'following'] as const).map((tab) => {
              const isActive = tab === activeTab;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`inline-flex items-center rounded-full px-3 py-1.5 text-sm font-semibold transition ${
                    isActive
                      ? 'bg-[var(--color-secondary)] text-[var(--color-on-secondary)]'
                      : 'text-[var(--color-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]'
                  }`}
                >
                  {tab === 'followers' ? 'Followers' : 'Following'}
                  {countLabelByTab[tab] ? (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[0.7rem] ${
                        isActive
                          ? 'bg-[var(--color-on-secondary)]/18 text-[var(--color-on-secondary)]'
                          : 'bg-[var(--color-surface-hover)] text-[var(--color-muted)]'
                      }`}
                    >
                      {countLabelByTab[tab]}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-muted)] transition hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
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
            <p className="text-sm text-[var(--color-muted)]">{error}</p>
          )}

          {!isLoading && !error && entries.length === 0 && (
            <p className="text-sm text-[var(--color-muted)]">
              {activeTab === 'followers' ? 'No followers to show.' : 'No following to show.'}
            </p>
          )}

          {!isLoading && !error && entries.length > 0 && (
            <ul className="flex flex-col gap-3">
              {entries.map((entry) => (
                <SocialUserRow
                  key={entry.userId}
                  entry={entry}
                  onRelationshipAction={handleRelationshipAction}
                  isActionPending={actionPending === entry.userId}
                  onProfileClick={onClose}
                />
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}