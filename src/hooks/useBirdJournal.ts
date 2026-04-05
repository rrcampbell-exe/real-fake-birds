'use client';

import { useMemo } from 'react';
import { useStoredJson } from '@/hooks/useStoredValue';
import { BIRD_JOURNAL_STORAGE_KEY, normalizeBirdJournalStore } from '@/lib/utils/bird-journal';
import type { BirdJournalEntry, BirdJournalStore } from '@/types';

export function useBirdJournal() {
  const journalStore = useStoredJson<BirdJournalStore>(BIRD_JOURNAL_STORAGE_KEY, {});

  const journal = useMemo(
    () => Object.values(normalizeBirdJournalStore(journalStore)),
    [journalStore]
  );

  const summary = useMemo(() => {
    const realBirdCount = journal.filter((entry) => entry.isReal).length;
    const fakeBirdCount = journal.length - realBirdCount;
    const totalSeen = journal.reduce((sum, entry) => sum + entry.seenCount, 0);
    const totalCorrect = journal.reduce((sum, entry) => sum + entry.correctCount, 0);

    return {
      uniqueBirdCount: journal.length,
      realBirdCount,
      fakeBirdCount,
      totalSeen,
      totalCorrect,
      accuracy: totalSeen > 0 ? Math.floor((totalCorrect / totalSeen) * 100) : 0,
    };
  }, [journal]);

  const journalByKey = useMemo(
    () => normalizeBirdJournalStore(journalStore),
    [journalStore]
  );

  const getEntry = (birdKey: string): BirdJournalEntry | null => journalByKey[birdKey] ?? null;

  return {
    journal,
    journalByKey,
    getEntry,
    ...summary,
  };
}
