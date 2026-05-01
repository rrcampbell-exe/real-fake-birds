import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  BIRD_JOURNAL_MAX_SERIALIZED_BYTES,
  BIRD_JOURNAL_STORAGE_KEY,
  clearDirtyBirdJournalKeys,
  deriveBirdKey,
  getDirtyBirdJournalEntries,
  markDirtyBirdJournalKeys,
  mergeBirdJournalStores,
  normalizeBirdJournalStore,
  readBirdJournal,
  readCurrentRoundJournalBirdKey,
  readDirtyBirdJournalKeys,
  recordBirdEncounter,
  writeBirdJournal,
  writeCurrentRoundJournalBirdKey,
} from '@/lib/utils/bird-journal';

vi.mock('@/hooks/useStoredValue', () => ({
  notifyStoredValueChanged: vi.fn(),
}));

describe('bird-journal utilities', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('derives stable keys from bird names and realness', () => {
    expect(deriveBirdKey('Blue Jay', true)).toBe('real:blue-jay');
    expect(deriveBirdKey("Campbell's   Striped Robin", false)).toBe('fake:campbells-striped-robin');
  });

  it('derives unknown-bird key for empty name', () => {
    expect(deriveBirdKey('', true)).toBe('real:unknown-bird');
  });

  it('records new and repeated bird encounters', () => {
    const firstEntry = recordBirdEncounter({
      birdName: 'Blue Jay',
      isReal: true,
      outcome: 'correct',
      metadata: {
        regionLabel: 'North America',
      },
    });

    expect(firstEntry.seenCount).toBe(1);
    expect(firstEntry.correctCount).toBe(1);
    expect(firstEntry.incorrectCount).toBe(0);

    const secondEntry = recordBirdEncounter({
      birdName: 'Blue Jay',
      isReal: true,
      outcome: 'incorrect',
      metadata: {
        sciName: 'Cyanocitta cristata',
      },
    });

    expect(secondEntry.seenCount).toBe(2);
    expect(secondEntry.correctCount).toBe(1);
    expect(secondEntry.incorrectCount).toBe(1);
    expect(secondEntry.metadata.regionLabel).toBe('North America');
    expect(secondEntry.metadata.sciName).toBe('Cyanocitta cristata');
    expect(readBirdJournal()[secondEntry.birdKey]).toEqual(secondEntry);
  });

  it('records a seen outcome without changing correct or incorrect counts', () => {
    const entry = recordBirdEncounter({
      birdName: 'Crow',
      isReal: true,
      outcome: 'seen',
      metadata: {},
    });
    expect(entry.seenCount).toBe(1);
    expect(entry.correctCount).toBe(0);
    expect(entry.incorrectCount).toBe(0);
  });

  it('tracks dirty bird journal entries for incremental sync', () => {
    const entry = recordBirdEncounter({
      birdName: 'Blue Jay',
      isReal: true,
      outcome: 'correct',
      metadata: {},
    });

    expect(readDirtyBirdJournalKeys()).toEqual([entry.birdKey]);
    expect(getDirtyBirdJournalEntries()).toEqual([entry]);

    clearDirtyBirdJournalKeys([entry.birdKey]);

    expect(readDirtyBirdJournalKeys()).toEqual([]);
    expect(getDirtyBirdJournalEntries()).toEqual([]);
  });

  it('deduplicates dirty keys and clears the full dirty journal set', () => {
    markDirtyBirdJournalKeys(['real:blue-jay', 'real:blue-jay', 'fake:striped-robin']);

    expect(readDirtyBirdJournalKeys()).toEqual(['real:blue-jay', 'fake:striped-robin']);

    clearDirtyBirdJournalKeys();

    expect(readDirtyBirdJournalKeys()).toEqual([]);
  });

  it('handles getDirtyBirdJournalEntries with keys that no longer exist in journal', () => {
    markDirtyBirdJournalKeys(['real:deleted-bird']);
    expect(getDirtyBirdJournalEntries()).toEqual([]);
  });

  it('normalizes a non-object journal store to empty', () => {
    expect(normalizeBirdJournalStore(null)).toEqual({});
    expect(normalizeBirdJournalStore(undefined)).toEqual({});
    expect(normalizeBirdJournalStore('not-an-object')).toEqual({});
    expect(normalizeBirdJournalStore(42)).toEqual({});
  });

  it('normalizes entries with missing required fields', () => {
    const store = normalizeBirdJournalStore({
      'real:blue-jay': { birdKey: 'real:blue-jay', birdName: 'Blue Jay', isReal: true },
      'bad-entry': { birdKey: 'bad' },
      'null-entry': null,
    });
    expect(store['real:blue-jay']).toBeDefined();
    expect(store['bad-entry']).toBeUndefined();
    expect(store['null-entry']).toBeUndefined();
  });

  it('normalizes entries with non-finite counts to zero', () => {
    const store = normalizeBirdJournalStore({
      'real:jay': {
        birdKey: 'real:jay',
        birdName: 'Jay',
        isReal: true,
        seenCount: NaN,
        correctCount: Infinity,
        incorrectCount: -1,
      },
    });
    expect(store['real:jay']?.seenCount).toBe(0);
    expect(store['real:jay']?.correctCount).toBe(0);
    expect(store['real:jay']?.incorrectCount).toBe(0);
  });

  it('normalizes metadata with non-string values', () => {
    const store = normalizeBirdJournalStore({
      'real:jay': {
        birdKey: 'real:jay',
        birdName: 'Jay',
        isReal: true,
        metadata: {
          regionLabel: 123,
          sciName: true,
          fact: null,
          summary: undefined,
          url: 42,
          articleUrl: {},
          imageUrl: [],
          description: false,
          classificationRevealed: 'yes',
        },
      },
    });
    const meta = store['real:jay']?.metadata;
    expect(meta?.regionLabel).toBeUndefined();
    expect(meta?.sciName).toBeUndefined();
    expect(meta?.fact).toBeUndefined();
    expect(meta?.classificationRevealed).toBeUndefined();
  });

  it('normalizes null metadata to empty object', () => {
    const store = normalizeBirdJournalStore({
      'real:jay': {
        birdKey: 'real:jay',
        birdName: 'Jay',
        isReal: true,
        metadata: null,
      },
    });
    expect(store['real:jay']?.metadata).toEqual({});
  });

  it('reads empty journal from invalid JSON in localStorage', () => {
    localStorage.setItem('birdJournal', '{bad-json');
    expect(readBirdJournal()).toEqual({});
  });

  it('writes journal with notify=false', () => {
    writeBirdJournal({ 'real:jay': { birdKey: 'real:jay', birdName: 'Jay', isReal: true, seenCount: 1, correctCount: 1, incorrectCount: 0, lastSeenAt: '2026-01-01', metadata: {} } }, false);
    expect(readBirdJournal()['real:jay']).toBeDefined();
  });

  it('prunes oldest verbose journal metadata when storage size grows too large', () => {
    const largeText = 'a'.repeat(400_000);
    const oversizedJournal = Object.fromEntries(
      Array.from({ length: 4 }, (_, index) => {
        const birdKey = `real:bird-${index}`;
        return [birdKey, {
          birdKey,
          birdName: `Bird ${index}`,
          isReal: true,
          seenCount: 1,
          correctCount: 1,
          incorrectCount: 0,
          lastSeenAt: `2026-01-0${index + 1}T00:00:00.000Z`,
          metadata: {
            imageUrl: `https://example.com/${birdKey}.webp`,
            summary: largeText,
            description: largeText,
          },
        }];
      })
    );

    writeBirdJournal(oversizedJournal, false);

    const stored = readBirdJournal();
    const serializedLength = new TextEncoder().encode(JSON.stringify(stored)).length;
    expect(serializedLength).toBeLessThanOrEqual(BIRD_JOURNAL_MAX_SERIALIZED_BYTES);
    expect(stored['real:bird-0']?.metadata.summary).toBeUndefined();
    expect(stored['real:bird-0']?.metadata.description).toBeUndefined();
    expect(stored['real:bird-3']?.metadata.imageUrl).toBe('https://example.com/real:bird-3.webp');
  });

  it('drops oldest entries entirely when field pruning is insufficient to reach the byte limit', () => {
    // Build a journal where no entries have summary or description — field pruning won't help.
    // Each entry carries ~750,000 bytes of imageUrl data so 4 entries exceed the 2 MB limit.
    const largeUrl = 'https://example.com/' + 'a'.repeat(750_000);
    const oversizedJournal = Object.fromEntries(
      Array.from({ length: 4 }, (_, index) => {
        const birdKey = `real:bird-${index}`;
        return [birdKey, {
          birdKey,
          birdName: `Bird ${index}`,
          isReal: true,
          seenCount: 1,
          correctCount: 1,
          incorrectCount: 0,
          lastSeenAt: `2026-01-0${index + 1}T00:00:00.000Z`,
          metadata: { imageUrl: largeUrl },
        }];
      })
    );

    writeBirdJournal(oversizedJournal, false);

    const stored = readBirdJournal();
    const serializedLength = new TextEncoder().encode(JSON.stringify(stored)).length;
    expect(serializedLength).toBeLessThanOrEqual(BIRD_JOURNAL_MAX_SERIALIZED_BYTES);
    // Oldest entries (bird-0, bird-1, …) should have been dropped; newest retained.
    expect(stored['real:bird-3']).toBeDefined();
  });

  it('recovers gracefully when localStorage.setItem throws a QuotaExceededError', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError');
    });
    const removeItemSpy = vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {});

    const journal = {
      'real:blue-jay': {
        birdKey: 'real:blue-jay',
        birdName: 'Blue Jay',
        isReal: true as const,
        seenCount: 1,
        correctCount: 1,
        incorrectCount: 0,
        lastSeenAt: '2026-01-01T00:00:00.000Z',
        metadata: {},
      },
    };

    // Should not throw despite setItem failing.
    expect(() => writeBirdJournal(journal, false)).not.toThrow();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to write bird journal'),
      expect.anything()
    );
    expect(removeItemSpy).toHaveBeenCalledWith(BIRD_JOURNAL_STORAGE_KEY);

    setItemSpy.mockRestore();
    removeItemSpy.mockRestore();
    warnSpy.mockRestore();
  });

  it('merges local and remote stores conservatively', () => {
    writeBirdJournal({
      'real:blue-jay': {
        birdKey: 'real:blue-jay',
        birdName: 'Blue Jay',
        isReal: true,
        seenCount: 2,
        correctCount: 1,
        incorrectCount: 1,
        lastSeenAt: '2026-04-04T10:00:00.000Z',
        metadata: { regionLabel: 'North America', classificationRevealed: true },
      },
    });

    const merged = mergeBirdJournalStores(readBirdJournal(), {
      'real:blue-jay': {
        birdKey: 'real:blue-jay',
        birdName: 'Blue Jay',
        isReal: true,
        seenCount: 1,
        correctCount: 1,
        incorrectCount: 0,
        lastSeenAt: '2026-04-05T10:00:00.000Z',
        metadata: { sciName: 'Cyanocitta cristata', classificationRevealed: false },
      },
      'fake:striped-robin': {
        birdKey: 'fake:striped-robin',
        birdName: 'Striped Robin',
        isReal: false,
        seenCount: 1,
        correctCount: 0,
        incorrectCount: 1,
        lastSeenAt: '2026-04-05T11:00:00.000Z',
        metadata: {},
      },
    });

    expect(merged['real:blue-jay']).toMatchObject({
      seenCount: 2,
      correctCount: 1,
      incorrectCount: 1,
      metadata: { sciName: 'Cyanocitta cristata' },
    });
    expect(merged['fake:striped-robin']).toMatchObject({
      birdName: 'Striped Robin',
      seenCount: 1,
    });
  });

  it('merge uses remote metadata when remote lastSeenAt is newer', () => {
    const merged = mergeBirdJournalStores(
      {
        'real:robin': {
          birdKey: 'real:robin',
          birdName: 'Robin',
          isReal: true,
          seenCount: 1,
          correctCount: 1,
          incorrectCount: 0,
          lastSeenAt: '2026-01-01T00:00:00.000Z',
          metadata: { regionLabel: 'Local Region' },
        },
      },
      {
        'real:robin': {
          birdKey: 'real:robin',
          birdName: 'Robin',
          isReal: true,
          seenCount: 2,
          correctCount: 2,
          incorrectCount: 0,
          lastSeenAt: '2026-06-01T00:00:00.000Z',
          metadata: { regionLabel: 'Remote Region', sciName: 'Turdus migratorius' },
        },
      }
    );
    expect(merged['real:robin']?.metadata.regionLabel).toBe('Remote Region');
  });

  describe('round journal keys', () => {
    it('reads and writes current round journal bird key', () => {
      expect(readCurrentRoundJournalBirdKey()).toBeNull();
      writeCurrentRoundJournalBirdKey('real:blue-jay');
      expect(readCurrentRoundJournalBirdKey()).toBe('real:blue-jay');
      writeCurrentRoundJournalBirdKey(null);
      expect(readCurrentRoundJournalBirdKey()).toBeNull();
    });

    it('returns null for non-string parsed value', () => {
      localStorage.setItem('currentRoundJournalBirdKey', JSON.stringify(42));
      expect(readCurrentRoundJournalBirdKey()).toBeNull();
    });

    it('returns null for invalid JSON', () => {
      localStorage.setItem('currentRoundJournalBirdKey', '{bad');
      expect(readCurrentRoundJournalBirdKey()).toBeNull();
    });
  });

  it('reads dirty bird journal keys from invalid JSON', () => {
    localStorage.setItem('birdJournalDirtyKeys', '{bad-json');
    expect(readDirtyBirdJournalKeys()).toEqual([]);
  });

  it('reads dirty bird journal keys that contain non-strings', () => {
    localStorage.setItem('birdJournalDirtyKeys', JSON.stringify([1, 'real:jay', null]));
    expect(readDirtyBirdJournalKeys()).toEqual(['real:jay']);
  });

  it('reads dirty bird journal keys that is not an array', () => {
    localStorage.setItem('birdJournalDirtyKeys', JSON.stringify('not-array'));
    expect(readDirtyBirdJournalKeys()).toEqual([]);
  });

  it('normalizes attribution with valid string fields', () => {
    const store = normalizeBirdJournalStore({
      'real:jay': {
        birdKey: 'real:jay',
        birdName: 'Jay',
        isReal: true,
        metadata: {
          attribution: {
            artist: 'Jane Doe',
            license: 'CC BY 4.0',
            licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
          },
        },
      },
    });
    expect(store['real:jay']?.metadata.attribution).toEqual({
      artist: 'Jane Doe',
      license: 'CC BY 4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
    });
  });

  it('normalizes attribution with non-string fields to undefined', () => {
    const store = normalizeBirdJournalStore({
      'real:jay': {
        birdKey: 'real:jay',
        birdName: 'Jay',
        isReal: true,
        metadata: {
          attribution: {
            artist: 42,
            license: null,
            licenseUrl: true,
          },
        },
      },
    });
    expect(store['real:jay']?.metadata.attribution).toEqual({
      artist: undefined,
      license: undefined,
      licenseUrl: undefined,
    });
  });

  it('normalizes non-string lastSeenAt to the epoch ISO string', () => {
    const store = normalizeBirdJournalStore({
      'real:jay': {
        birdKey: 'real:jay',
        birdName: 'Jay',
        isReal: true,
        lastSeenAt: 12345,
      },
    });
    expect(store['real:jay']?.lastSeenAt).toBe(new Date(0).toISOString());
  });

  it('uses local lastSeenAt when local entry is more recent than remote', () => {
    const merged = mergeBirdJournalStores(
      {
        'real:robin': {
          birdKey: 'real:robin',
          birdName: 'Robin',
          isReal: true,
          seenCount: 3,
          correctCount: 3,
          incorrectCount: 0,
          lastSeenAt: '2026-06-01T00:00:00.000Z',
          metadata: { regionLabel: 'Local Region' },
        },
      },
      {
        'real:robin': {
          birdKey: 'real:robin',
          birdName: 'Robin',
          isReal: true,
          seenCount: 1,
          correctCount: 1,
          incorrectCount: 0,
          lastSeenAt: '2026-01-01T00:00:00.000Z',
          metadata: { regionLabel: 'Remote Region' },
        },
      }
    );
    expect(merged['real:robin']?.lastSeenAt).toBe('2026-06-01T00:00:00.000Z');
    expect(merged['real:robin']?.metadata.regionLabel).toBe('Local Region');
  });

  it('merges imageRevealed from remote entry when remote has it set', () => {
    const merged = mergeBirdJournalStores(
      {
        'real:wren': {
          birdKey: 'real:wren',
          birdName: 'Wren',
          isReal: true,
          seenCount: 1,
          correctCount: 1,
          incorrectCount: 0,
          lastSeenAt: '2026-01-01T00:00:00.000Z',
          metadata: {},
        },
      },
      {
        'real:wren': {
          birdKey: 'real:wren',
          birdName: 'Wren',
          isReal: true,
          seenCount: 2,
          correctCount: 2,
          incorrectCount: 0,
          lastSeenAt: '2026-06-01T00:00:00.000Z',
          metadata: { imageRevealed: true },
        },
      }
    );
    expect(merged['real:wren']?.metadata.imageRevealed).toBe(true);
  });

  it('skips entries without verbose fields during storage-limit pruning', () => {
    const largeText = 'a'.repeat(400_000);
    const mixedJournal = Object.fromEntries(
      Array.from({ length: 6 }, (_, index) => {
        const birdKey = `real:bird-${index}`;
        return [birdKey, {
          birdKey,
          birdName: `Bird ${index}`,
          isReal: true,
          seenCount: 1,
          correctCount: 1,
          incorrectCount: 0,
          lastSeenAt: `2026-01-0${index + 1}T00:00:00.000Z`,
          metadata: index < 2
            ? { imageUrl: `https://example.com/${birdKey}.webp` }
            : { imageUrl: `https://example.com/${birdKey}.webp`, summary: largeText, description: largeText },
        }];
      })
    );

    writeBirdJournal(mixedJournal, false);
    const stored = readBirdJournal();
    const serializedLength = new TextEncoder().encode(JSON.stringify(stored)).length;
    expect(serializedLength).toBeLessThanOrEqual(BIRD_JOURNAL_MAX_SERIALIZED_BYTES);
  });

  it('silently absorbs a removeItem failure after a setItem failure in writeBirdJournal', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError');
    });
    const removeItemSpy = vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new DOMException('RemoveError');
    });

    const journal = {
      'real:crow': {
        birdKey: 'real:crow',
        birdName: 'Crow',
        isReal: true as const,
        seenCount: 1,
        correctCount: 1,
        incorrectCount: 0,
        lastSeenAt: '2026-01-01T00:00:00.000Z',
        metadata: {},
      },
    };

    expect(() => writeBirdJournal(journal, false)).not.toThrow();

    setItemSpy.mockRestore();
    removeItemSpy.mockRestore();
    warnSpy.mockRestore();
  });
});
