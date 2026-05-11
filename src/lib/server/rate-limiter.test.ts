import { afterEach, describe, expect, it, vi } from 'vitest';
import { consumeRateLimit, getRateLimitKey, resetRateLimitStore } from './rate-limiter';

describe('rate-limiter', () => {
  it('allows requests until the limit is reached, then blocks', async () => {
    resetRateLimitStore();
    const key = getRateLimitKey('1.2.3.4', 'bird-fetch');

    expect((await consumeRateLimit(key, 2, 1000, 1000)).allowed).toBe(true);
    expect((await consumeRateLimit(key, 2, 1000, 1200)).allowed).toBe(true);
    expect((await consumeRateLimit(key, 2, 1000, 1300)).allowed).toBe(false);
  });

  it('expires hits outside the rolling window', async () => {
    resetRateLimitStore();
    const key = getRateLimitKey('1.2.3.4', 'bird-fetch');

    expect((await consumeRateLimit(key, 1, 1000, 1000)).allowed).toBe(true);
    expect((await consumeRateLimit(key, 1, 1000, 1500)).allowed).toBe(false);
    expect((await consumeRateLimit(key, 1, 1000, 2101)).allowed).toBe(true);
  });
});

async function importRateLimiterWithRedis(evalImpl: ReturnType<typeof vi.fn>) {
  vi.resetModules();
  vi.doMock('@upstash/redis', () => ({
    Redis: class {
      eval = evalImpl;
    },
  }));
  vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://upstash.example');
  vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'token');

  return import('./rate-limiter');
}

afterEach(() => {
  vi.resetModules();
  vi.unstubAllEnvs();
  vi.doUnmock('@upstash/redis');
});

describe('rate-limiter with redis', () => {
  it('uses redis when configured', async () => {
    const evalSpy = vi.fn().mockResolvedValue([1, 4]);
    const { consumeRateLimit: consumeRedisRateLimit } = await importRateLimiterWithRedis(evalSpy);

    await expect(consumeRedisRateLimit('bird-fetch:1.2.3.4', 5, 1000, 1000)).resolves.toEqual({
      allowed: true,
      remaining: 4,
    });
    expect(evalSpy).toHaveBeenCalled();
  });

  it('returns denied results from redis', async () => {
    const evalSpy = vi.fn().mockResolvedValue([0, 0]);
    const { consumeRateLimit: consumeRedisRateLimit } = await importRateLimiterWithRedis(evalSpy);

    await expect(consumeRedisRateLimit('bird-fetch:1.2.3.4', 5, 1000, 1000)).resolves.toEqual({
      allowed: false,
      remaining: 0,
    });
  });

  it('falls back to the in-memory store when redis fails', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const evalSpy = vi.fn().mockRejectedValue(new Error('redis unavailable'));
    const {
      consumeRateLimit: consumeRedisRateLimit,
      getRateLimitKey: getRedisRateLimitKey,
      resetRateLimitStore: resetRedisRateLimitStore,
    } = await importRateLimiterWithRedis(evalSpy);

    resetRedisRateLimitStore();
    const key = getRedisRateLimitKey('1.2.3.4', 'bird-fetch');

    expect((await consumeRedisRateLimit(key, 1, 1000, 1000)).allowed).toBe(true);
    expect((await consumeRedisRateLimit(key, 1, 1000, 1200)).allowed).toBe(false);
    expect(warnSpy).toHaveBeenCalled();
  });
});
