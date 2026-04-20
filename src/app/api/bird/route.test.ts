import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/server/name-generator', () => ({
  nameGenerator: vi.fn(),
}));

vi.mock('@/lib/server/fake-birds', () => ({
  getRandomFakeBirdEntry: vi.fn(),
}));

vi.mock('@/lib/server/openai', () => ({
  generateRealBirdFact: vi.fn(),
}));

vi.mock('@/lib/server/cdn', () => ({
  isCdnEnabled: vi.fn(),
  getCdnImageUrl: vi.fn(),
  fetchCdnFact: vi.fn(),
}));

vi.mock('@/lib/server/cdn-manifest', () => ({
  hasCdnAssets: vi.fn(),
}));

vi.mock('@/lib/server/utils/percent-of-time', () => ({
  percentOfTime: vi.fn(),
}));

vi.mock('@/lib/server/wikipedia', () => ({
  fetchWikipediaBirdSummary: vi.fn(),
  fetchWikipediaFact: vi.fn(),
  fetchWikipediaImage: vi.fn(),
}));

import { nameGenerator } from '@/lib/server/name-generator';
import { getRandomFakeBirdEntry } from '@/lib/server/fake-birds';
import { generateRealBirdFact } from '@/lib/server/openai';
import { resetRateLimitStore } from '@/lib/server/rate-limiter';
import { percentOfTime } from '@/lib/server/utils/percent-of-time';
import { fetchWikipediaBirdSummary, fetchWikipediaFact, fetchWikipediaImage } from '@/lib/server/wikipedia';
import { fetchCdnFact, getCdnImageUrl, isCdnEnabled } from '@/lib/server/cdn';
import { hasCdnAssets } from '@/lib/server/cdn-manifest';
import { GET, POST } from './route';

