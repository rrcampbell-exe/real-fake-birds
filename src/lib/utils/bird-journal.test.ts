import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearDirtyBirdJournalKeys,
  deriveBirdKey,
  getDirtyBirdJournalEntries,
  isBirdClassificationRevealed,
  isJournalEntryMaskedForCurrentRound,
  markDirtyBirdJournalKeys,
  mergeBirdJournalStores,
  normalizeBirdJournalStore,
  readBirdJournal,
  readCurrentRoundJournalBirdKey,
  readCurrentRoundJournalRevealKey,
  readDirtyBirdJournalKeys,
  recordBirdEncounter,
  revealBirdClassification,
  writeBirdJournal,
  writeCurrentRoundJournalBirdKey,
  writeCurrentRoundJournalRevealKey,
} from '@/lib/utils/bird-journal';

vi.mock('@/hooks/useStoredValue', () => ({
  notifyStoredValueChanged: vi.fn(),
}));

import { vi } from 'vitest';

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
    expect(isBirdClassificationRevealed(secondEntry)).toBe(false);
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

  it('can reveal a concealed bird classification permanently', () => {
    const entry = recordBirdEncounter({
      birdName: 'Blue Jay',
      isReal: true,
      outcome: 'seen',
      metadata: {},
    });

    const revealedEntry = revealBirdClassification(entry.birdKey);

    expect(revealedEntry).not.toBeNull();
    expect(isBirdClassificationRevealed(revealedEntry)).toBe(true);
    expect(isBirdClassificationRevealed(readBirdJournal()[entry.birdKey])).toBe(true);
  });

  it('returns null when revealing a bird key that does not exist', () => {
    expect(revealBirdClassification('real:nonexistent')).toBeNull();
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
      metadata: { sciName: 'Cyanocitta cristata', classificationRevealed: true },
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

    it('reads and writes current round journal reveal key', () => {
      expect(readCurrentRoundJournalRevealKey()).toBeNull();
      writeCurrentRoundJournalRevealKey('real:blue-jay');
      expect(readCurrentRoundJournalRevealKey()).toBe('real:blue-jay');
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

  describe('isJournalEntryMaskedForCurrentRound', () => {
    it('returns true when bird key matches round bird key but not reveal key', () => {
      expect(isJournalEntryMaskedForCurrentRound({
        entry: { birdKey: 'real:jay' },
        currentRoundBirdKey: 'real:jay',
        currentRoundRevealKey: null,
      })).toBe(true);
    });

    it('returns false when reveal key matches bird key', () => {
      expect(isJournalEntryMaskedForCurrentRound({
        entry: { birdKey: 'real:jay' },
        currentRoundBirdKey: 'real:jay',
        currentRoundRevealKey: 'real:jay',
      })).toBe(false);
    });

    it('returns false when entry bird key does not match current round', () => {
      expect(isJournalEntryMaskedForCurrentRound({
        entry: { birdKey: 'real:robin' },
        currentRoundBirdKey: 'real:jay',
        currentRoundRevealKey: null,
      })).toBe(false);
    });
  });

  describe('isBirdClassificationRevealed', () => {
    it('returns false for null/undefined entry', () => {
      expect(isBirdClassificationRevealed(null)).toBe(false);
      expect(isBirdClassificationRevealed(undefined)).toBe(false);
    });

    it('returns false when classificationRevealed is not set', () => {
      expect(isBirdClassificationRevealed({ metadata: {} })).toBe(false);
    });

    it('returns true when classificationRevealed is true', () => {
      expect(isBirdClassificationRevealed({ metadata: { classificationRevealed: true } })).toBe(true);
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
});
