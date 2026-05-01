'use client';

import { useMemo } from 'react';
import { useStoredJson } from '@/hooks/useStoredValue';
import { BIRD_JOURNAL_STORAGE_KEY, normalizeBirdJournalStore } from '@/lib/utils/bird-journal';
import { JOURNAL_SUMMARY_STORAGE_KEY } from '@/lib/auth/account-sync-local';
import type { BirdJournalEntry, BirdJournalStore } from '@/types';

interface ServerJournalSummary {
  uniqueBirdCount: number;
  realBirdCount: number;
  fakeBirdCount: number;
  totalSeen: number;
  totalCorrect: number;
}

export function useBirdJournal() {
  const journalStore = useStoredJson<BirdJournalStore>(BIRD_JOURNAL_STORAGE_KEY, {});
  const serverSummary = useStoredJson<ServerJournalSummary | null>(JOURNAL_SUMMARY_STORAGE_KEY, null);

  const journal = useMemo(
    () => Object.values(normalizeBirdJournalStore(journalStore)),
    [journalStore]
  );

  const summary = useMemo(() => {
    // Use server-authoritative counts when available; they cover the full
    // history even when the local cache has been pruned to stay under 2 MB.
    if (serverSummary) {
      const { uniqueBirdCount, realBirdCount, fakeBirdCount, totalSeen, totalCorrect } = serverSummary;
      return {
        uniqueBirdCount,
        realBirdCount,
        fakeBirdCount,
        totalSeen,
        totalCorrect,
        accuracy: totalSeen > 0 ? Math.floor((totalCorrect / totalSeen) * 100) : 0,
      };
    }

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
  }, [journal, serverSummary]);

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
