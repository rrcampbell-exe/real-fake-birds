'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { BookOpen, Sparkles } from 'lucide-react';
import BirdCard from '@/components/journal/BirdCard';
import JournalControls, { type JournalFilter, type JournalSort } from '@/components/journal/JournalControls';
import { useBirdJournal } from '@/hooks/useBirdJournal';
import { useStoredJson } from '@/hooks/useStoredValue';
import { REVEAL_BIRD_COST } from '@/lib/constants/hints';
import {
  CURRENT_ROUND_JOURNAL_BIRD_KEY,
  CURRENT_ROUND_JOURNAL_REVEAL_KEY,
  isJournalEntryMaskedForCurrentRound,
  writeCurrentRoundJournalRevealKey,
} from '@/lib/utils/bird-journal';
import { defaultBirdScore, normalizeBirdScore } from '@/lib/utils/player-progress';
import { spendSeeds } from '@/lib/utils/seed-spend';

export default function JournalPage() {
  const [filter, setFilter] = useState<JournalFilter>('all');
  const [sort, setSort] = useState<JournalSort>('recent');
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

  if (journal.length === 0) {
    return (
      <div className="mx-auto flex w-full max-w-lg flex-col gap-6 px-4 py-8">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold">Field Journal</h1>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            A running field guide of every bird you&apos;ve met so far.
          </p>
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

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filteredJournal.map((entry) => (
          <BirdCard
            key={entry.birdKey}
            entry={entry}
            isMaskedForCurrentRound={isJournalEntryMaskedForCurrentRound({
              entry,
              currentRoundBirdKey,
              currentRoundRevealKey,
            })}
            canAffordReveal={score.seeds >= REVEAL_BIRD_COST}
            onRevealForCurrentRound={handleRevealForCurrentRound}
          />
        ))}
      </section>
    </div>
  );
}
