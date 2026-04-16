import { describe, expect, it, vi, beforeEach } from 'vitest';
import { getCdnImageUrl, getCdnFactUrl, isCdnEnabled } from './cdn';

describe('cdn utilities', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.stubEnv('CDN_BASE_URL', 'https://cdn.realfakebirds.app');
  });

  describe('isCdnEnabled', () => {
    it('returns false when CDN_BASE_URL is not set', () => {
      vi.stubEnv('CDN_BASE_URL', '');
      expect(isCdnEnabled()).toBe(false);
    });

    it('returns true when CDN_BASE_URL is set', () => {
      expect(isCdnEnabled()).toBe(true);
    });
  });

  describe('getCdnImageUrl', () => {
    it('builds a full image URL', () => {
      const url = getCdnImageUrl('blue-jay', 'full');
      expect(url).toContain('/birds/real/blue-jay/image.webp');
    });

    it('builds a thumbnail URL', () => {
      const url = getCdnImageUrl('american-robin', 'thumb');
      expect(url).toContain('/birds/real/american-robin/thumb.webp');
    });

    it('defaults to full size', () => {
      const url = getCdnImageUrl('blue-jay');
      expect(url).toContain('/image.webp');
      expect(url).not.toContain('/thumb.webp');
    });
  });

  describe('getCdnFactUrl', () => {
    it('builds a fact.json URL', () => {
      const url = getCdnFactUrl('blue-jay');
      expect(url).toContain('/birds/real/blue-jay/fact.json');
    });
  });
});
