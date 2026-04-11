'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { Bird, BookOpen, Sparkles } from 'lucide-react';
import { useAccountState } from '@/components/account/AccountStateProvider';
import BirdCard from '@/components/journal/BirdCard';
import JournalControls, { type JournalFilter, type JournalSort } from '@/components/journal/JournalControls';
import { flushQueuedProgressEventsForSignedInUser } from '@/lib/auth/account-session';
import { track } from '@/lib/analytics';
import { useBirdJournal } from '@/hooks/useBirdJournal';
import { usePageProgressSync } from '@/hooks/usePageProgressSync';
import { useScreenViewed } from '@/hooks/useScreenViewed';
import { useStoredJson } from '@/hooks/useStoredValue';
import { REVEAL_BIRD_COST } from '@/lib/constants/hints';
import { queueProgressEvent } from '@/lib/progress/progress-event-outbox';
import { getTodayMissionDate } from '@/lib/utils/daily-mission-date';
import {
  CURRENT_ROUND_JOURNAL_BIRD_KEY,
  CURRENT_ROUND_JOURNAL_REVEAL_KEY,
  isJournalEntryMaskedForCurrentRound,
  writeCurrentRoundJournalRevealKey,
} from '@/lib/utils/bird-journal';
import { applyJournalClassificationViewToSessionMissions, buildMissionRewardGrantEvents } from '@/lib/utils/missions';
import { defaultBirdScore, normalizeBirdScore } from '@/lib/utils/player-progress';
import { spendSeeds } from '@/lib/utils/seed-spend';

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
  return hash ? decodeURIComponent(hash) : null;
}

export default function JournalPage() {
  const { isPageBackgroundRefreshing } = usePageProgressSync();
  useScreenViewed('journal');
  const { isSignedIn } = useAccountState();
  const [filter, setFilter] = useState<JournalFilter>('all');
  const [sort, setSort] = useState<JournalSort>('recent');
  const linkedBirdKey = useSyncExternalStore(subscribeToHashChanges, getLinkedBirdKeySnapshot, () => null);
  const {
    journal,
    uniqueBirdCount,
    realBirdCount,
    fakeBirdCount,
    accuracy,
  } = useBirdJournal();
  const storedScore = useStoredJson<typeof defaultBirdScore | null>('birdScore', defaultBirdScore);
  const currentRoundBirdKey = useStoredJson<string | null>(CURRENT_ROUND_JOURNAL_BIRD_KEY, null);
  const currentRoundRevealKey = useStoredJson<string | null>(CURRENT_ROUND_JOURNAL_REVEAL_KEY, null);
  const score = normalizeBirdScore(storedScore);

  const handleRevealForCurrentRound = (birdKey: string) => {
    if (birdKey !== currentRoundBirdKey || score.seeds < REVEAL_BIRD_COST || !spendSeeds(REVEAL_BIRD_COST)) {
      return;
    }

    writeCurrentRoundJournalRevealKey(birdKey);
  };

  const handleOpenDetails = (birdKey: string) => {
    const entry = journal.find((journalEntry) => journalEntry.birdKey === birdKey);
    if (!entry?.metadata.sciName) {
      return;
    }

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

    void flushQueuedProgressEventsForSignedInUser();
  };

  const filteredJournal = useMemo(() => {
    const nextJournal = journal.filter((entry) => {
      const isMasked = isJournalEntryMaskedForCurrentRound({
        entry,
        currentRoundBirdKey,
        currentRoundRevealKey,
      });

      if (filter === 'real') {
        return !isMasked && entry.isReal;
      }

      if (filter === 'fake') {
        return !isMasked && !entry.isReal;
      }

      return true;
    });

    return nextJournal.sort((left, right) => {
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
  }, [currentRoundBirdKey, currentRoundRevealKey, filter, journal, sort]);

  useEffect(() => {
    if (!linkedBirdKey) {
      return;
    }

    const target = document.getElementById(linkedBirdKey);
    if (!target) {
      return;
    }

    window.requestAnimationFrame(() => {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, [filteredJournal, linkedBirdKey]);

  const refreshBadge = isPageBackgroundRefreshing ? (
    <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-[var(--color-surface-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-medium text-[var(--color-muted)]">
      <Bird size={14} className="text-[var(--color-secondary)]" />
      Updating your field notes...
    </div>
  ) : null;

  if (journal.length === 0) {
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
          <p className="mt-2 font-[family-name:var(--font-display)] text-3xl font-bold text-[var(--color-text)]">{uniqueBirdCount}</p>
        </div>
        <div className="rounded-2xl border border-[var(--color-surface-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-card)]">
          <p className="text-[0.65rem] uppercase tracking-[0.14em] text-[var(--color-muted)]">Real Birds</p>
          <p className="mt-2 font-[family-name:var(--font-display)] text-3xl font-bold text-[var(--color-text)]">{realBirdCount}</p>
        </div>
        <div className="rounded-2xl border border-[var(--color-surface-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-card)]">
          <p className="text-[0.65rem] uppercase tracking-[0.14em] text-[var(--color-muted)]">Fake Birds</p>
          <p className="mt-2 font-[family-name:var(--font-display)] text-3xl font-bold text-[var(--color-text)]">{fakeBirdCount}</p>
        </div>
        <div className="rounded-2xl border border-[var(--color-surface-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-card)]">
          <p className="text-[0.65rem] uppercase tracking-[0.14em] text-[var(--color-muted)]">Overall Accuracy</p>
          <p className="mt-2 font-[family-name:var(--font-display)] text-3xl font-bold text-[var(--color-text)]">{accuracy}%</p>
        </div>
      </section>

      <JournalControls
        filter={filter}
        sort={sort}
        onFilterChange={setFilter}
        onSortChange={setSort}
      />

      <section className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filteredJournal.map((entry) => (
          <BirdCard
            key={entry.birdKey}
            entry={entry}
            isLinkedTarget={entry.birdKey === linkedBirdKey}
            isMaskedForCurrentRound={isJournalEntryMaskedForCurrentRound({
              entry,
              currentRoundBirdKey,
              currentRoundRevealKey,
            })}
            canAffordReveal={score.seeds >= REVEAL_BIRD_COST}
            onRevealForCurrentRound={handleRevealForCurrentRound}
            onOpenDetails={handleOpenDetails}
          />
        ))}
      </section>
    </div>
  );
}
