import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchWikipediaFact, fetchWikipediaImage } from './wikipedia';

describe('wikipedia', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns a fact from the common-name summary response', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ extract: 'A real bird fact. Another sentence. Third sentence.' }),
    } as Response);

    await expect(fetchWikipediaFact('Blue Jay')).resolves.toBe(
      'A real bird fact. Another sentence.'
    );
  });

  it('falls back to sciName when the common-name lookup has no usable content', async () => {
    vi.spyOn(global, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ extract: 'Fallback fact.' }),
      } as Response);

    await expect(fetchWikipediaFact('Rare Bird', 'Aves rarus')).resolves.toBe('Fallback fact.');
  });

  it('falls back to a wikipedia search result when direct titles fail', async () => {
    vi.spyOn(global, 'fetch')
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({}),
      } as Response)
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({}),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          query: {
            search: [{ title: 'Blue Jay' }],
          },
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ extract: 'Recovered by search. Another sentence.' }),
      } as Response);

    await expect(fetchWikipediaFact('Blue Jay bird', 'Cyanocitta cristata')).resolves.toBe(
      'Recovered by search. Another sentence.'
    );
  });

  it('returns the best available image url', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        originalimage: { source: 'https://images.example.com/bird.jpg' },
      }),
    } as Response);

    await expect(fetchWikipediaImage('Blue Jay')).resolves.toBe(
      'https://images.example.com/bird.jpg'
    );
  });

  it('returns null when no summary can be found', async () => {
    vi.spyOn(global, 'fetch')
      .mockResolvedValueOnce({ ok: false, json: async () => ({}) } as Response)
      .mockResolvedValueOnce({ ok: false, json: async () => ({}) } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ query: { search: [] } }) } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ query: { search: [] } }) } as Response);

    await expect(fetchWikipediaFact('Missing Bird')).resolves.toBeNull();
  });
});