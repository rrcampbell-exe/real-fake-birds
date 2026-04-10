import { notifyStoredValueChanged } from '@/hooks/useStoredValue';
import type { BirdJournalEntry, BirdJournalMetadata, BirdJournalStore } from '@/types';

export const BIRD_JOURNAL_STORAGE_KEY = 'birdJournal';
export const BIRD_JOURNAL_DIRTY_KEYS_STORAGE_KEY = 'birdJournalDirtyKeys';
export const CURRENT_ROUND_JOURNAL_BIRD_KEY = 'currentRoundJournalBirdKey';
export const CURRENT_ROUND_JOURNAL_REVEAL_KEY = 'currentRoundJournalRevealKey';

const defaultBirdJournal: BirdJournalStore = {};

function isFiniteCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function normalizeMetadata(metadata: BirdJournalMetadata | null | undefined): BirdJournalMetadata {
  if (!metadata) {
    return {};
  }

  return {
    regionLabel: typeof metadata.regionLabel === 'string' ? metadata.regionLabel : undefined,
    sciName: typeof metadata.sciName === 'string' ? metadata.sciName : undefined,
    fact: typeof metadata.fact === 'string' ? metadata.fact : undefined,
    summary: typeof metadata.summary === 'string' ? metadata.summary : undefined,
    url: typeof metadata.url === 'string' ? metadata.url : undefined,
    articleUrl: typeof metadata.articleUrl === 'string' ? metadata.articleUrl : undefined,
    imageUrl: typeof metadata.imageUrl === 'string' ? metadata.imageUrl : undefined,
    description: typeof metadata.description === 'string' ? metadata.description : undefined,
    classificationRevealed: typeof metadata.classificationRevealed === 'boolean'
      ? metadata.classificationRevealed
      : undefined,
  };
}

function normalizeBirdJournalEntry(entry: Partial<BirdJournalEntry> | null | undefined): BirdJournalEntry | null {
  if (!entry || typeof entry.birdKey !== 'string' || typeof entry.birdName !== 'string' || typeof entry.isReal !== 'boolean') {
    return null;
  }

  return {
    birdKey: entry.birdKey,
    birdName: entry.birdName,
    isReal: entry.isReal,
    seenCount: isFiniteCount(entry.seenCount) ? Math.floor(entry.seenCount) : 0,
    correctCount: isFiniteCount(entry.correctCount) ? Math.floor(entry.correctCount) : 0,
    incorrectCount: isFiniteCount(entry.incorrectCount) ? Math.floor(entry.incorrectCount) : 0,
    lastSeenAt: typeof entry.lastSeenAt === 'string' ? entry.lastSeenAt : new Date(0).toISOString(),
    metadata: normalizeMetadata(entry.metadata),
  };
}

export function deriveBirdKey(birdName: string, isReal: boolean): string {
  const normalizedName = birdName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

  return `${isReal ? 'real' : 'fake'}:${normalizedName || 'unknown-bird'}`;
}

export function normalizeBirdJournalStore(storeLike: unknown): BirdJournalStore {
  if (!storeLike || typeof storeLike !== 'object') {
    return defaultBirdJournal;
  }

  return Object.fromEntries(
    Object.entries(storeLike)
      .map(([key, value]) => {
        const entry = normalizeBirdJournalEntry(value as Partial<BirdJournalEntry>);
        return entry ? [key, entry] : null;
      })
      .filter((entry): entry is [string, BirdJournalEntry] => Boolean(entry))
  );
}

export function readBirdJournal(): BirdJournalStore {
  if (typeof window === 'undefined') {
    return defaultBirdJournal;
  }

  const raw = localStorage.getItem(BIRD_JOURNAL_STORAGE_KEY);
  if (!raw) {
    return defaultBirdJournal;
  }

  try {
    return normalizeBirdJournalStore(JSON.parse(raw) as unknown);
  } catch {
    return defaultBirdJournal;
  }
}

export function writeBirdJournal(journalLike: BirdJournalStore, notify = true): BirdJournalStore {
  const journal = normalizeBirdJournalStore(journalLike);
  localStorage.setItem(BIRD_JOURNAL_STORAGE_KEY, JSON.stringify(journal));

  if (notify) {
    notifyStoredValueChanged(BIRD_JOURNAL_STORAGE_KEY);
  }

  return journal;
}

function readStoredStringValue(key: string): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = localStorage.getItem(key);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    return typeof parsed === 'string' ? parsed : null;
  } catch {
    return null;
  }
}

function readStoredStringArrayValue(key: string): string[] {
  if (typeof window === 'undefined') {
    return [];
  }

  const raw = localStorage.getItem(key);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((value): value is string => typeof value === 'string')
      : [];
  } catch {
    return [];
  }
}

function writeStoredStringArrayValue(key: string, values: string[], notify = true): string[] {
  const nextValues = Array.from(
    new Set(values.filter((value): value is string => typeof value === 'string' && value.length > 0))
  );

  if (typeof window === 'undefined') {
    return nextValues;
  }

  if (nextValues.length === 0) {
    localStorage.removeItem(key);
  } else {
    localStorage.setItem(key, JSON.stringify(nextValues));
  }

  if (notify) {
    notifyStoredValueChanged(key);
  }

  return nextValues;
}

function writeStoredStringValue(key: string, value: string | null): void {
  if (typeof window === 'undefined') {
    return;
  }

  if (value === null) {
    localStorage.removeItem(key);
  } else {
    localStorage.setItem(key, JSON.stringify(value));
  }

  notifyStoredValueChanged(key);
}

export function readCurrentRoundJournalBirdKey(): string | null {
  return readStoredStringValue(CURRENT_ROUND_JOURNAL_BIRD_KEY);
}

