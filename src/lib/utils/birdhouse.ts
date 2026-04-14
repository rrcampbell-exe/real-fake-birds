import { notifyStoredValueChanged } from '@/hooks/useStoredValue';
import type { BirdhouseStore } from '@/types';

export const BIRDHOUSE_STORAGE_KEY = 'birdhouse';
export const BIRDHOUSE_LAST_VISITED_AT_STORAGE_KEY = 'birdhouseLastVisitedAt';
export const BIRDHOUSE_REAL_CAP = 10;
export const BIRDHOUSE_FAKE_CAP = 10;

export const defaultBirdhouseStore: BirdhouseStore = {
  real: [],
  fake: [],
  updatedAt: new Date(0).toISOString(),
};

function normalizeBirdhouseKeys(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(value.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0))
  );
}

export function normalizeBirdhouseStore(storeLike: unknown): BirdhouseStore {
  if (!storeLike || typeof storeLike !== 'object') {
    return defaultBirdhouseStore;
  }

  const candidate = storeLike as Partial<BirdhouseStore>;
  return {
    real: normalizeBirdhouseKeys(candidate.real),
    fake: normalizeBirdhouseKeys(candidate.fake),
    updatedAt: normalizeUpdatedAt(candidate.updatedAt),
  };
}

function normalizeUpdatedAt(value: unknown): string {
  if (typeof value !== 'string') {
    return new Date(0).toISOString();
  }
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? new Date(0).toISOString() : new Date(parsed).toISOString();
}

export function readBirdhouse(): BirdhouseStore {
  if (typeof window === 'undefined') {
    return defaultBirdhouseStore;
  }

  const raw = localStorage.getItem(BIRDHOUSE_STORAGE_KEY);
  if (!raw) {
    return defaultBirdhouseStore;
  }

  try {
    return normalizeBirdhouseStore(JSON.parse(raw) as unknown);
  } catch {
    return defaultBirdhouseStore;
  }
}

export function writeBirdhouse(storeLike: BirdhouseStore, notify = true): BirdhouseStore {
  const store = normalizeBirdhouseStore(storeLike);

  if (typeof window !== 'undefined') {
    localStorage.setItem(BIRDHOUSE_STORAGE_KEY, JSON.stringify(store));
    if (notify) {
      notifyStoredValueChanged(BIRDHOUSE_STORAGE_KEY);
    }
  }

  return store;
}

export function isBirdInBirdhouse(store: BirdhouseStore, birdKey: string): boolean {
  return store.real.includes(birdKey) || store.fake.includes(birdKey);
}

export function addToBirdhouse(birdKey: string, isReal: boolean): BirdhouseStore | null {
  const store = readBirdhouse();
  const collectionKey = isReal ? 'real' : 'fake';
  const cap = isReal ? BIRDHOUSE_REAL_CAP : BIRDHOUSE_FAKE_CAP;
  const collection = store[collectionKey];

  if (collection.includes(birdKey)) {
    return store;
  }

  if (collection.length >= cap) {
    return null;
  }

  return writeBirdhouse({
    ...store,
    [collectionKey]: [...collection, birdKey],
    updatedAt: new Date().toISOString(),
  });
}

export function removeFromBirdhouse(birdKey: string, isReal: boolean): BirdhouseStore {
  const store = readBirdhouse();
  const collectionKey = isReal ? 'real' : 'fake';

  return writeBirdhouse({
    ...store,
    [collectionKey]: store[collectionKey].filter((entryKey) => entryKey !== birdKey),
    updatedAt: new Date().toISOString(),
  });
}

export function swapBirdhouseEntry(options: {
  incomingBirdKey: string;
  outgoingBirdKey: string;
  isReal: boolean;
}): BirdhouseStore {
  const store = readBirdhouse();
  const collectionKey = options.isReal ? 'real' : 'fake';

  return writeBirdhouse({
    ...store,
    [collectionKey]: store[collectionKey].map((birdKey) => (
      birdKey === options.outgoingBirdKey ? options.incomingBirdKey : birdKey
    )),
    updatedAt: new Date().toISOString(),
  });
}

export function readBirdhouseLastVisitedAt(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = localStorage.getItem(BIRDHOUSE_LAST_VISITED_AT_STORAGE_KEY);
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

export function writeBirdhouseLastVisitedAt(value: string | null): void {
  if (typeof window === 'undefined') {
    return;
  }

  if (value === null) {
    localStorage.removeItem(BIRDHOUSE_LAST_VISITED_AT_STORAGE_KEY);
  } else {
    localStorage.setItem(BIRDHOUSE_LAST_VISITED_AT_STORAGE_KEY, JSON.stringify(value));
  }

  notifyStoredValueChanged(BIRDHOUSE_LAST_VISITED_AT_STORAGE_KEY);
}