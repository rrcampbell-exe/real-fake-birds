import { describe, expect, it } from 'vitest';
import { consumeRateLimit, getRateLimitKey, resetRateLimitStore } from './rate-limiter';

describe('rate-limiter', () => {
  it('allows requests until the limit is reached, then blocks', () => {
    resetRateLimitStore();
    const key = getRateLimitKey('1.2.3.4', 'bird-fetch');

    expect(consumeRateLimit(key, 2, 1000, 1000).allowed).toBe(true);
    expect(consumeRateLimit(key, 2, 1000, 1200).allowed).toBe(true);
    expect(consumeRateLimit(key, 2, 1000, 1300).allowed).toBe(false);
  });

  it('expires hits outside the rolling window', () => {
    resetRateLimitStore();
    const key = getRateLimitKey('1.2.3.4', 'bird-fetch');

    expect(consumeRateLimit(key, 1, 1000, 1000).allowed).toBe(true);
    expect(consumeRateLimit(key, 1, 1000, 1500).allowed).toBe(false);
    expect(consumeRateLimit(key, 1, 1000, 2101).allowed).toBe(true);
  });
});