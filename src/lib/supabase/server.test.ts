import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(),
  headers: vi.fn(),
}));

import { createServerClient } from '@supabase/ssr';
import { cookies, headers } from 'next/headers';
import { createSupabaseServerClient } from './server';

const mockedCreateServerClient = vi.mocked(createServerClient);
const mockedCookies = vi.mocked(cookies);
const mockedHeaders = vi.mocked(headers);

describe('createSupabaseServerClient', () => {
  const cookieStore = {
    getAll: vi.fn(() => [{ name: 'session', value: 'cookie-session' }]),
    set: vi.fn(),
  };

  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon-key');
    mockedCookies.mockResolvedValue(cookieStore as never);
    mockedHeaders.mockResolvedValue(new Headers() as never);
    mockedCreateServerClient.mockReturnValue({} as never);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('sets a valid bearer token globally while preserving cookie session adapters', async () => {
    mockedHeaders.mockResolvedValue(
      new Headers({ Authorization: 'Bearer header.payload.signature' }) as never,
    );

    await createSupabaseServerClient();

    const options = mockedCreateServerClient.mock.calls[0][2];
    expect(options.global?.headers).toEqual({
      Authorization: 'Bearer header.payload.signature',
    });
    expect(options.cookies?.getAll()).toEqual([{ name: 'session', value: 'cookie-session' }]);
    options.cookies?.setAll?.(
      [{ name: 'session', value: 'updated-session', options: {} }],
      {},
    );
    expect(cookieStore.set).toHaveBeenCalledWith('session', 'updated-session', {});
  });

  it('preserves cookie-only sessions when no bearer token is supplied', async () => {
    await createSupabaseServerClient();

    const options = mockedCreateServerClient.mock.calls[0][2];
    expect(options.global).toBeUndefined();
    expect(options.cookies?.getAll()).toEqual([{ name: 'session', value: 'cookie-session' }]);
  });

  it('does not configure malformed bearer values as authorization', async () => {
    mockedHeaders.mockResolvedValue(
      new Headers({ Authorization: 'Bearer not-a-jwt' }) as never,
    );

    await createSupabaseServerClient();

    expect(mockedCreateServerClient.mock.calls[0][2].global).toBeUndefined();
  });
});
