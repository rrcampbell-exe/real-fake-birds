import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { isNativePlatformMock, getSessionMock } = vi.hoisted(() => ({
  isNativePlatformMock: vi.fn(),
  getSessionMock: vi.fn(),
}));

vi.mock('@/lib/native/platform', () => ({
  isNativePlatform: isNativePlatformMock,
}));

vi.mock('@/lib/supabase/client', () => ({
  getSupabaseBrowserClient: () => ({
    auth: {
      getSession: getSessionMock,
    },
  }),
}));

import { apiFetch } from './client';

describe('apiFetch', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockResolvedValue(new Response('{}'));
    getSessionMock.mockResolvedValue({ data: { session: null }, error: null });
    vi.stubGlobal('__RFB_NATIVE_API_BASE_URL__', 'https://www.realfakebirds.app');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('keeps web API requests same-origin', async () => {
    isNativePlatformMock.mockReturnValue(false);
    const init = { method: 'POST', body: '{}' };

    await apiFetch('/api/auth', init);

    expect(fetchMock).toHaveBeenCalledWith('/api/auth', init);
    expect(getSessionMock).not.toHaveBeenCalled();
  });

  it('targets the hosted API and attaches a native access token', async () => {
    isNativePlatformMock.mockReturnValue(true);
    getSessionMock.mockResolvedValue({
      data: { session: { access_token: 'native-access-token' } },
      error: null,
    });

    await apiFetch('/api/profile?username=birder', { method: 'GET' });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://www.realfakebirds.app/api/profile?username=birder');
    expect(new Headers(init.headers).get('Authorization')).toBe('Bearer native-access-token');
    expect(init.credentials).toBe('omit');
  });

  it('fails explicitly when the native API origin is not configured', async () => {
    isNativePlatformMock.mockReturnValue(true);
    vi.stubGlobal('__RFB_NATIVE_API_BASE_URL__', undefined);

    await expect(apiFetch('/api/bird')).rejects.toThrow('The native API base URL is not configured.');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects non-API paths', async () => {
    await expect(apiFetch('/settings')).rejects.toThrow('Expected an API path');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
