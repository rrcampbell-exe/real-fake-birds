import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Session } from '@supabase/supabase-js';

vi.mock('@/lib/supabase/client', () => ({
  getSupabaseBrowserClient: vi.fn(),
}));

vi.mock('@/lib/native/platform', () => ({
  isNativePlatform: vi.fn(() => false),
}));

import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { ensureBrowserSession, recoverBrowserSessionFromUnauthorized } from './browser-session';

const mockedGetSupabaseBrowserClient = vi.mocked(getSupabaseBrowserClient);

function createSession(expiresAtOffsetMs = 5 * 60_000): Session {
  return {
    access_token: 'access-token',
    refresh_token: 'refresh-token',
    token_type: 'bearer',
    expires_in: Math.floor(expiresAtOffsetMs / 1000),
    expires_at: Math.floor((Date.now() + expiresAtOffsetMs) / 1000),
    user: {
      id: 'user-1',
      app_metadata: {},
      user_metadata: {},
      aud: 'authenticated',
      created_at: '2026-05-11T00:00:00.000Z',
      email: 'bird@example.com',
    },
  } as Session;
}

function createSupabaseMock(options?: {
  session?: Session | null;
  refreshedSession?: Session | null;
}) {
  return {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: options?.session ?? null },
        error: null,
      }),
      refreshSession: vi.fn().mockResolvedValue({
        data: { session: options?.refreshedSession ?? options?.session ?? null },
        error: null,
      }),
    },
  };
}

describe('browser-session', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('reuses a healthy browser session without forcing refresh', async () => {
    const session = createSession();
    const supabase = createSupabaseMock({ session });
    mockedGetSupabaseBrowserClient.mockReturnValue(supabase as never);

    const result = await ensureBrowserSession({ reason: 'test' });

    expect(result).toEqual({
      hasSession: true,
      refreshed: false,
      userId: 'user-1',
    });
    expect(supabase.auth.refreshSession).not.toHaveBeenCalled();
  });

  it('refreshes a near-expiry browser session', async () => {
    const session = createSession(15_000);
    const refreshedSession = createSession(10 * 60_000);
    const supabase = createSupabaseMock({ session, refreshedSession });
    mockedGetSupabaseBrowserClient.mockReturnValue(supabase as never);

    const result = await ensureBrowserSession({ reason: 'test' });

    expect(result).toEqual({
      hasSession: true,
      refreshed: true,
      userId: 'user-1',
    });
    expect(supabase.auth.refreshSession).toHaveBeenCalledTimes(1);
  });

  it('forces a refresh retry after an unauthorized server response', async () => {
    const session = createSession();
    const refreshedSession = createSession(10 * 60_000);
    const supabase = createSupabaseMock({ session, refreshedSession });
    mockedGetSupabaseBrowserClient.mockReturnValue(supabase as never);

    const recovered = await recoverBrowserSessionFromUnauthorized('account-state');

    expect(recovered).toBe(true);
    expect(supabase.auth.getSession).toHaveBeenCalledTimes(2);
    expect(supabase.auth.refreshSession).toHaveBeenCalledTimes(1);
  });

  it('does not report recovery when no local session exists', async () => {
    const supabase = createSupabaseMock({ session: null, refreshedSession: null });
    mockedGetSupabaseBrowserClient.mockReturnValue(supabase as never);

    const recovered = await recoverBrowserSessionFromUnauthorized('account-state');

    expect(recovered).toBe(false);
    expect(supabase.auth.refreshSession).not.toHaveBeenCalled();
  });
});