export function writeCurrentRoundJournalBirdKey(birdKey: string | null): void {
  writeStoredStringValue(CURRENT_ROUND_JOURNAL_BIRD_KEY, birdKey);
}

export function readCurrentRoundJournalRevealKey(): string | null {
  return readStoredStringValue(CURRENT_ROUND_JOURNAL_REVEAL_KEY);
}

export function writeCurrentRoundJournalRevealKey(birdKey: string | null): void {
  writeStoredStringValue(CURRENT_ROUND_JOURNAL_REVEAL_KEY, birdKey);
}

export function readDirtyBirdJournalKeys(): string[] {
  return readStoredStringArrayValue(BIRD_JOURNAL_DIRTY_KEYS_STORAGE_KEY);
}

export function markDirtyBirdJournalKeys(birdKeys: string[]): string[] {
  return writeStoredStringArrayValue(
    BIRD_JOURNAL_DIRTY_KEYS_STORAGE_KEY,
    [...readDirtyBirdJournalKeys(), ...birdKeys]
  );
}

export function clearDirtyBirdJournalKeys(birdKeys?: string[]): string[] {
  if (!birdKeys) {
    return writeStoredStringArrayValue(BIRD_JOURNAL_DIRTY_KEYS_STORAGE_KEY, []);
  }

  const removedKeys = new Set(birdKeys);
  return writeStoredStringArrayValue(
    BIRD_JOURNAL_DIRTY_KEYS_STORAGE_KEY,
    readDirtyBirdJournalKeys().filter((birdKey) => !removedKeys.has(birdKey))
  );
}

export function getDirtyBirdJournalEntries(): BirdJournalEntry[] {
  const journal = readBirdJournal();
  return readDirtyBirdJournalKeys()
    .map((birdKey) => journal[birdKey])
    .filter((entry): entry is BirdJournalEntry => Boolean(entry));
}

export function isJournalEntryMaskedForCurrentRound(options: {
  entry: Pick<BirdJournalEntry, 'birdKey'>;
  currentRoundBirdKey: string | null;
  currentRoundRevealKey: string | null;
}): boolean {
  return options.entry.birdKey === options.currentRoundBirdKey
    && options.currentRoundRevealKey !== options.currentRoundBirdKey;
}

export function isBirdClassificationRevealed(entry: Pick<BirdJournalEntry, 'metadata'> | null | undefined): boolean {
  return Boolean(entry?.metadata.classificationRevealed);
}

export function recordBirdEncounter(options: {
  birdName: string;
  isReal: boolean;
  outcome: 'correct' | 'incorrect' | 'seen';
  metadata?: BirdJournalMetadata;
}): BirdJournalEntry {
  const journal = readBirdJournal();
  const birdKey = deriveBirdKey(options.birdName, options.isReal);
  const existingEntry = journal[birdKey];
  const nextEntry: BirdJournalEntry = {
    birdKey,
    birdName: options.birdName,
    isReal: options.isReal,
    seenCount: (existingEntry?.seenCount ?? 0) + 1,
    correctCount: (existingEntry?.correctCount ?? 0) + (options.outcome === 'correct' ? 1 : 0),
    incorrectCount: (existingEntry?.incorrectCount ?? 0) + (options.outcome === 'incorrect' ? 1 : 0),
    lastSeenAt: new Date().toISOString(),
    metadata: normalizeMetadata({
      ...existingEntry?.metadata,
      classificationRevealed: isBirdClassificationRevealed(existingEntry),
      ...options.metadata,
    }),
  };

  writeBirdJournal({
    ...journal,
    [birdKey]: nextEntry,
  });
  markDirtyBirdJournalKeys([birdKey]);

  return nextEntry;
}

export function revealBirdClassification(birdKey: string): BirdJournalEntry | null {
  const journal = readBirdJournal();
  const entry = journal[birdKey];

  if (!entry) {
    return null;
  }

  const nextEntry: BirdJournalEntry = {
    ...entry,
    metadata: normalizeMetadata({
      ...entry.metadata,
      classificationRevealed: true,
    }),
  };

  writeBirdJournal({
    ...journal,
    [birdKey]: nextEntry,
  });
  markDirtyBirdJournalKeys([birdKey]);

  return nextEntry;
}

export function mergeBirdJournalStores(localJournal: BirdJournalStore, remoteJournal: BirdJournalStore): BirdJournalStore {
  const merged = normalizeBirdJournalStore(localJournal);

  for (const [birdKey, remoteEntry] of Object.entries(normalizeBirdJournalStore(remoteJournal))) {
    const localEntry = merged[birdKey];
    const useLocalMetadata = Boolean(localEntry?.lastSeenAt && localEntry.lastSeenAt > remoteEntry.lastSeenAt);
    merged[birdKey] = {
      birdKey,
      birdName: remoteEntry.birdName,
      isReal: remoteEntry.isReal,
      seenCount: Math.max(localEntry?.seenCount ?? 0, remoteEntry.seenCount),
      correctCount: Math.max(localEntry?.correctCount ?? 0, remoteEntry.correctCount),
      incorrectCount: Math.max(localEntry?.incorrectCount ?? 0, remoteEntry.incorrectCount),
      lastSeenAt: (localEntry?.lastSeenAt ?? '') > remoteEntry.lastSeenAt
        ? localEntry?.lastSeenAt ?? remoteEntry.lastSeenAt
        : remoteEntry.lastSeenAt,
      metadata: normalizeMetadata({
        ...(useLocalMetadata ? localEntry?.metadata : remoteEntry.metadata),
        classificationRevealed: isBirdClassificationRevealed(localEntry) || isBirdClassificationRevealed(remoteEntry),
      }),
    };
  }

  return merged;
}
