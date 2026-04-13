import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/hooks/useStoredValue', () => ({
  useStoredJson: vi.fn(),
}));

import { useStoredJson } from '@/hooks/useStoredValue';
import { useBirdhouse } from '@/hooks/useBirdhouse';

describe('useBirdhouse', () => {
  beforeEach(() => {
    vi.mocked(useStoredJson).mockReset();
  });

  it('summarizes the current birdhouse state', () => {
    vi.mocked(useStoredJson).mockReturnValue({
      real: ['real:blue-jay'],
      fake: ['fake:striped-robin'],
      updatedAt: '2026-04-07T10:00:00.000Z',
    });

    const { result } = renderHook(() => useBirdhouse());

    expect(result.current.realCount).toBe(1);
    expect(result.current.fakeCount).toBe(1);
    expect(result.current.isInBirdhouse('real:blue-jay')).toBe(true);
    expect(result.current.isInBirdhouse('real:heron')).toBe(false);
  });
});