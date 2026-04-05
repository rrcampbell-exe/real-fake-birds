import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
}));

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { GET } from './route';

const mockedCreateSupabaseServerClient = vi.mocked(createSupabaseServerClient);

describe('auth callback route', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
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
    mockedCreateSupabaseServerClient.mockResolvedValue({
      auth: {
        exchangeCodeForSession,
      },
    } as never);

    const response = await GET(
      new Request('http://localhost/auth/callback?code=abc123&next=/daily') as never
    );

    expect(exchangeCodeForSession).toHaveBeenCalledWith('abc123');
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('http://localhost/daily');
  });

  it('ignores unsafe external redirect targets', async () => {
    const response = await GET(
      new Request('http://localhost/auth/callback?next=https://evil.example.com') as never
    );

    expect(response.headers.get('location')).toBe('http://localhost/settings?authError=missing_code');
  });
});