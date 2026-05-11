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
  return new NextRequest('http://localhost/api/block', {
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
  const followsChain = {
    error: null,
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    or: vi.fn().mockResolvedValue({ error: null }),
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

      if (table === 'follows') {
        return followsChain;
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

describe('POST /api/block', () => {
  it('returns 401 when unauthenticated', async () => {
    mockedServerClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
    } as never);

    mockedAdminClient.mockReturnValue(buildAdmin() as never);

    const response = await POST(buildRequest({ action: 'block', targetUsername: 'target' }));
    expect(response.status).toBe(401);
  });

  it('returns 400 for invalid request bodies', async () => {
    mockedAdminClient.mockReturnValue(buildAdmin() as never);

    const response = await POST(buildRequest({ action: 'block' }));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ error: 'invalid_request_body' });
  });

  it('creates a block relationship by username', async () => {
    const admin = buildAdmin();
    mockedAdminClient.mockReturnValue(admin as never);

    const response = await POST(buildRequest({ action: 'block', targetUsername: 'target' }));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, relationship: 'blocked' });

    const followsChain = admin.from('follows');
    expect(followsChain.insert).toHaveBeenCalledWith([
      expect.objectContaining({
        user_id: 'viewer-uid',
        related_user_id: 'target-uid',
        relationship_type: 'block',
        status: 'approved',
      }),
    ]);
  });

  it('treats duplicate blocks as idempotent success', async () => {
    mockedAdminClient.mockReturnValue(
      buildAdmin({ insertError: { code: '23505' } }) as never,
    );

    const response = await POST(buildRequest({ action: 'block', targetUsername: 'target' }));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, relationship: 'blocked' });
  });

  it('removes a block relationship by user id', async () => {
    mockedAdminClient.mockReturnValue(buildAdmin() as never);

    const response = await POST(buildRequest({ action: 'unblock', targetUserId: 'target-uid' }));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, relationship: 'none' });
  });
});
