import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { generateFakeFact, generateFakeImage } from './openai';

describe('openai helpers', () => {
  beforeEach(() => {
    vi.stubEnv('OPENAI_API_KEY', 'test-key');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('returns generated fact text when the chat completion succeeds', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
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

  it('returns null when the api key is missing', async () => {
    vi.unstubAllEnvs();

    await expect(generateFakeFact('Blue Ember Finch')).resolves.toBeNull();
  });
});