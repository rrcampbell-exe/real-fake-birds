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

vi.mock('@/lib/server/social-entries', () => ({
  buildSocialEntries: vi.fn().mockResolvedValue([]),
}));

import { NextRequest } from 'next/server';
import { buildSocialEntries } from '@/lib/server/social-entries';
import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase/server';
import { GET } from './route';

const mockedAdminClient = vi.mocked(createSupabaseAdminClient);
const mockedServerClient = vi.mocked(createSupabaseServerClient);
const mockedBuildSocialEntries = vi.mocked(buildSocialEntries);

function buildRequest(query: string): NextRequest {
  return new NextRequest(`http://localhost/api/profile/connections?${query}`);
}

function buildAdmin({
  profile = { user_id: 'target-uid', username: 'birdlover', privacy_mode: 'public' },
  relationshipRows = [],
  connectionRows = [],
}: {
  profile?: Record<string, unknown> | null;
  relationshipRows?: unknown[];
  connectionRows?: unknown[];
} = {}) {
  let followsQueryCount = 0;

  return {
    from: vi.fn((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: profile, error: null }),
        };
      }

      if (table === 'follows') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          or: vi.fn().mockImplementation(() => {
            followsQueryCount += 1;
            return Promise.resolve({
              data: followsQueryCount === 1 ? relationshipRows : connectionRows,
              error: null,
            });
          }),
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

describe('GET /api/profile/connections', () => {
  it('validates request parameters', async () => {
    mockedAdminClient.mockReturnValue(buildAdmin() as never);

    const response = await GET(buildRequest('username=birdlover'));
    expect(response.status).toBe(400);
  });

  it('returns a blocked error for blocked viewers', async () => {
    mockedAdminClient.mockReturnValue(
      buildAdmin({
        relationshipRows: [
          {
            user_id: 'target-uid',
            related_user_id: 'viewer-uid',
            relationship_type: 'block',
            status: 'approved',
          },
        ],
      }) as never,
    );

    const response = await GET(buildRequest('username=birdlover&list=followers'));
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: 'blocked' });
  });

  it('returns entries for allowed viewers', async () => {
    mockedBuildSocialEntries.mockResolvedValueOnce([
      {
        userId: 'user-1',
        username: 'follower-one',
        avatarPalette: 'finch',
        avatarFakeBirdImageUrl: null,
        isHouseAccount: false,
        latestBadgeName: null,
        relationship: 'none',
        capabilities: { canFollow: true, canUnfollow: false },
      },
    ]);

    mockedAdminClient.mockReturnValue(
      buildAdmin({
        connectionRows: [
          {
            user_id: 'user-1',
            related_user_id: 'target-uid',
          },
        ],
      }) as never,
    );

    const response = await GET(buildRequest('username=birdlover&list=followers'));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      entries: [
        expect.objectContaining({
          userId: 'user-1',
          username: 'follower-one',
        }),
      ],
    });
  });
});
