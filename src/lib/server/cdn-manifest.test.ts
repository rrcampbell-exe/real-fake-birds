import { describe, expect, it } from 'vitest';
import {
  hasCdnAssets,
  getCdnBirdKeys,
  hasFakeCdnAssets,
  getCdnFakeBirdKeys,
  getFakeBirdPlausibility,
  getFakeBirdsByPlausibilityRange,
} from './cdn-manifest';

describe('cdn-manifest', () => {
  it('returns false for a bird key not in the manifest', () => {
    expect(hasCdnAssets('nonexistent-bird')).toBe(false);
  });

  it('returns the manifest set', () => {
    expect(getCdnBirdKeys()).toBeInstanceOf(Set);
  });

  it('returns false for fake bird key not in manifest', () => {
    expect(hasFakeCdnAssets('nonexistent-fake-bird')).toBe(false);
  });

  it('returns the fake bird keys as a Set', () => {
    const keys = getCdnFakeBirdKeys();
    expect(keys).toBeInstanceOf(Set);
    expect(keys.size).toBeGreaterThan(0);
  });

  it('returns plausibility for a known fake bird', () => {
    const keys = getCdnFakeBirdKeys();
    const firstKey = [...keys][0];
    const plausibility = getFakeBirdPlausibility(firstKey);
    expect(plausibility).toBeGreaterThanOrEqual(1);
    expect(plausibility).toBeLessThanOrEqual(10);
  });

  it('returns undefined plausibility for unknown key', () => {
    expect(getFakeBirdPlausibility('nonexistent')).toBeUndefined();
  });

  it('filters fake birds by plausibility range', () => {
    const highPlausibility = getFakeBirdsByPlausibilityRange(8, 10);
    expect(highPlausibility.length).toBeGreaterThan(0);
    for (const key of highPlausibility) {
      const score = getFakeBirdPlausibility(key);
      expect(score).toBeGreaterThanOrEqual(8);
      expect(score).toBeLessThanOrEqual(10);
    }
  });
});
