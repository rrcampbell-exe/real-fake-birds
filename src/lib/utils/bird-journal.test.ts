import { beforeEach, describe, expect, it } from 'vitest';
import {
  deriveBirdKey,
  isBirdClassificationRevealed,
  mergeBirdJournalStores,
  readBirdJournal,
  recordBirdEncounter,
  revealBirdClassification,
  writeBirdJournal,
} from '@/lib/utils/bird-journal';

describe('bird-journal utilities', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('derives stable keys from bird names and realness', () => {
    expect(deriveBirdKey('Blue Jay', true)).toBe('real:blue-jay');
    expect(deriveBirdKey("Campbell's   Striped Robin", false)).toBe('fake:campbells-striped-robin');
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
});