describe('bird route', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.stubEnv('CDN_BASE_URL', '');
    vi.mocked(nameGenerator).mockReset();
    vi.mocked(getRandomFakeBirdEntry).mockReset();
    vi.mocked(generateRealBirdFact).mockReset();
    vi.mocked(percentOfTime).mockReset();
    vi.mocked(fetchWikipediaBirdSummary).mockReset();
    vi.mocked(fetchWikipediaFact).mockReset();
    vi.mocked(fetchWikipediaImage).mockReset();
    vi.mocked(isCdnEnabled).mockReturnValue(false);
    vi.mocked(fetchCdnFact).mockResolvedValue(null);
    vi.mocked(getCdnImageUrl).mockImplementation((birdKey, size = 'full', birdType = 'real') => (
      `https://cdn.example.com/birds/${birdType}/${birdKey}/${size === 'thumb' ? 'thumb.webp' : 'image.webp'}`
    ));
    vi.mocked(hasCdnAssets).mockReturnValue(false);
    resetRateLimitStore();
  });

  it('returns a CDN-backed fake bird when fake mode is selected', async () => {
    vi.mocked(percentOfTime).mockReturnValue(true);
    vi.mocked(isCdnEnabled).mockReturnValue(true);
    vi.mocked(getRandomFakeBirdEntry).mockResolvedValue({ birdName: 'Blue Robin', birdKey: 'blue-robin' });
    vi.mocked(fetchCdnFact).mockResolvedValue({
      fact: {
        fact: 'A fabricated but cached fact.',
        summary: 'A fabricated but cached summary.',
        description: 'A fabricated but cached description.',
      },
    });

    const response = await GET(new Request('http://localhost/api/bird') as never);

    await expect(response.json()).resolves.toEqual({
      birdName: 'Blue Robin',
      isReal: false,
      fact: 'A fabricated but cached fact.',
      summary: 'A fabricated but cached summary.',
      imageUrl: 'https://cdn.example.com/birds/fake/blue-robin/image.webp',
      imageThumbUrl: 'https://cdn.example.com/birds/fake/blue-robin/thumb.webp',
      description: 'A fabricated but cached description.',
      contentSource: 'cdn',
      factSource: 'cdn',
    });
  });

  it('returns a real bird with sciName from eBird data', async () => {
    vi.mocked(percentOfTime).mockReturnValue(false);
    vi.mocked(fetchWikipediaBirdSummary).mockResolvedValue({
      title: 'Blue Jay',
      description: 'bird',
      fact: 'A widespread songbird.',
      summary: 'A widespread songbird.',
      imageUrl: 'https://images.example.com/blue-jay.jpg',
      articleUrl: 'https://en.wikipedia.org/wiki/Blue_Jay',
      attribution: {
        artist: 'Example Photographer',
        license: 'CC BY-SA 4.0',
        licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
      },
    });
    vi.mocked(fetchWikipediaFact).mockResolvedValue('A widespread songbird.');
    vi.spyOn(Math, 'random').mockReturnValue(0);
    vi.spyOn(global, 'fetch').mockResolvedValue({
      json: async () => [{ comName: 'Blue Jay', sciName: 'Cyanocitta cristata' }],
    } as Response);

    const response = await GET(new Request('http://localhost/api/bird') as never);

    await expect(response.json()).resolves.toMatchObject({
      birdName: 'Blue Jay',
      isReal: true,
      regionLabel: 'Algeria',
      sciName: 'Cyanocitta cristata',
      fact: 'A widespread songbird.',
      factSource: 'wikipedia',
      summary: 'A widespread songbird.',
      articleUrl: 'https://en.wikipedia.org/wiki/Blue_Jay',
      imageUrl: 'https://images.example.com/blue-jay.jpg',
      contentSource: 'wikipedia',
      attribution: {
        artist: 'Example Photographer',
        license: 'CC BY-SA 4.0',
        licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
      },
    });
  });

  it('routes real fact requests through wikipedia and returns the content', async () => {
    vi.spyOn(Date, 'now').mockReturnValueOnce(0).mockReturnValueOnce(5000);
    vi.mocked(fetchWikipediaFact).mockResolvedValue('Verified bird fact.');

    const response = await POST(
      new Request('http://localhost/api/bird', {
        method: 'POST',
        body: JSON.stringify({
          birdName: 'Blue Jay',
          isReal: true,
          type: 'fact',
          regionLabel: 'Algeria',
          sciName: 'Cyanocitta cristata',
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      }) as never
    );

    expect(fetchWikipediaFact).toHaveBeenCalledWith('Blue Jay', 'Cyanocitta cristata');
    await expect(response.json()).resolves.toEqual({
      type: 'fact',
      content: 'Verified bird fact.',
    });
  });

  it('falls back to a structured OpenAI fact when wikipedia has no fact', async () => {
    vi.spyOn(Date, 'now').mockReturnValueOnce(0).mockReturnValueOnce(5000);
    vi.mocked(fetchWikipediaFact).mockResolvedValue(null);
    vi.mocked(generateRealBirdFact).mockResolvedValue(
      'The Blue Jay can be found in Algeria, and its scientific name is Cyanocitta cristata.'
    );

    const response = await POST(
      new Request('http://localhost/api/bird', {
        method: 'POST',
        body: JSON.stringify({
          birdName: 'Blue Jay',
          isReal: true,
          type: 'fact',
          regionLabel: 'Algeria',
          sciName: 'Cyanocitta cristata',
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      }) as never
    );

    expect(generateRealBirdFact).toHaveBeenCalledWith({
      birdName: 'Blue Jay',
      regionLabel: 'Algeria',
      sciName: 'Cyanocitta cristata',
    });
    await expect(response.json()).resolves.toEqual({
      type: 'fact',
      content: 'The Blue Jay can be found in Algeria, and its scientific name is Cyanocitta cristata.',
    });
  });

  it('falls back to a templated real-bird fact when wikipedia and OpenAI both miss', async () => {
    vi.spyOn(Date, 'now').mockReturnValueOnce(0).mockReturnValueOnce(5000);
    vi.mocked(fetchWikipediaFact).mockResolvedValue(null);
    vi.mocked(generateRealBirdFact).mockResolvedValue(null);

    const response = await POST(
      new Request('http://localhost/api/bird', {
        method: 'POST',
        body: JSON.stringify({
          birdName: 'Blue Jay',
          isReal: true,
          type: 'fact',
          regionLabel: 'Algeria',
          sciName: 'Cyanocitta cristata',
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      }) as never
    );

    await expect(response.json()).resolves.toEqual({
      type: 'fact',
      content: 'In Algeria, the Blue Jay is known by the scientific name Cyanocitta cristata.',
    });
  });

  it('routes fake fact requests through the CDN fact payload', async () => {
    vi.spyOn(Date, 'now').mockReturnValueOnce(0).mockReturnValueOnce(5000);
    vi.mocked(isCdnEnabled).mockReturnValue(true);
    vi.mocked(fetchCdnFact).mockResolvedValue({
      fact: {
        fact: 'A cached fake fact.',
        summary: 'A cached fake summary.',
        description: 'A cached fake description.',
      },
    });

    const response = await POST(
      new Request('http://localhost/api/bird', {
        method: 'POST',
        body: JSON.stringify({
          birdName: 'Blue Ember Finch',
          isReal: false,
          type: 'fact',
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      }) as never
    );

    expect(fetchCdnFact).toHaveBeenCalledWith('blue-ember-finch', 'fake');
    await expect(response.json()).resolves.toEqual({
      type: 'fact',
      content: 'A cached fake fact.',
    });
  });

  it('routes fake image requests through the CDN image URL', async () => {
    vi.spyOn(Date, 'now').mockReturnValueOnce(0).mockReturnValueOnce(7000);
    vi.mocked(isCdnEnabled).mockReturnValue(true);

    const response = await POST(
      new Request('http://localhost/api/bird', {
        method: 'POST',
        body: JSON.stringify({
          birdName: 'Blue Ember Finch',
          isReal: false,
          type: 'image',
          factHintContent: 'Its chest is striped amber and its tail feathers flare like coals.',
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      }) as never
    );

    expect(getCdnImageUrl).toHaveBeenCalledWith('blue-ember-finch', 'full', 'fake');
    await expect(response.json()).resolves.toEqual({
      type: 'image',
      content: 'https://cdn.example.com/birds/fake/blue-ember-finch/image.webp',
    });
  });

  it('returns an error when hint content is unavailable', async () => {
    vi.spyOn(Date, 'now').mockReturnValueOnce(0).mockReturnValueOnce(5000);
    vi.mocked(fetchWikipediaImage).mockResolvedValue(null);

    const response = await POST(
      new Request('http://localhost/api/bird', {
        method: 'POST',
        body: JSON.stringify({
          birdName: 'Blue Jay',
          isReal: true,
          type: 'image',
          regionLabel: 'Algeria',
          sciName: 'Cyanocitta cristata',
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      }) as never
    );

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({ error: 'hint_unavailable' });
  });

  it('rejects invalid hint requests', async () => {
    const response = await POST(
      new Request('http://localhost/api/bird', {
        method: 'POST',
        body: JSON.stringify({ birdName: 'Blue Jay' }),
        headers: {
          'Content-Type': 'application/json',
        },
      }) as never
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'invalid_request' });
  });

  it('returns 429 when the GET rate limit is exceeded', async () => {
    vi.mocked(percentOfTime).mockReturnValue(true);
    vi.mocked(isCdnEnabled).mockReturnValue(true);
    vi.mocked(getRandomFakeBirdEntry).mockResolvedValue({ birdName: 'Blue Robin', birdKey: 'blue-robin' });
    vi.mocked(fetchCdnFact).mockResolvedValue({
      fact: {
        fact: 'A fabricated but cached fact.',
        summary: 'A fabricated but cached summary.',
        description: 'A fabricated but cached description.',
      },
    });

    for (let index = 0; index < 60; index += 1) {
      const response = await GET(
        new Request('http://localhost/api/bird', {
          headers: { 'x-forwarded-for': '1.2.3.4' },
        }) as never
      );
      expect(response.status).toBe(200);
    }

    const response = await GET(
      new Request('http://localhost/api/bird', {
        headers: { 'x-forwarded-for': '1.2.3.4' },
      }) as never
    );

    expect(response.status).toBe(429);
    await expect(response.json()).resolves.toEqual({ error: 'rate_limited' });
  });
});