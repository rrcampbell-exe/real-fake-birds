import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchWikipediaBirdSummary, fetchWikipediaFact, fetchWikipediaImage } from './wikipedia';

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
        thumbnail: { source: 'https://images.example.com/bird-thumb.jpg' },
        originalimage: { source: 'https://images.example.com/bird.jpg' },
      }),
    } as Response);

    await expect(fetchWikipediaImage('Blue Jay')).resolves.toBe(
      'https://images.example.com/bird-thumb.jpg'
    );
  });

  it('returns consolidated summary data from the summary endpoint', async () => {
    const fetchMock = vi.spyOn(global, 'fetch')
      .mockImplementation(async (input) => {
        const url = String(input);

        if (url.includes('/api/rest_v1/page/summary/Blue%20Jay')) {
          return {
            ok: true,
            json: async () => ({
              title: 'Blue Jay',
              description: 'bird species',
              extract: 'A bright blue corvid. It is common in eastern North America. A third sentence.',
              thumbnail: {
                source: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/12/Blue_Jay.jpg/320px-Blue_Jay.jpg',
              },
              originalimage: {
                source: 'https://upload.wikimedia.org/wikipedia/commons/1/12/Blue_Jay.jpg',
              },
              content_urls: {
                desktop: {
                  page: 'https://en.wikipedia.org/wiki/Blue_Jay',
                },
              },
            }),
          } as Response;
        }

        if (url.includes('titles=File:Blue_Jay.jpg')) {
          return {
            ok: true,
            json: async () => ({
              query: {
                pages: {
                  '1': {
                    imageinfo: [
                      {
                        extmetadata: {
                          Artist: { value: 'Example Photographer' },
                          LicenseShortName: { value: 'CC BY-SA 4.0' },
                          LicenseUrl: { value: 'https://creativecommons.org/licenses/by-sa/4.0' },
                        },
                      },
                    ],
                  },
                },
              },
            }),
          } as Response;
        }

        return {
          ok: false,
          json: async () => ({}),
        } as Response;
      });

    await expect(fetchWikipediaBirdSummary('Blue Jay')).resolves.toEqual({
      title: 'Blue Jay',
      description: 'bird species',
      fact: 'A bright blue corvid. It is common in eastern North America.',
      summary: 'A bright blue corvid. It is common in eastern North America. A third sentence.',
      imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/12/Blue_Jay.jpg/320px-Blue_Jay.jpg',
      articleUrl: 'https://en.wikipedia.org/wiki/Blue_Jay',
      attribution: {
        artist: 'Example Photographer',
        license: 'CC BY-SA 4.0',
        licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
      },
    });

    expect(String(fetchMock.mock.calls[1]?.[0])).toContain('titles=File:Blue_Jay.jpg');
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