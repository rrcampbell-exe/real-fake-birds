import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { generateFakeFact, generateFakeImage, generateRealBirdFact } from './openai';

describe('openai helpers', () => {
  beforeEach(() => {
    vi.stubEnv('OPENAI_API_KEY', 'test-key');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('returns generated fact text when the chat completion succeeds', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.3);
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content:
                'This fictional bird migrates at dawn. It roosts in reeds. It should not keep going.',
            },
          },
        ],
      }),
    } as Response);

    await expect(generateFakeFact('Blue Ember Finch')).resolves.toBe(
      'This fictional bird migrates at dawn. It roosts in reeds.'
    );

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.openai.com/v1/chat/completions',
      expect.objectContaining({
        body: expect.stringContaining('Focus on habitat and range.'),
      })
    );

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.openai.com/v1/chat/completions',
      expect.objectContaining({
        body: expect.stringContaining('Do not default to plumage descriptions'),
      })
    );
  });

  it('biases fake-bird fact prompts away from recently used categories', async () => {
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: 'A concise fake bird fact.',
            },
          },
        ],
      }),
    } as Response);

    vi.spyOn(Math, 'random').mockReturnValue(0);

    await generateFakeFact('Blue Ember Finch');
    await generateFakeFact('Blue Ember Finch');

    const firstCallBody = String(fetchMock.mock.calls[0]?.[1] && 'body' in fetchMock.mock.calls[0][1]
      ? fetchMock.mock.calls[0][1].body
      : '');
    const secondCallBody = String(fetchMock.mock.calls[1]?.[1] && 'body' in fetchMock.mock.calls[1][1]
      ? fetchMock.mock.calls[1][1].body
      : '');

    expect(firstCallBody).toContain('Focus on diet and foraging.');
    expect(secondCallBody).toContain('Focus on breeding and nesting.');
  });

  it('returns an image url when the image generation succeeds', async () => {
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [{ url: 'https://images.example.com/fake-bird.png' }],
      }),
    } as Response);

    await expect(generateFakeImage('Blue Ember Finch')).resolves.toBe(
      'https://images.example.com/fake-bird.png'
    );

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.openai.com/v1/images/generations',
      expect.objectContaining({
        body: expect.stringContaining('style of a Wikipedia bird photograph'),
      })
    );

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.openai.com/v1/images/generations',
      expect.objectContaining({
        body: expect.stringContaining('Do not include cameras, camera straps, lenses, tripods, people, hands'),
      })
    );

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.openai.com/v1/images/generations',
      expect.objectContaining({
        body: expect.stringContaining('Do not include any human-made object anywhere in the frame'),
      })
    );

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.openai.com/v1/images/generations',
      expect.objectContaining({
        body: expect.stringContaining('The image must look like a real camera photo of the bird itself'),
      })
    );

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.openai.com/v1/images/generations',
      expect.objectContaining({
        body: expect.stringContaining('subtle imperfections of a human-taken telephoto wildlife photo'),
      })
    );
  });

  it('includes a previously purchased fact when generating an image', async () => {
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [{ url: 'https://images.example.com/fake-bird.png' }],
      }),
    } as Response);

    await expect(
      generateFakeImage(
        'Blue Ember Finch',
        'Its chest is striped amber and its tail feathers flare like coals.'
      )
    ).resolves.toBe('https://images.example.com/fake-bird.png');

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.openai.com/v1/images/generations',
      expect.objectContaining({
        body: expect.stringContaining('Its chest is striped amber and its tail feathers flare like coals.'),
      })
    );
  });

  it('turns structured real-bird metadata into a short fact', async () => {
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: 'The Blue Jay can be found in Algeria, and its scientific name is Cyanocitta cristata.',
            },
          },
        ],
      }),
    } as Response);

    await expect(
      generateRealBirdFact({
        birdName: 'Blue Jay',
        regionLabel: 'Algeria',
        sciName: 'Cyanocitta cristata',
      })
    ).resolves.toBe('The Blue Jay can be found in Algeria, and its scientific name is Cyanocitta cristata.');

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.openai.com/v1/chat/completions',
      expect.objectContaining({
        body: expect.stringContaining('Do not mention eBird, APIs, databases'),
      })
    );

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.openai.com/v1/chat/completions',
      expect.objectContaining({
        body: expect.stringContaining('Region: Algeria.'),
      })
    );

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.openai.com/v1/chat/completions',
      expect.objectContaining({
        body: expect.stringContaining('Scientific name: Cyanocitta cristata.'),
      })
    );
  });

  it('returns null when the api key is missing', async () => {
    vi.unstubAllEnvs();

    await expect(generateFakeFact('Blue Ember Finch')).resolves.toBeNull();
    await expect(generateRealBirdFact({ birdName: 'Blue Jay' })).resolves.toBeNull();
  });
});