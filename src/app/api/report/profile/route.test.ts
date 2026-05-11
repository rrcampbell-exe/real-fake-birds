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

import { NextRequest } from 'next/server';
import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase/server';
import { POST } from './route';

const mockedAdminClient = vi.mocked(createSupabaseAdminClient);
const mockedServerClient = vi.mocked(createSupabaseServerClient);

function buildRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/report/profile', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

function buildAdmin({
  targetProfile = { user_id: 'target-uid' },
  insertError = null,
}: {
  targetProfile?: { user_id: string } | null;
  insertError?: unknown;
} = {}) {
  const reportsTable = {
    insert: vi.fn().mockResolvedValue({ error: insertError }),
  };

  return {
    from: vi.fn((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          ilike: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: targetProfile, error: null }),
        };
      }

      if (table === 'profile_reports') {
        return reportsTable;
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

describe('POST /api/report/profile', () => {
  it('requires authentication', async () => {
    mockedServerClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
    } as never);
    mockedAdminClient.mockReturnValue(buildAdmin() as never);

    const response = await POST(buildRequest({ targetUsername: 'target', reason: 'spam' }));
    expect(response.status).toBe(401);
  });

  it('validates the request body', async () => {
    mockedAdminClient.mockReturnValue(buildAdmin() as never);

    const response = await POST(buildRequest({ targetUsername: 'target', reason: 'nope' }));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ error: 'invalid_request_body' });
  });

  it('returns 404 when the target does not exist', async () => {
    mockedAdminClient.mockReturnValue(buildAdmin({ targetProfile: null }) as never);

    const response = await POST(buildRequest({ targetUsername: 'target', reason: 'spam' }));
    expect(response.status).toBe(404);
  });

  it('stores a structured report and returns a minimal safe response', async () => {
    const admin = buildAdmin();
    mockedAdminClient.mockReturnValue(admin as never);

    const response = await POST(
      buildRequest({
        targetUsername: 'target',
        reason: 'harassment',
        note: '  abusive profile text  ',
      }),
    );

    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toEqual({ ok: true });
    const reportsTable = admin.from('profile_reports');
    expect(reportsTable.insert).toHaveBeenCalledWith([
      expect.objectContaining({
        reporter_user_id: 'viewer-uid',
        reported_user_id: 'target-uid',
        reason: 'harassment',
        note: 'abusive profile text',
      }),
    ]);
  });
});
