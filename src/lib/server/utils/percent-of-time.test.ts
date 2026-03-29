import { describe, expect, it, vi } from 'vitest';
import { percentOfTime } from './percent-of-time';

describe('percentOfTime', () => {
  it('returns true when the random value falls within the percentage threshold', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.19);
    expect(percentOfTime(20)).toBe(true);
  });

  it('returns false when the random value falls outside the percentage threshold', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.2);
    expect(percentOfTime(20)).toBe(false);
  });
});