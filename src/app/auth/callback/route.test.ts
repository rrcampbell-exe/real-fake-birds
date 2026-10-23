import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseAdminClient: vi.fn(),
  createSupabaseServerClient: vi.fn(),
}));

vi.mock('@/lib/auth/account-profile', () => ({
  ensureAccountProfileFromUserMetadata: vi.fn().mockResolvedValue({ status: 'created', profile: null }),
}));

import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase/server';
import { GET } from './route';

const mockedCreateSupabaseAdminClient = vi.mocked(createSupabaseAdminClient);
const mockedCreateSupabaseServerClient = vi.mocked(createSupabaseServerClient);

describe('auth callback route', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockedCreateSupabaseAdminClient.mockReturnValue({} as never);
  });

  it('redirects back to settings when the provider callback is missing a code', async () => {
    const response = await GET(
      new Request('http://localhost/auth/callback?next=/settings') as never
    );

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('http://localhost/settings?authError=missing_code');
  });

  it('exchanges the auth code and redirects to the requested in-app path', async () => {
    const exchangeCodeForSession = vi.fn().mockResolvedValue({ error: null });
    const getUser = vi.fn().mockResolvedValue({ data: { user: null } });
    mockedCreateSupabaseServerClient.mockResolvedValue({
      auth: {
        exchangeCodeForSession,
        getUser,
      },
    } as never);

    const response = await GET(
      new Request('http://localhost/auth/callback?code=abc123&next=/daily') as never
    );

    expect(exchangeCodeForSession).toHaveBeenCalledWith('abc123');
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('http://localhost/daily');
  });

  it('verifies signup tokens and redirects safely', async () => {
    const verifyOtp = vi.fn().mockResolvedValue({ error: null });
    const getUser = vi.fn().mockResolvedValue({ data: { user: null } });
    mockedCreateSupabaseServerClient.mockResolvedValue({
      auth: {
        verifyOtp,
        getUser,
      },
    } as never);

    const response = await GET(
      new Request('http://localhost/auth/callback?token_hash=token123&type=signup&next=/settings') as never
    );

    expect(verifyOtp).toHaveBeenCalledWith({ token_hash: 'token123', type: 'signup' });
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('http://localhost/settings');
  });

  it('sends recovery callbacks to the password reset page by default', async () => {
    const verifyOtp = vi.fn().mockResolvedValue({ error: null });
    const getUser = vi.fn().mockResolvedValue({ data: { user: null } });
    mockedCreateSupabaseServerClient.mockResolvedValue({
      auth: {
        verifyOtp,
        getUser,
      },
    } as never);

    const response = await GET(
      new Request('http://localhost/auth/callback?token_hash=token123&type=recovery&next=%2Fsettings') as never
    );

    expect(verifyOtp).toHaveBeenCalledWith({ token_hash: 'token123', type: 'recovery' });
    expect(response.headers.get('location')).toBe('http://localhost/auth/reset-password');
  });

  it('ignores unsafe external redirect targets', async () => {
    const response = await GET(
      new Request('http://localhost/auth/callback?next=https://evil.example.com') as never
    );

    expect(response.headers.get('location')).toBe('http://localhost/settings?authError=missing_code');
  });
});