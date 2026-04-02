import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/server/name-generator', () => ({
  nameGenerator: vi.fn(),
}));

vi.mock('@/lib/server/openai', () => ({
  generateFakeFact: vi.fn(),
  generateFakeImage: vi.fn(),
}));

vi.mock('@/lib/server/utils/percent-of-time', () => ({
  percentOfTime: vi.fn(),
}));

vi.mock('@/lib/server/wikipedia', () => ({
  fetchWikipediaFact: vi.fn(),
  fetchWikipediaImage: vi.fn(),
}));

import { nameGenerator } from '@/lib/server/name-generator';
import { generateFakeFact, generateFakeImage } from '@/lib/server/openai';
import { percentOfTime } from '@/lib/server/utils/percent-of-time';
import { fetchWikipediaFact, fetchWikipediaImage } from '@/lib/server/wikipedia';
import { GET, POST } from './route';

describe('bird route', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns a fake bird immediately when fake mode is selected', async () => {
    vi.mocked(percentOfTime).mockReturnValue(true);
    vi.mocked(nameGenerator).mockResolvedValue({ birdName: 'Blue Robin', isReal: false });

    const response = await GET();

    await expect(response.json()).resolves.toEqual({ birdName: 'Blue Robin', isReal: false });
  });

  it('returns a real bird with sciName from eBird data', async () => {
    vi.mocked(percentOfTime).mockReturnValue(false);
    vi.spyOn(Math, 'random').mockReturnValue(0);
    vi.spyOn(global, 'fetch').mockResolvedValue({
      json: async () => [{ comName: 'Blue Jay', sciName: 'Cyanocitta cristata' }],
    } as Response);

    const response = await GET();

    await expect(response.json()).resolves.toMatchObject({
      birdName: 'Blue Jay',
      isReal: true,
      sciName: 'Cyanocitta cristata',
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
});