'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bird, Birdhouse, BookOpen, Sparkles } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useAccountState } from '@/components/account/AccountStateProvider';
import BirdhouseSwapSheet from '@/components/birdhouse/BirdhouseSwapSheet';
import BirdCard from '@/components/journal/BirdCard';
import JournalControls, { type JournalFilter, type JournalSort } from '@/components/journal/JournalControls';
import { flushQueuedProgressEventsForSignedInUser } from '@/lib/auth/account-session';
import { track, trackClientError, trackFirstPurchase } from '@/lib/analytics';
import { useBirdhouse } from '@/hooks/useBirdhouse';
import { useBirdJournal } from '@/hooks/useBirdJournal';
import { usePageProgressSync } from '@/hooks/usePageProgressSync';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { useScreenViewed } from '@/hooks/useScreenViewed';
import { useStoredJson } from '@/hooks/useStoredValue';
import type { BirdJournalEntry } from '@/types';
import { JOURNAL_FAKE_REVEAL_COST } from '@/lib/constants/hints';
import { queueProgressEvent } from '@/lib/progress/progress-event-outbox';
import { getTodayMissionDate } from '@/lib/utils/daily-mission-date';
import {
  isBirdImageRevealed,
  readPendingJournalTargetKey,
  revealBirdImage,
  writePendingJournalTargetKey,
} from '@/lib/utils/bird-journal';
import { applyJournalClassificationViewToSessionMissions, buildMissionRewardGrantEvents } from '@/lib/utils/missions';
import { canLoadImage } from '@/lib/utils/image-availability';
import { defaultBirdScore, normalizeBirdScore } from '@/lib/utils/player-progress';
import { spendSeeds } from '@/lib/utils/seed-spend';
import { formatNumber } from '@/lib/utils/number-format';

type JournalToast = { id: number; title: string; detail: string };

const TOAST_LIFETIME_MS = 4500;
const TOAST_GAP_MS = 300;

function subscribeToHashChanges(onStoreChange: () => void) {
  if (typeof window === 'undefined') {
    return () => {};
  }

  window.addEventListener('hashchange', onStoreChange);
  window.addEventListener('popstate', onStoreChange);

  return () => {
    window.removeEventListener('hashchange', onStoreChange);
    window.removeEventListener('popstate', onStoreChange);
  };
}

function getLinkedBirdKeySnapshot() {
  if (typeof window === 'undefined') {
    return null;
  }

  const hash = window.location.hash.slice(1);
  if (!hash) {
    return null;
  }

  try {
    return decodeURIComponent(hash);
  } catch {
    return hash;
  }
}

function readAndConsumeLinkedBirdQueryParamSnapshot() {
  if (typeof window === 'undefined') {
    return null;
  }

  const url = new URL(window.location.href);
  const bird = url.searchParams.get('bird');
  if (!bird) {
    return null;
  }

  url.searchParams.delete('bird');
  window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);

  return bird;
}

