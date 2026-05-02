import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/hooks/useStoredValue', () => ({
  useStoredJson: vi.fn(),
}));

import { useStoredJson } from '@/hooks/useStoredValue';
import { useBirdJournal } from '@/hooks/useBirdJournal';

describe('useBirdJournal', () => {
  beforeEach(() => {
    vi.mocked(useStoredJson).mockReset();
  });

  it('summarizes journal entries', () => {
    vi.mocked(useStoredJson)
      .mockReturnValueOnce({
        'real:blue-jay': {
          birdKey: 'real:blue-jay',
          birdName: 'Blue Jay',
          isReal: true,
          seenCount: 2,
          correctCount: 1,
          incorrectCount: 1,
          lastSeenAt: '2026-04-05T10:00:00.000Z',
          metadata: {},
        },
        'fake:striped-robin': {
          birdKey: 'fake:striped-robin',
          birdName: 'Striped Robin',
          isReal: false,
          seenCount: 1,
          correctCount: 1,
          incorrectCount: 0,
          lastSeenAt: '2026-04-05T11:00:00.000Z',
          metadata: {},
        },
      })
      .mockReturnValueOnce(null); // no server summary

    const { result } = renderHook(() => useBirdJournal());

    expect(result.current.uniqueBirdCount).toBe(2);
    expect(result.current.realBirdCount).toBe(1);
    expect(result.current.fakeBirdCount).toBe(1);
    expect(result.current.accuracy).toBe(66);
    expect(result.current.getEntry('real:blue-jay')?.birdName).toBe('Blue Jay');
  });

  it('computes accuracy as 0 when no birds have been seen', () => {
    vi.mocked(useStoredJson).mockReturnValueOnce({}).mockReturnValueOnce(null);

    const { result } = renderHook(() => useBirdJournal());
    expect(result.current.accuracy).toBe(0);
    expect(result.current.uniqueBirdCount).toBe(0);
  });

  it('getEntry returns null for unknown bird keys', () => {
    vi.mocked(useStoredJson).mockReturnValueOnce({}).mockReturnValueOnce(null);
    const { result } = renderHook(() => useBirdJournal());
    expect(result.current.getEntry('unknown:bird')).toBeNull();
  });

  it('uses server summary counts when available, overriding local cache', () => {
    // Local cache only has 1 bird (pruned), but server says 42
    vi.mocked(useStoredJson)
      .mockReturnValueOnce({ 'real:blue-jay': { birdKey: 'real:blue-jay', isReal: true, seenCount: 1, correctCount: 1, incorrectCount: 0, lastSeenAt: '', metadata: {} } })
      .mockReturnValueOnce({ uniqueBirdCount: 42, realBirdCount: 30, fakeBirdCount: 12, totalSeen: 200, totalCorrect: 160 });

    const { result } = renderHook(() => useBirdJournal());

    expect(result.current.uniqueBirdCount).toBe(42);
    expect(result.current.realBirdCount).toBe(30);
    expect(result.current.fakeBirdCount).toBe(12);
    expect(result.current.totalSeen).toBe(200);
    expect(result.current.totalCorrect).toBe(160);
    expect(result.current.accuracy).toBe(80);
  });
});
