import { afterEach, describe, expect, it, vi } from 'vitest';
import { validateUsernameAvailability } from './validate-username';

describe('validateUsernameAvailability', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns parsed result on a successful response', async () => {
    const mockResult = {
      isValid: true,
      issues: [],
      normalizedUsername: 'birdwatcher',
      available: true,
    };

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResult),
    }));

    const result = await validateUsernameAvailability('birdwatcher');
    expect(result).toEqual(mockResult);
    expect(fetch).toHaveBeenCalledWith(
      '/api/auth',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ action: 'validate-username', username: 'birdwatcher' }),
      })
    );
  });

  it('throws when the response is not ok', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
    }));

    await expect(validateUsernameAvailability('birdwatcher')).rejects.toThrow(
      'Unable to validate username.'
    );
  });

  it('passes an AbortSignal to fetch when provided', async () => {
    const mockResult = { isValid: true, issues: [], normalizedUsername: 'x', available: null };
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(mockResult) });
    vi.stubGlobal('fetch', fetchSpy);

    const controller = new AbortController();
    await validateUsernameAvailability('x', controller.signal);

    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/auth',
      expect.objectContaining({ signal: controller.signal })
    );
  });
});
