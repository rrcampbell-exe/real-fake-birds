import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/server/name-generator', () => ({
  nameGenerator: vi.fn(),
}));

vi.mock('@/lib/server/openai', () => ({
  generateFakeFact: vi.fn(),
  generateFakeImage: vi.fn(),
  generateRealBirdFact: vi.fn(),
}));

vi.mock('@/lib/server/utils/percent-of-time', () => ({
  percentOfTime: vi.fn(),
}));

vi.mock('@/lib/server/wikipedia', () => ({
  fetchWikipediaFact: vi.fn(),
  fetchWikipediaImage: vi.fn(),
}));

import { nameGenerator } from '@/lib/server/name-generator';
import { generateFakeImage, generateRealBirdFact } from '@/lib/server/openai';
import { resetRateLimitStore } from '@/lib/server/rate-limiter';
import { percentOfTime } from '@/lib/server/utils/percent-of-time';
import { fetchWikipediaFact, fetchWikipediaImage } from '@/lib/server/wikipedia';
import { GET, POST } from './route';

describe('bird route', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    resetRateLimitStore();
  });

  it('returns a fake bird immediately when fake mode is selected', async () => {
    vi.mocked(percentOfTime).mockReturnValue(true);
    vi.mocked(nameGenerator).mockResolvedValue({ birdName: 'Blue Robin', isReal: false });

    const response = await GET(new Request('http://localhost/api/bird') as never);

    await expect(response.json()).resolves.toEqual({ birdName: 'Blue Robin', isReal: false });
  });

  it('returns a real bird with sciName from eBird data', async () => {
    vi.mocked(percentOfTime).mockReturnValue(false);
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

  it('routes fake image requests through the image generator', async () => {
    vi.spyOn(Date, 'now').mockReturnValueOnce(0).mockReturnValueOnce(7000);
    vi.mocked(generateFakeImage).mockResolvedValue('https://images.example.com/fake.png');

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

    expect(generateFakeImage).toHaveBeenCalledWith(
      'Blue Ember Finch',
      'Its chest is striped amber and its tail feathers flare like coals.'
    );
    await expect(response.json()).resolves.toEqual({
      type: 'image',
      content: 'https://images.example.com/fake.png',
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
    vi.mocked(nameGenerator).mockResolvedValue({ birdName: 'Blue Robin', isReal: false });

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