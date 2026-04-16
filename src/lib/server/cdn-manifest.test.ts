import { describe, expect, it } from 'vitest';
import { hasCdnAssets, getCdnBirdKeys } from './cdn-manifest';

describe('cdn-manifest', () => {
  it('returns false for a bird key not in the manifest', () => {
    expect(hasCdnAssets('nonexistent-bird')).toBe(false);
  });

  it('returns the manifest set', () => {
    expect(getCdnBirdKeys()).toBeInstanceOf(Set);
  });
});
