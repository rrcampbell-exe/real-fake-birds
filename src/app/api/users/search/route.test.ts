import { vi, describe, it, expect, beforeEach } from 'vitest';

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
import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase/server';
import { GET } from './route';

const mockedAdminClient = vi.mocked(createSupabaseAdminClient);
const mockedServerClient = vi.mocked(createSupabaseServerClient);

function buildRequest(q: string): NextRequest {
  return new NextRequest(`http://localhost/api/users/search?q=${encodeURIComponent(q)}`);
}

function buildMockAdmin(ilikeSpy?: ReturnType<typeof vi.fn>) {
  const ilike = ilikeSpy ?? vi.fn().mockReturnThis();
  return {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      ilike,
      neq: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
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
  } as unknown as Awaited<ReturnType<typeof createSupabaseServerClient>>);
});

describe('GET /api/users/search', () => {
  it('returns 401 when unauthenticated', async () => {
    mockedServerClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
    } as unknown as Awaited<ReturnType<typeof createSupabaseServerClient>>);

    mockedAdminClient.mockReturnValue(buildMockAdmin() as unknown as ReturnType<typeof createSupabaseAdminClient>);

    const response = await GET(buildRequest('bird'));
    expect(response.status).toBe(401);
  });

  it('returns empty array for blank query', async () => {
    mockedAdminClient.mockReturnValue(buildMockAdmin() as unknown as ReturnType<typeof createSupabaseAdminClient>);

    const response = await GET(buildRequest('   '));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.users).toEqual([]);
  });

  it('returns empty array for query that normalizes to empty (only @)', async () => {
    mockedAdminClient.mockReturnValue(buildMockAdmin() as unknown as ReturnType<typeof createSupabaseAdminClient>);

    const response = await GET(buildRequest('@@@'));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.users).toEqual([]);
  });

  it('passes a literal-substring pattern (no bare wildcards) to ilike for a plain query', async () => {
    const ilikeSpy = vi.fn().mockReturnThis();
    mockedAdminClient.mockReturnValue(buildMockAdmin(ilikeSpy) as unknown as ReturnType<typeof createSupabaseAdminClient>);

    await GET(buildRequest('bird'));

    expect(ilikeSpy).toHaveBeenCalledWith('username_canonical', '%bird%');
  });

  it('escapes % in user input so it is not treated as a wildcard', async () => {
    const ilikeSpy = vi.fn().mockReturnThis();
    mockedAdminClient.mockReturnValue(buildMockAdmin(ilikeSpy) as unknown as ReturnType<typeof createSupabaseAdminClient>);

    await GET(buildRequest('%'));

    expect(ilikeSpy).toHaveBeenCalledWith('username_canonical', '%\\%%');
  });

  it('escapes _ in user input so it is not treated as a single-char wildcard', async () => {
    const ilikeSpy = vi.fn().mockReturnThis();
    mockedAdminClient.mockReturnValue(buildMockAdmin(ilikeSpy) as unknown as ReturnType<typeof createSupabaseAdminClient>);

    await GET(buildRequest('_'));

    expect(ilikeSpy).toHaveBeenCalledWith('username_canonical', '%\\_%');
  });

  it('escapes backslash in user input', async () => {
    const ilikeSpy = vi.fn().mockReturnThis();
    mockedAdminClient.mockReturnValue(buildMockAdmin(ilikeSpy) as unknown as ReturnType<typeof createSupabaseAdminClient>);

    await GET(buildRequest('\\'));

    expect(ilikeSpy).toHaveBeenCalledWith('username_canonical', '%\\\\%');
  });

  it('strips leading @ before escaping', async () => {
    const ilikeSpy = vi.fn().mockReturnThis();
    mockedAdminClient.mockReturnValue(buildMockAdmin(ilikeSpy) as unknown as ReturnType<typeof createSupabaseAdminClient>);

    await GET(buildRequest('@robin'));

    expect(ilikeSpy).toHaveBeenCalledWith('username_canonical', '%robin%');
  });
});
