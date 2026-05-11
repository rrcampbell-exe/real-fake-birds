import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchCdnFact, getCdnFactUrl, getCdnImageUrl, isCdnEnabled } from './cdn';

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

    it('supports fake bird image URLs', () => {
      expect(getCdnImageUrl('paper-eagle', 'thumb', 'fake')).toContain('/birds/fake/paper-eagle/thumb.webp');
    });

    it('throws when the CDN base URL is missing', () => {
      vi.stubEnv('CDN_BASE_URL', '');
      expect(() => getCdnImageUrl('blue-jay')).toThrow('CDN_BASE_URL is not configured');
    });
  });

  describe('getCdnFactUrl', () => {
    it('builds a fact.json URL', () => {
      const url = getCdnFactUrl('blue-jay');
      expect(url).toContain('/birds/real/blue-jay/fact.json');
    });

    it('throws when the CDN base URL is missing', () => {
      vi.stubEnv('CDN_BASE_URL', '');
      expect(() => getCdnFactUrl('blue-jay')).toThrow('CDN_BASE_URL is not configured');
    });
  });

  describe('fetchCdnFact', () => {
    it('returns null when the CDN is disabled', async () => {
      vi.stubEnv('CDN_BASE_URL', '');
      await expect(fetchCdnFact('blue-jay')).resolves.toBeNull();
    });

    it('returns parsed fact data and cache status for successful responses', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          headers: { get: vi.fn().mockReturnValue('HIT') },
          json: async () => ({ fact: 'Blue jays mimic hawks.' }),
        }),
      );

      await expect(fetchCdnFact('blue-jay')).resolves.toEqual({
        fact: { fact: 'Blue jays mimic hawks.' },
        cacheStatus: 'HIT',
      });
    });

    it('returns null for non-ok responses and fetch failures', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn()
          .mockResolvedValueOnce({
            ok: false,
            headers: { get: vi.fn() },
          })
          .mockRejectedValueOnce(new Error('network failure')),
      );

      await expect(fetchCdnFact('blue-jay')).resolves.toBeNull();
      await expect(fetchCdnFact('blue-jay')).resolves.toBeNull();
    });
  });
});
