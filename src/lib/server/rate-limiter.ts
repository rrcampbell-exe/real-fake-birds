import { Redis } from '@upstash/redis';

interface RateLimitState {
  hits: number[];
}

const rateLimitStore = new Map<string, RateLimitState>();
let redisClient: Redis | null | undefined;

const redisRateLimitScript = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local windowStart = tonumber(ARGV[2])
local maxRequests = tonumber(ARGV[3])
local ttl = tonumber(ARGV[4])
local member = ARGV[5]

redis.call('ZREMRANGEBYSCORE', key, 0, windowStart)
local count = redis.call('ZCARD', key)

if count >= maxRequests then
  redis.call('PEXPIRE', key, ttl)
  return {0, 0}
end

redis.call('ZADD', key, now, member)
redis.call('PEXPIRE', key, ttl)

local remaining = maxRequests - (count + 1)
if remaining < 0 then
  remaining = 0
end

return {1, remaining}
`;

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
}

function consumeMemoryRateLimit(key: string, maxRequests: number, windowMs: number, now = Date.now()): RateLimitResult {
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

function getRedisClient(): Redis | null {
  if (redisClient !== undefined) {
    return redisClient;
  }

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    redisClient = null;
    return redisClient;
  }

  redisClient = new Redis({ url, token });
  return redisClient;
}

export async function consumeRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number,
  now = Date.now(),
): Promise<RateLimitResult> {
  const redis = getRedisClient();
  if (!redis) {
    return consumeMemoryRateLimit(key, maxRequests, windowMs, now);
  }

  try {
    const member = `${now}:${Math.random().toString(16).slice(2)}`;
    const result = await redis.eval<number[]>(
      redisRateLimitScript,
      [`ratelimit:${key}`],
      [
        String(now),
        String(now - windowMs),
        String(maxRequests),
        String(windowMs),
        member,
      ],
    );

    return {
      allowed: result?.[0] === 1,
      remaining: typeof result?.[1] === 'number' ? Math.max(0, result[1]) : 0,
    };
  } catch (error) {
    console.warn('Falling back to in-memory rate limit store.', error);
    return consumeMemoryRateLimit(key, maxRequests, windowMs, now);
  }
}

export function getRateLimitKey(ipAddress: string | null | undefined, scope: string): string {
  return `${scope}:${ipAddress?.trim() || 'unknown'}`;
}

export function resetRateLimitStore(): void {
  rateLimitStore.clear();
}