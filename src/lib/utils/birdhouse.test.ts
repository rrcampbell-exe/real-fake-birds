import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  addToBirdhouse,
  BIRDHOUSE_FAKE_CAP,
  BIRDHOUSE_REAL_CAP,
  isBirdInBirdhouse,
  normalizeBirdhouseStore,
  readBirdhouse,
  readBirdhouseLastVisitedAt,
  removeFromBirdhouse,
  swapBirdhouseEntry,
  writeBirdhouse,
  writeBirdhouseLastVisitedAt,
} from '@/lib/utils/birdhouse';

const { notifyStoredValueChangedMock } = vi.hoisted(() => ({
  notifyStoredValueChangedMock: vi.fn(),
}));

vi.mock('@/hooks/useStoredValue', () => ({
  notifyStoredValueChanged: notifyStoredValueChangedMock,
}));

describe('birdhouse utilities', () => {
  beforeEach(() => {
    localStorage.clear();
    notifyStoredValueChangedMock.mockClear();
  });

  it('normalizes invalid input to an empty birdhouse', () => {
    expect(normalizeBirdhouseStore(null)).toEqual({ real: [], fake: [], updatedAt: new Date(0).toISOString() });
  });

  it('normalizeBirdhouseStore handles a non-object primitive', () => {
    expect(normalizeBirdhouseStore('string')).toEqual({ real: [], fake: [], updatedAt: new Date(0).toISOString() });
    expect(normalizeBirdhouseStore(0)).toEqual({ real: [], fake: [], updatedAt: new Date(0).toISOString() });
  });

  it('normalizeBirdhouseStore preserves a valid updatedAt string', () => {
    const result = normalizeBirdhouseStore({ real: ['real:bird-1'], fake: [], updatedAt: '2026-04-13T00:00:00.000Z' });
    expect(result.updatedAt).toBe('2026-04-13T00:00:00.000Z');
  });

  it('normalizeBirdhouseStore falls back for non-string updatedAt', () => {
    const result = normalizeBirdhouseStore({ real: [], fake: [], updatedAt: 999 });
    expect(result.updatedAt).toBe(new Date(0).toISOString());
  });

  it('normalizeBirdhouseStore falls back for an unparseable updatedAt string', () => {
    const result = normalizeBirdhouseStore({ real: [], fake: [], updatedAt: 'not-a-date' });
    expect(result.updatedAt).toBe(new Date(0).toISOString());
  });

  it('normalizeBirdhouseStore normalizes +00:00 offset timestamps to Z-suffix ISO format', () => {
    const result = normalizeBirdhouseStore({ real: [], fake: [], updatedAt: '2026-04-13T00:00:00.000+00:00' });
    expect(result.updatedAt).toBe('2026-04-13T00:00:00.000Z');
  });

  it('normalizeBirdhouseStore filters out non-string and empty entries', () => {
    const result = normalizeBirdhouseStore({ real: [null, '', 'real:jay', 'real:jay', 42], fake: [] });
    expect(result.real).toEqual(['real:jay']);
  });

  it('normalizeBirdhouseStore handles non-array values for collections', () => {
    const result = normalizeBirdhouseStore({ real: 'not-array', fake: null });
    expect(result.real).toEqual([]);
    expect(result.fake).toEqual([]);
  });

  it('writes and reads birdhouse state', () => {
    writeBirdhouse({ real: ['real:blue-jay'], fake: ['fake:striped-robin'], updatedAt: '2026-04-07T10:00:00.000Z' });

    expect(readBirdhouse()).toEqual({
      real: ['real:blue-jay'],
      fake: ['fake:striped-robin'],
      updatedAt: '2026-04-07T10:00:00.000Z',
    });
  });

  it('readBirdhouse returns default when localStorage is empty', () => {
    expect(readBirdhouse()).toEqual({ real: [], fake: [], updatedAt: new Date(0).toISOString() });
  });

  it('readBirdhouse returns default when localStorage has invalid JSON', () => {
    localStorage.setItem('birdhouse', '{bad json');
    expect(readBirdhouse()).toEqual({ real: [], fake: [], updatedAt: new Date(0).toISOString() });
  });

  it('writeBirdhouse with notify=true calls notifyStoredValueChanged', () => {
    writeBirdhouse({ real: [], fake: [], updatedAt: '2026-01-01T00:00:00.000Z' });
    expect(notifyStoredValueChangedMock).toHaveBeenCalledWith('birdhouse');
  });

  it('writeBirdhouse with notify=false skips notification', () => {
    writeBirdhouse({ real: ['real:jay'], fake: [], updatedAt: '2026-01-01T00:00:00.000Z' }, false);
    expect(notifyStoredValueChangedMock).not.toHaveBeenCalled();
  });

  it('adds and removes birds by real/fake collection', () => {
    addToBirdhouse('real:blue-jay', true);
    addToBirdhouse('fake:striped-robin', false);

    expect(isBirdInBirdhouse(readBirdhouse(), 'real:blue-jay')).toBe(true);
    expect(isBirdInBirdhouse(readBirdhouse(), 'fake:striped-robin')).toBe(true);

    removeFromBirdhouse('real:blue-jay', true);
    expect(isBirdInBirdhouse(readBirdhouse(), 'real:blue-jay')).toBe(false);
  });

  it('addToBirdhouse adds to and removes from fake collection', () => {
    addToBirdhouse('fake:sparrow', false);
    expect(isBirdInBirdhouse(readBirdhouse(), 'fake:sparrow')).toBe(true);
    removeFromBirdhouse('fake:sparrow', false);
    expect(isBirdInBirdhouse(readBirdhouse(), 'fake:sparrow')).toBe(false);
  });

  it('addToBirdhouse returns existing store when bird already present', () => {
    writeBirdhouse({ real: ['real:jay'], fake: [], updatedAt: '2026-01-01T00:00:00.000Z' });
    const result = addToBirdhouse('real:jay', true);
    expect(result).not.toBeNull();
    expect(result!.real).toEqual(['real:jay']);
  });

  it('enforces the per-collection caps', () => {
    writeBirdhouse({
      real: Array.from({ length: BIRDHOUSE_REAL_CAP }, (_, index) => `real:bird-${index}`),
      fake: Array.from({ length: BIRDHOUSE_FAKE_CAP }, (_, index) => `fake:bird-${index}`),
      updatedAt: '2026-04-07T10:00:00.000Z',
    });

    expect(addToBirdhouse('real:overflow', true)).toBeNull();
    expect(addToBirdhouse('fake:overflow', false)).toBeNull();
  });

  it('isBirdInBirdhouse returns false when bird is in neither collection', () => {
    const store = { real: ['real:jay'], fake: ['fake:sparrow'], updatedAt: '2026-01-01T00:00:00.000Z' };
    expect(isBirdInBirdhouse(store, 'real:unknown')).toBe(false);
  });

  it('swaps an entry in the real collection', () => {
    writeBirdhouse({
      real: ['real:blue-jay'],
      fake: [],
      updatedAt: '2026-04-07T10:00:00.000Z',
    });

    const next = swapBirdhouseEntry({
      incomingBirdKey: 'real:great-blue-heron',
      outgoingBirdKey: 'real:blue-jay',
      isReal: true,
    });

    expect(next.real).toEqual(['real:great-blue-heron']);
  });

  it('swapBirdhouseEntry swaps in the fake collection', () => {
    writeBirdhouse({ real: [], fake: ['fake:sparrow'], updatedAt: '2026-01-01T00:00:00.000Z' });
    const next = swapBirdhouseEntry({ incomingBirdKey: 'fake:phoenix', outgoingBirdKey: 'fake:sparrow', isReal: false });
    expect(next.fake).toEqual(['fake:phoenix']);
  });

  describe('readBirdhouseLastVisitedAt', () => {
    it('returns null when localStorage is empty', () => {
      expect(readBirdhouseLastVisitedAt()).toBeNull();
    });

    it('returns the stored string value', () => {
      localStorage.setItem('birdhouseLastVisitedAt', JSON.stringify('2026-04-13T00:00:00.000Z'));
      expect(readBirdhouseLastVisitedAt()).toBe('2026-04-13T00:00:00.000Z');
    });

    it('returns null for invalid JSON', () => {
      localStorage.setItem('birdhouseLastVisitedAt', '{bad');
      expect(readBirdhouseLastVisitedAt()).toBeNull();
    });

    it('returns null when stored value is not a string', () => {
      localStorage.setItem('birdhouseLastVisitedAt', JSON.stringify(42));
      expect(readBirdhouseLastVisitedAt()).toBeNull();
    });
  });

  describe('writeBirdhouseLastVisitedAt', () => {
    it('stores a string value', () => {
      writeBirdhouseLastVisitedAt('2026-04-13T00:00:00.000Z');
      expect(localStorage.getItem('birdhouseLastVisitedAt')).toBe(JSON.stringify('2026-04-13T00:00:00.000Z'));
    });

    it('removes the key when passed null', () => {
      localStorage.setItem('birdhouseLastVisitedAt', '"old"');
      writeBirdhouseLastVisitedAt(null);
      expect(localStorage.getItem('birdhouseLastVisitedAt')).toBeNull();
    });
  });
});
