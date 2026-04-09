import { afterEach, describe, expect, it, vi } from 'vitest';
import fetchHint from './fetch-hint';

describe('fetchHint', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('posts the requested hint payload and returns the response', async () => {
    const responseBody = { hint: 'Bright blue wings.' };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => responseBody,
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      fetchHint('Blue Jay', true, 'fact', 'Cyanocitta cristata', 'Midwest', 'Seen in parks')
    ).resolves.toEqual(responseBody);

    expect(fetchMock).toHaveBeenCalledWith('/api/bird', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        birdName: 'Blue Jay',
        isReal: true,
        type: 'fact',
        sciName: 'Cyanocitta cristata',
        regionLabel: 'Midwest',
        factHintContent: 'Seen in parks',
      }),
    });
  });

  it('omits optional fields when they are not provided', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ hint: 'Short clue.' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await fetchHint('Robin', true, 'sound');

    expect(fetchMock).toHaveBeenCalledWith('/api/bird', expect.objectContaining({
      body: JSON.stringify({
        birdName: 'Robin',
        isReal: true,
        type: 'sound',
      }),
    }));
  });

  it('throws the API error message when present', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'too_many_hints' }),
    }));

    await expect(fetchHint('Robin', true, 'fact')).rejects.toThrow('too_many_hints');
  });

  it('throws hint_unavailable when the response is not ok without an error body', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ hint: 'Nope' }),
    }));

    await expect(fetchHint('Robin', true, 'fact')).rejects.toThrow('hint_unavailable');
  });
});
