import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabase/env', () => ({
  hasSupabaseEnv: vi.fn().mockReturnValue(true),
}));

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseAdminClient: vi.fn(),
  createSupabaseServerClient: vi.fn(),
}));

vi.mock('@/lib/server/rate-limiter', () => ({
  getRateLimitKey: vi.fn().mockReturnValue('test-key'),
  consumeRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
}));

vi.mock('@/lib/server/cdn', () => ({
  isCdnEnabled: vi.fn().mockReturnValue(false),
  getCdnImageUrl: vi.fn().mockReturnValue('https://cdn.example.com/image.webp'),
}));

import { NextRequest } from 'next/server';
import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase/server';
import { GET } from './route';

const mockedAdminClient = vi.mocked(createSupabaseAdminClient);
const mockedServerClient = vi.mocked(createSupabaseServerClient);

function buildAdmin({
  profile = { user_id: 'target-uid', username: 'birdlover', privacy_mode: 'public' },
  follows = [],
  birdhouse = { real_birds: ['blue-jay'], fake_birds: ['fake:paper-eagle'] },
}: {
  profile?: Record<string, unknown> | null;
  follows?: unknown[];
  birdhouse?: { real_birds: string[]; fake_birds: string[] } | null;
}) {
  return {
    from: vi.fn((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          ilike: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: profile, error: null }),
        };
      }

      if (table === 'follows') {
        return {
          select: vi.fn().mockReturnThis(),
          or: vi.fn().mockResolvedValue({ data: follows, error: null }),
        };
      }

      if (table === 'birdhouse') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: birdhouse, error: null }),
        };
      }

      throw new Error(`unexpected table ${table}`);
    }),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockedServerClient.mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'viewer-uid' } },
        error: null,
      }),
    },
  } as never);
});

describe('GET /api/birdhouse/[username]', () => {
  it('hides blocked profiles with a not found response', async () => {
    mockedAdminClient.mockReturnValue(
      buildAdmin({
        follows: [
          {
            user_id: 'target-uid',
            related_user_id: 'viewer-uid',
            relationship_type: 'block',
            status: 'approved',
          },
        ],
      }) as never,
    );

    const response = await GET(new NextRequest('http://localhost/api/birdhouse/birdlover'), {
      params: Promise.resolve({ username: 'birdlover' }),
    });
    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: 'not_found' });
  });

  it('rejects private profiles for unapproved viewers', async () => {
    mockedAdminClient.mockReturnValue(
      buildAdmin({
        profile: { user_id: 'target-uid', username: 'birdlover', privacy_mode: 'private' },
      }) as never,
    );

    const response = await GET(new NextRequest('http://localhost/api/birdhouse/birdlover'), {
      params: Promise.resolve({ username: 'birdlover' }),
    });
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: 'private_profile' });
  });

  it('returns public birdhouse data for approved followers of private profiles', async () => {
    mockedAdminClient.mockReturnValue(
      buildAdmin({
        profile: { user_id: 'target-uid', username: 'birdlover', privacy_mode: 'private' },
        follows: [
          {
            user_id: 'viewer-uid',
            related_user_id: 'target-uid',
            relationship_type: 'follow',
            status: 'approved',
          },
        ],
      }) as never,
    );

    const response = await GET(new NextRequest('http://localhost/api/birdhouse/birdlover'), {
      params: Promise.resolve({ username: 'birdlover' }),
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      kind: 'public-birdhouse',
      username: 'birdlover',
      real: [{ birdKey: 'blue-jay', imageUrl: null, thumbUrl: null }],
      fake: [{ birdKey: 'paper-eagle', imageUrl: null, thumbUrl: null }],
    });
  });
});
