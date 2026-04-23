import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabase/env', () => ({
  hasSupabaseEnv: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseAdminClient: vi.fn(),
  createSupabaseAuthClient: vi.fn(),
  createSupabaseServerClient: vi.fn(),
}));

vi.mock('@/lib/server/rate-limiter', () => ({
  consumeRateLimit: vi.fn(),
  getRateLimitKey: vi.fn((ip: string | null, scope: string) => `${ip ?? 'unknown'}:${scope}`),
}));

import { hasSupabaseEnv } from '@/lib/supabase/env';
import { createSupabaseAdminClient, createSupabaseAuthClient, createSupabaseServerClient } from '@/lib/supabase/server';
import { consumeRateLimit } from '@/lib/server/rate-limiter';
import { DELETE } from './route';

const mockedHasSupabaseEnv = vi.mocked(hasSupabaseEnv);
const mockedCreateSupabaseAdminClient = vi.mocked(createSupabaseAdminClient);
const mockedCreateSupabaseAuthClient = vi.mocked(createSupabaseAuthClient);
const mockedCreateSupabaseServerClient = vi.mocked(createSupabaseServerClient);
const mockedConsumeRateLimit = vi.mocked(consumeRateLimit);

function makeRequest(headers: Record<string, string> = {}, body?: object): Request {
  return new Request('http://localhost/api/auth/account', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  }) as never;
}

function mockAuthenticatedUser(userId = 'user-1') {
  mockedCreateSupabaseServerClient.mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: userId, email: 'bird@example.com' } },
        error: null,
      }),
    },
  } as never);
}

function mockSuccessfulPasswordVerification() {
  mockedCreateSupabaseAuthClient.mockReturnValue({
    auth: {
      signInWithPassword: vi.fn().mockResolvedValue({ error: null }),
    },
  } as never);
}

describe('DELETE /api/auth/account', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockedHasSupabaseEnv.mockReturnValue(false);
  });

  it('returns 503 when Supabase is not configured', async () => {
    const response = await DELETE(makeRequest() as never);
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({ error: 'service_unavailable' });
  });

  it('returns 401 when not authenticated', async () => {
    mockedHasSupabaseEnv.mockReturnValue(true);
    mockedCreateSupabaseServerClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
    } as never);

    const response = await DELETE(makeRequest() as never);
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({ error: 'not_authenticated' });
  });

  it('returns 400 when password is missing', async () => {
    mockedHasSupabaseEnv.mockReturnValue(true);
    mockAuthenticatedUser();

    const response = await DELETE(makeRequest() as never);
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ error: 'password_required' });
  });

  it('returns 401 when password is wrong', async () => {
    mockedHasSupabaseEnv.mockReturnValue(true);
    mockAuthenticatedUser();
    mockedCreateSupabaseAuthClient.mockReturnValue({
      auth: {
        signInWithPassword: vi.fn().mockResolvedValue({ error: { message: 'Invalid credentials' } }),
      },
    } as never);

    const response = await DELETE(makeRequest({}, { password: 'wrongpass' }) as never);
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({ error: 'wrong_password' });
  });

  it('returns 429 when rate limited', async () => {
    mockedHasSupabaseEnv.mockReturnValue(true);
    mockAuthenticatedUser();
    mockSuccessfulPasswordVerification();
    mockedConsumeRateLimit.mockResolvedValue({ allowed: false, remaining: 0 });

    const response = await DELETE(makeRequest({}, { password: 'correct-pw' }) as never);
    expect(response.status).toBe(429);
    await expect(response.json()).resolves.toMatchObject({ error: 'rate_limited' });
  });

  it('deletes the user and returns success', async () => {
    mockedHasSupabaseEnv.mockReturnValue(true);
    mockAuthenticatedUser('user-42');
    mockSuccessfulPasswordVerification();
    mockedConsumeRateLimit.mockResolvedValue({ allowed: true, remaining: 2 });

    const mockDeleteUser = vi.fn().mockResolvedValue({ error: null });
    mockedCreateSupabaseAdminClient.mockReturnValue({
      auth: {
        admin: {
          deleteUser: mockDeleteUser,
        },
      },
    } as never);

    const response = await DELETE(makeRequest({}, { password: 'correct-pw' }) as never);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ success: true });
    expect(mockDeleteUser).toHaveBeenCalledWith('user-42');
  });

  it('returns 500 when admin deletion fails', async () => {
    mockedHasSupabaseEnv.mockReturnValue(true);
    mockAuthenticatedUser();
    mockSuccessfulPasswordVerification();
    mockedConsumeRateLimit.mockResolvedValue({ allowed: true, remaining: 2 });

    mockedCreateSupabaseAdminClient.mockReturnValue({
      auth: {
        admin: {
          deleteUser: vi.fn().mockResolvedValue({ error: { message: 'Not found' } }),
        },
      },
    } as never);

    const response = await DELETE(makeRequest({}, { password: 'correct-pw' }) as never);
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toMatchObject({ error: 'deletion_failed' });
  });
});
