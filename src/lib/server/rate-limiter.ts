interface RateLimitState {
  hits: number[];
}

const rateLimitStore = new Map<string, RateLimitState>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
}

export function consumeRateLimit(key: string, maxRequests: number, windowMs: number, now = Date.now()): RateLimitResult {
  const existing = rateLimitStore.get(key);
  const windowStart = now - windowMs;
  const hits = existing?.hits.filter((timestamp) => timestamp > windowStart) ?? [];

  if (hits.length >= maxRequests) {
    rateLimitStore.set(key, { hits });
    return {
      allowed: false,
      remaining: 0,
    };
  }

  hits.push(now);
  rateLimitStore.set(key, { hits });

  return {
    allowed: true,
    remaining: Math.max(0, maxRequests - hits.length),
  };
}

export function getRateLimitKey(ipAddress: string | null | undefined, scope: string): string {
  return `${scope}:${ipAddress?.trim() || 'unknown'}`;
}

export function resetRateLimitStore(): void {
  rateLimitStore.clear();
}