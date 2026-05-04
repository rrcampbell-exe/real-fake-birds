import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock server-only modules before importing the route
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

import { NextRequest } from 'next/server';
import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase/server';
import { GET } from './route';

const mockedAdminClient = vi.mocked(createSupabaseAdminClient);
const mockedServerClient = vi.mocked(createSupabaseServerClient);

function buildRequest(username: string): NextRequest {
  return new NextRequest(`http://localhost/api/profile?username=${encodeURIComponent(username)}`);
}

function buildMockAdmin({
  profile,
  follows = [],
  progress,
}: {
  profile: Record<string, unknown> | null;
  follows?: unknown[];
  progress?: Record<string, unknown> | null;
}) {
  return {
    from: vi.fn().mockImplementation((table: string) => {
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
          or: vi.fn().mockResolvedValue({ data: follows, error: null }),
        };
      }
      if (table === 'player_progress') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: progress ?? null, error: null }),
        };
      }
      return {};
    }),
  };
}

const BASE_PROFILE = {
  user_id: 'target-uid',
  username: 'birdlover',
  username_canonical: 'birdlover',
  avatar_palette: 'finch',
  privacy_mode: 'public',
  created_at: '2026-04-01T00:00:00Z',
  is_house_account: false,
};

const BASE_PROGRESS = {
  birds_identified: 42,
  seeds: 100,
  best_streak: 7,
  best_daily_streak: 5,
  best_weekly_placement: 3,
};

beforeEach(() => {
  vi.clearAllMocks();

  // Default: guest viewer (no session)
  mockedServerClient.mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    },
  } as unknown as Awaited<ReturnType<typeof createSupabaseServerClient>>);
});

describe('GET /api/profile', () => {
  it('returns 400 when username param is missing', async () => {
    const request = new NextRequest('http://localhost/api/profile');
    const response = await GET(request);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('missing_username');
  });

  it('returns null profile when username does not exist', async () => {
    mockedAdminClient.mockReturnValue(
      buildMockAdmin({ profile: null }) as unknown as ReturnType<typeof createSupabaseAdminClient>,
    );
    const response = await GET(buildRequest('unknown'));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.profile).toBeNull();
  });

  it('returns public profile payload for a public profile (guest viewer)', async () => {
    mockedAdminClient.mockReturnValue(
      buildMockAdmin({
        profile: BASE_PROFILE,
        progress: BASE_PROGRESS,
      }) as unknown as ReturnType<typeof createSupabaseAdminClient>,
    );

    const response = await GET(buildRequest('birdlover'));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.profile?.kind).toBe('public');
    expect(body.profile?.username).toBe('birdlover');
    expect(body.profile?.progress?.birdsIdentified).toBe(42);
    // Must NOT include privacyMode in public payload
    expect(body.profile?.privacyMode).toBeUndefined();
  });

  it('returns own profile payload when viewer is the owner', async () => {
    // Override server client to return logged-in user matching target
    mockedServerClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'target-uid' } },
          error: null,
        }),
      },
    } as unknown as Awaited<ReturnType<typeof createSupabaseServerClient>>);

    mockedAdminClient.mockReturnValue(
      buildMockAdmin({
        profile: BASE_PROFILE,
        progress: BASE_PROGRESS,
      }) as unknown as ReturnType<typeof createSupabaseAdminClient>,
    );

    const response = await GET(buildRequest('birdlover'));
    const body = await response.json();
    expect(body.profile?.kind).toBe('own');
    expect(body.profile?.privacyMode).toBe('public');
    expect(body.visibility?.reason).toBe('owner');
  });

  it('returns restricted payload for private profile with no follow (guest)', async () => {
    mockedAdminClient.mockReturnValue(
      buildMockAdmin({
        profile: { ...BASE_PROFILE, privacy_mode: 'private' },
      }) as unknown as ReturnType<typeof createSupabaseAdminClient>,
    );

    const response = await GET(buildRequest('birdlover'));
    const body = await response.json();
    expect(body.profile?.kind).toBe('restricted');
    // Must NOT leak full progress on restricted payload
    expect(body.profile?.progress).toBeUndefined();
  });

  it('returns null profile for blocked viewer (no data leakage)', async () => {
    mockedServerClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'viewer-uid' } },
          error: null,
        }),
      },
    } as unknown as Awaited<ReturnType<typeof createSupabaseServerClient>>);

    mockedAdminClient.mockReturnValue(
      buildMockAdmin({
        profile: BASE_PROFILE,
        follows: [
          {
            user_id: 'target-uid',
            related_user_id: 'viewer-uid',
            relationship_type: 'block',
            status: 'approved',
          },
        ],
        progress: BASE_PROGRESS,
      }) as unknown as ReturnType<typeof createSupabaseAdminClient>,
    );

    const response = await GET(buildRequest('birdlover'));
    const body = await response.json();
    expect(body.profile).toBeNull();
    expect(body.visibility?.reason).toBe('blocked');
    // Blocked response must not include any progress data
    expect(body.profile?.progress).toBeUndefined();
  });

  it('falls back when privacy_mode is unavailable in the Supabase schema cache', async () => {
    const profileMaybeSingle = vi.fn()
      .mockResolvedValueOnce({
        data: null,
        error: {
          code: '42703',
          message: 'column profiles.privacy_mode does not exist',
          details: null,
          hint: null,
        },
      })
      .mockResolvedValueOnce({
        data: {
          user_id: 'target-uid',
          username: 'birdlover',
          username_canonical: 'birdlover',
          avatar_palette: 'finch',
          created_at: '2026-04-01T00:00:00Z',
        },
        error: null,
      });

    mockedAdminClient.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: profileMaybeSingle,
          };
        }

        if (table === 'player_progress') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: BASE_PROGRESS, error: null }),
          };
        }

        if (table === 'follows') {
          return {
            select: vi.fn().mockReturnThis(),
            or: vi.fn().mockResolvedValue({ data: [], error: null }),
          };
        }

        return {};
      }),
    } as unknown as ReturnType<typeof createSupabaseAdminClient>);

    const response = await GET(buildRequest('birdlover'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.profile?.kind).toBe('public');
    expect(body.profile?.username).toBe('birdlover');
    expect(body.profile?.progress?.birdsIdentified).toBe(42);
    expect(profileMaybeSingle).toHaveBeenCalledTimes(2);
  });
});