export default function JournalPage() {
  const pathname = usePathname();
  const { isPageBackgroundRefreshing } = usePageProgressSync();
  useScreenViewed('journal');
  const prefersReducedMotion = usePrefersReducedMotion();
  const linkedBirdScrollBehavior: ScrollBehavior = prefersReducedMotion ? 'auto' : 'smooth';
  const { isSignedIn } = useAccountState();
  const [filter, setFilter] = useState<JournalFilter>('all');
  const [sort, setSort] = useState<JournalSort>('recent');
  const [journalToastBatch, setJournalToastBatch] = useState<{ id: number; toasts: JournalToast[] } | null>(null);
  const [journalToastIndex, setJournalToastIndex] = useState(0);
  const [expiredJournalToastBatchId, setExpiredJournalToastBatchId] = useState<number | null>(null);
  const [linkedBirdKey, setLinkedBirdKey] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [serverSearchResults, setServerSearchResults] = useState<typeof journal | null>(null);
  const [completedServerSearchQuery, setCompletedServerSearchQuery] = useState('');
  const [serverBrowseEntries, setServerBrowseEntries] = useState<BirdJournalEntry[]>([]);
  const [browseCursor, setBrowseCursor] = useState<string | null | undefined>(undefined);
  const [isBrowseLoading, setIsBrowseLoading] = useState(false);
  const [displayLimit, setDisplayLimit] = useState(30);
  const [birdhouseSwapTarget, setBirdhouseSwapTarget] = useState<{ birdKey: string; birdName: string; isReal: boolean } | null>(null);
  const {
    journal,
    uniqueBirdCount,
    realBirdCount,
    fakeBirdCount,
    accuracy,
  } = useBirdJournal();
  const { isInBirdhouse } = useBirdhouse();
  const storedScore = useStoredJson<typeof defaultBirdScore | null>('birdScore', defaultBirdScore);
  const score = normalizeBirdScore(storedScore);
  const trimmedDebouncedSearchQuery = debouncedSearchQuery.trim();
  const isServerSearchActive = isSignedIn && trimmedDebouncedSearchQuery.length > 0;
  const isServerSearching = isServerSearchActive && completedServerSearchQuery !== trimmedDebouncedSearchQuery;
  const activeServerSearchResults = isServerSearchActive && completedServerSearchQuery === trimmedDebouncedSearchQuery
    ? serverSearchResults
    : null;

  const showJournalToast = (title: string, detail: string) => {
    setJournalToastBatch({
      id: Date.now(),
      toasts: [{ id: 0, title, detail }],
    });
  };

  const handleRevealFakeImage = async (birdKey: string) => {
    const entry = journal.find((journalEntry) => journalEntry.birdKey === birdKey);
    const revealImageUrl = entry?.metadata.imageUrl ?? entry?.metadata.imageThumbUrl ?? '';

    if (!entry || entry.isReal || isBirdImageRevealed(entry) || score.seeds < JOURNAL_FAKE_REVEAL_COST) {
      return;
    }

    if (!revealImageUrl || !(await canLoadImage(revealImageUrl))) {
      showJournalToast('Photo unavailable', 'That fake photo is unavailable right now, so no seeds were spent.');
      return;
    }

    if (!spendSeeds(JOURNAL_FAKE_REVEAL_COST)) {
      return;
    }

    revealBirdImage(birdKey);
    track('fake_bird_image_revealed', {
      bird_key: birdKey,
      cost: JOURNAL_FAKE_REVEAL_COST,
      seeds_balance_after: score.seeds - JOURNAL_FAKE_REVEAL_COST,
      source: 'journal',
    });
    trackFirstPurchase('fake_reveal');
  };

  const handleOpenDetails = (birdKey: string) => {
    const entry = journal.find((journalEntry) => journalEntry.birdKey === birdKey);
    if (!entry?.metadata.sciName) {
      return;
    }

    const interactionSource = linkedBirdKey === birdKey ? 'linked-target' : 'journal-details';

    try {
      track('journal_bird_viewed', { bird_key: birdKey });

      const missionDate = getTodayMissionDate();
      const missionUpdate = applyJournalClassificationViewToSessionMissions(missionDate);

      if (missionUpdate.missionRewards.length > 0 || missionUpdate.missionSetBonusSeedsEarned > 0) {
        track('mission_reward_granted', {
          missions_granted: missionUpdate.missionRewards.length,
          reward_seeds: missionUpdate.totalRewardSeeds,
          all_missions_complete: missionUpdate.completedDailyMissionSet,
          bonus_seeds: missionUpdate.missionSetBonusSeedsEarned,
        });

        const newToasts: JournalToast[] = [];
        missionUpdate.missionRewards.forEach((reward, index) => {
          newToasts.push({
            id: index,
            title: 'Mission Complete!',
            detail: `${reward.toastDescription} You've earned an extra ${reward.rewardSeeds} seeds for your efforts!`,
          });
        });
        if (missionUpdate.completedDailyMissionSet) {
          newToasts.push({
            id: missionUpdate.missionRewards.length,
            title: 'Daily Streak Extended!',
            detail: missionUpdate.dailyMissionStreak
              ? `Your daily streak is now ${missionUpdate.dailyMissionStreak} day${missionUpdate.dailyMissionStreak > 1 ? 's' : ''}. Have +${missionUpdate.missionSetBonusSeedsEarned} bonus seeds as a treat.`
              : `+${missionUpdate.missionSetBonusSeedsEarned} bonus seeds.`,
          });
        }
        setJournalToastBatch({ id: Date.now(), toasts: newToasts });
      }

      if (!isSignedIn) {
        return;
      }

      buildMissionRewardGrantEvents(missionDate, {
        missionRewards: missionUpdate.missionRewards,
        missionSetBonusSeedsEarned: missionUpdate.missionSetBonusSeedsEarned,
      }).forEach((missionReward) => {
        queueProgressEvent({
          eventId: missionReward.eventId,
          eventType: 'mission-reward-granted',
          occurredAt: new Date().toISOString(),
          payload: {
            missionDate,
            missionId: missionReward.missionId,
            rewardSeeds: missionReward.rewardSeeds,
          },
        });
      });

      void flushQueuedProgressEventsForSignedInUser().catch((error) => {
        trackClientError('journal_progress_flush_failed', error, {
          bird_key: birdKey,
          interaction_source: interactionSource,
          screen: 'journal',
        });
      });
    } catch (error) {
      trackClientError('journal_open_details_failed', error, {
        bird_key: birdKey,
        interaction_source: interactionSource,
        is_signed_in: isSignedIn,
        screen: 'journal',
      });
      return;
    }
  };

  const effectiveJournal = useMemo<BirdJournalEntry[]>(() => {
    if (!isSignedIn || serverBrowseEntries.length === 0) {
      return journal;
    }
    // Merge local + server; server entries are authoritative for entries they contain
    const byKey = new Map<string, BirdJournalEntry>();
    for (const entry of journal) byKey.set(entry.birdKey, entry);
    for (const entry of serverBrowseEntries) byKey.set(entry.birdKey, entry);
    return Array.from(byKey.values());
  }, [isSignedIn, journal, serverBrowseEntries]);

  const filteredJournal = useMemo(() => {
    // When a server search is active, use those results directly (they cover full history)
    const sourceJournal = activeServerSearchResults ?? effectiveJournal;

    const nextJournal = activeServerSearchResults
      ? sourceJournal // server search already filtered by query and doesn't need local filter
      : sourceJournal.filter((entry) => {
          if (filter === 'real') {
            return entry.isReal;
          }

          if (filter === 'fake') {
            return !entry.isReal;
          }

          if (filter === 'birdhouse') {
            return isInBirdhouse(entry.birdKey);
          }

          return true;
        });

    const normalizedSearch = trimmedDebouncedSearchQuery.toLowerCase();
    const searchFilteredJournal = !activeServerSearchResults && normalizedSearch
      ? nextJournal.filter((entry) => {
        const haystack = [
          entry.birdName,
          entry.metadata.regionLabel,
          entry.metadata.sciName,
          entry.metadata.fact,
          entry.metadata.summary,
        ]
          .filter((value): value is string => Boolean(value))
          .join(' ')
          .toLowerCase();

        return haystack.includes(normalizedSearch);
      })
      : nextJournal;

    return searchFilteredJournal.sort((left, right) => {
      if (sort === 'name') {
        return left.birdName.localeCompare(right.birdName);
      }

      if (sort === 'seen') {
        return right.seenCount - left.seenCount || right.correctCount - left.correctCount;
      }

      if (sort === 'accuracy') {
        const leftAccuracy = left.seenCount > 0 ? left.correctCount / left.seenCount : 0;
        const rightAccuracy = right.seenCount > 0 ? right.correctCount / right.seenCount : 0;
        return rightAccuracy - leftAccuracy || right.seenCount - left.seenCount;
      }

      return right.lastSeenAt.localeCompare(left.lastSeenAt);
    });
  }, [activeServerSearchResults, effectiveJournal, filter, isInBirdhouse, sort, trimmedDebouncedSearchQuery]);

  const visibleJournal = useMemo(
    () => filteredJournal.slice(0, displayLimit),
    [filteredJournal, displayLimit]
  );

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [searchQuery]);

  // Reset display limit whenever the visible list changes shape
  useEffect(() => {
    setDisplayLimit(30);
  }, [filter, sort, debouncedSearchQuery]);

  // When the user is signed-in and types a query, search server-side to cover
  // full history (the local cache is capped at ~2 MB and may be pruned).
  useEffect(() => {
    if (!isServerSearchActive) {
      return;
    }

    let cancelled = false;

    fetch(`/api/journal?action=search&q=${encodeURIComponent(trimmedDebouncedSearchQuery)}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
      .then((data: { entries: typeof journal }) => {
        if (!cancelled) {
          setServerSearchResults(data.entries ?? []);
          setCompletedServerSearchQuery(trimmedDebouncedSearchQuery);
        }
      })
      .catch(() => {
        if (!cancelled) {
          // Fall back to local search silently
          setServerSearchResults(null);
          setCompletedServerSearchQuery(trimmedDebouncedSearchQuery);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isServerSearchActive, journal, trimmedDebouncedSearchQuery]);

  const handleLoadMore = () => {
    if (isBrowseLoading) return;

    // If there are more local/already-fetched entries to reveal, just expand the limit.
    if (displayLimit < filteredJournal.length) {
      setDisplayLimit((prev) => prev + 30);
      return;
    }

    // Local entries exhausted — fetch the next page from the server.
    if (!isSignedIn || browseCursor === null) return;

    const cursor = browseCursor; // undefined = first fetch, string = subsequent
    setIsBrowseLoading(true);
    const url = cursor
      ? `/api/journal?action=browse&cursor=${encodeURIComponent(cursor)}`
      : '/api/journal?action=browse';

    fetch(url)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { entries?: BirdJournalEntry[]; nextCursor?: string | null } | null) => {
        setServerBrowseEntries((prev) => [...prev, ...(data?.entries ?? [])]);
        setBrowseCursor(data?.nextCursor ?? null);
        setDisplayLimit((prev) => prev + 30);
        setIsBrowseLoading(false);
      })
      .catch(() => {
        setBrowseCursor(null);
        setIsBrowseLoading(false);
      });
  };

  const journalToastBatchId = journalToastBatch?.id ?? null;
  const journalToasts = useMemo(() => journalToastBatch?.toasts ?? [], [journalToastBatch]);
  const activeJournalToast = useMemo(() => {
    if (journalToastBatchId === null || expiredJournalToastBatchId === journalToastBatchId) {
      return null;
    }
    return journalToasts[journalToastIndex] ?? null;
  }, [expiredJournalToastBatchId, journalToastBatchId, journalToastIndex, journalToasts]);

  useEffect(() => {
    if (journalToastBatchId === null) {
      return;
    }
    const timerId = window.setTimeout(() => {
      setJournalToastIndex(0);
    }, 0);
    return () => {
      window.clearTimeout(timerId);
    };
  }, [journalToastBatchId]);

  useEffect(() => {
    if (journalToastBatchId === null || journalToasts.length === 0 || expiredJournalToastBatchId === journalToastBatchId) {
      return;
    }
    let gapTimerId: number | null = null;
    const timerId = window.setTimeout(() => {
      const nextIndex = journalToastIndex + 1;
      if (nextIndex < journalToasts.length) {
        gapTimerId = window.setTimeout(() => {
          setJournalToastIndex(nextIndex);
        }, TOAST_GAP_MS);
      } else {
        gapTimerId = window.setTimeout(() => {
          setExpiredJournalToastBatchId(journalToastBatchId);
        }, TOAST_GAP_MS);
      }
    }, TOAST_LIFETIME_MS);
    return () => {
      window.clearTimeout(timerId);
      if (gapTimerId !== null) {
        window.clearTimeout(gapTimerId);
      }
    };
  }, [expiredJournalToastBatchId, journalToastBatchId, journalToastIndex, journalToasts]);

  useEffect(() => {
    const updateLinkedBirdKey = () => {
      const searchParamBirdKey = readAndConsumeLinkedBirdQueryParamSnapshot();
      if (searchParamBirdKey) {
        setLinkedBirdKey(searchParamBirdKey);
        writePendingJournalTargetKey(null);
        return;
      }

      const pendingBirdKey = readPendingJournalTargetKey();
      if (pendingBirdKey) {
        setLinkedBirdKey(pendingBirdKey);
        writePendingJournalTargetKey(null);
        return;
      }

      setLinkedBirdKey(getLinkedBirdKeySnapshot());
    };

    updateLinkedBirdKey();

    return subscribeToHashChanges(updateLinkedBirdKey);
  }, [pathname]);

  useEffect(() => {
    if (!linkedBirdKey) {
      return;
    }

    const target = document.getElementById(linkedBirdKey);
    if (!target) {
      return;
    }

    let innerFrameId = 0;
    let clearLinkedBirdTimeoutId = 0;
    const frameId = window.requestAnimationFrame(() => {
      innerFrameId = window.requestAnimationFrame(() => {
        target.scrollIntoView({ behavior: linkedBirdScrollBehavior, block: 'start' });
        clearLinkedBirdTimeoutId = window.setTimeout(() => {
          setLinkedBirdKey(null);
        }, 300);
      });
    });

    return () => {
      window.cancelAnimationFrame(frameId);
      window.cancelAnimationFrame(innerFrameId);
      window.clearTimeout(clearLinkedBirdTimeoutId);
    };
  }, [filteredJournal, linkedBirdKey, linkedBirdScrollBehavior]);

  const refreshBadge = isPageBackgroundRefreshing ? (
    <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-[var(--color-surface-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-medium text-[var(--color-muted)]">
      <Bird size={14} className="text-[var(--color-secondary)]" />
      Updating your field notes...
    </div>
  ) : null;

  if (effectiveJournal.length === 0) {
    return (
      <div className="mx-auto flex w-full max-w-lg flex-col gap-6 px-4 py-8">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold">Field Journal</h1>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            A running field guide of every bird you&apos;ve met so far.
          </p>
          {refreshBadge}
        </div>

        <section className="rounded-3xl border border-[var(--color-surface-border)] bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_55%),var(--color-surface)] p-8 text-center shadow-[var(--shadow-card)]">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--color-surface-hover)] text-[var(--color-secondary)]">
            <BookOpen size={28} />
          </div>
          <h2 className="mt-5 font-[family-name:var(--font-display)] text-2xl font-bold text-[var(--color-text)]">
            Your field guide is empty
          </h2>
          <p className="mt-3 text-sm leading-6 text-[var(--color-muted)]">
            Play a few rounds and every bird you encounter will start building your collection.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-[var(--color-secondary)] px-4 py-2 text-sm font-semibold text-[var(--color-on-secondary)] transition hover:brightness-110"
          >
            <Sparkles size={16} />
            Start collecting
          </Link>
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8">
      <div className="max-w-2xl">
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold">Field Journal</h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Track every bird you&apos;ve seen, how often it fooled you, and which ones you&apos;ve mastered.
        </p>
        {refreshBadge}
      </div>

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <div className="rounded-2xl border border-[var(--color-surface-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-card)]">
          <p className="text-[0.65rem] uppercase tracking-[0.14em] text-[var(--color-muted)]">Unique Birds</p>
          <p className="mt-2 font-[family-name:var(--font-display)] text-3xl font-bold text-[var(--color-text)]">{formatNumber(uniqueBirdCount)}</p>
        </div>
        <div className="rounded-2xl border border-[var(--color-surface-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-card)]">
          <p className="text-[0.65rem] uppercase tracking-[0.14em] text-[var(--color-muted)]">Real Birds</p>
          <p className="mt-2 font-[family-name:var(--font-display)] text-3xl font-bold text-[var(--color-text)]">{formatNumber(realBirdCount)}</p>
        </div>
        <div className="rounded-2xl border border-[var(--color-surface-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-card)]">
          <p className="text-[0.65rem] uppercase tracking-[0.14em] text-[var(--color-muted)]">Fake Birds</p>
          <p className="mt-2 font-[family-name:var(--font-display)] text-3xl font-bold text-[var(--color-text)]">{formatNumber(fakeBirdCount)}</p>
        </div>
        <div className="rounded-2xl border border-[var(--color-surface-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-card)]">
          <p className="text-[0.65rem] uppercase tracking-[0.14em] text-[var(--color-muted)]">Overall Accuracy</p>
          <p className="mt-2 font-[family-name:var(--font-display)] text-3xl font-bold text-[var(--color-text)]">{accuracy}%</p>
        </div>
      </section>

      <JournalControls
        filter={filter}
        searchQuery={searchQuery}
        sort={sort}
        onFilterChange={setFilter}
        onSearchChange={setSearchQuery}
        onSortChange={setSort}
      />

      {isServerSearching ? (
        <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-surface-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-medium text-[var(--color-muted)]">
          <Bird size={14} className="text-[var(--color-secondary)]" />
          Searching your full history...
        </div>
      ) : null}

      {filteredJournal.length === 0 ? (
        <section className="rounded-3xl border border-[var(--color-surface-border)] bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_55%),var(--color-surface)] p-8 text-center shadow-[var(--shadow-card)]">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--color-surface-hover)] text-[var(--color-secondary)]">
            {filter === 'birdhouse' ? <Birdhouse size={28} /> : <BookOpen size={28} />}
          </div>
          <h2 className="mt-5 font-[family-name:var(--font-display)] text-2xl font-bold text-[var(--color-text)]">
            {searchQuery.trim()
              ? 'No birds match your search'
              : filter === 'birdhouse'
                ? 'Your Birdhouse is empty'
                : 'No birds match this filter'}
          </h2>
          <p className="mt-3 text-sm leading-6 text-[var(--color-muted)]">
            {searchQuery.trim()
              ? 'Try another bird name, place, or field note phrase.'
              : filter === 'birdhouse'
                ? 'Tap the birdhouse icon on any bird to add it to your curated collection.'
                : 'Try a different filter or search phrase.'}
          </p>
        </section>
      ) : null}

      <section className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
        {visibleJournal.map((entry) => (
          <BirdCard
            key={entry.birdKey}
            entry={entry}
            isLinkedTarget={entry.birdKey === linkedBirdKey}
            canAffordFakeImageReveal={score.seeds >= JOURNAL_FAKE_REVEAL_COST}
            onRevealFakeImage={handleRevealFakeImage}
            onOpenDetails={handleOpenDetails}
            onRequestBirdhouseSwap={setBirdhouseSwapTarget}
          />
        ))}
      </section>

      {!isServerSearchActive && (displayLimit < filteredJournal.length || (isSignedIn && browseCursor !== null) || isBrowseLoading) ? (
        <div className="flex justify-center py-2">
          <button
            type="button"
            onClick={handleLoadMore}
            disabled={isBrowseLoading}
            className="inline-flex items-center gap-2 rounded-full border border-[var(--color-surface-border)] bg-[var(--color-surface)] px-5 py-2.5 text-sm font-semibold text-[var(--color-text)] transition hover:bg-[var(--color-surface-hover)] disabled:opacity-50"
          >
            {isBrowseLoading ? (
              <>
                <Bird size={15} className="animate-pulse text-[var(--color-secondary)]" />
                Loading more birds...
              </>
            ) : (
              <>
                <BookOpen size={15} className="text-[var(--color-secondary)]" />
                Load more birds
              </>
            )}
          </button>
        </div>
      ) : null}

      <BirdhouseSwapSheet
        incomingBird={birdhouseSwapTarget}
        isOpen={birdhouseSwapTarget !== null}
        onClose={() => setBirdhouseSwapTarget(null)}
      />

      <div className="pointer-events-none fixed inset-x-0 top-20 z-40 flex justify-center px-4">
        <div className="flex w-full max-w-sm flex-col gap-2">
          <AnimatePresence>
            {activeJournalToast ? (
              <motion.div
                key={activeJournalToast.id}
                initial={{ opacity: 0, y: -12, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.98 }}
                transition={{ duration: prefersReducedMotion ? 0 : 0.24, ease: 'easeOut' }}
                className="rounded-2xl border border-[var(--color-surface-border)] bg-[color-mix(in_srgb,var(--color-surface)_92%,white_8%)] px-4 py-3 shadow-[var(--shadow-card)] backdrop-blur-sm"
                role="status"
                aria-live="polite"
              >
                <div className="min-w-0">
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-[var(--color-secondary)]">
                    {activeJournalToast.title}
                  </p>
                  <p className="mt-1 text-sm font-medium text-[var(--color-text)]">{activeJournalToast.detail}</p>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
