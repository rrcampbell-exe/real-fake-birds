import { afterEach, describe, expect, it, vi } from 'vitest';

const { trackMock } = vi.hoisted(() => ({
  trackMock: vi.fn(),
}));

vi.mock('@/lib/analytics', () => ({
  track: trackMock,
}));

import fetchData from './fetch-data';

describe('fetchData', () => {
  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    trackMock.mockReset();
  });

  it('uses cached bird data when available', async () => {
    vi.useFakeTimers();
    localStorage.setItem(
      'birdData:classic',
      JSON.stringify({ birdName: 'Blue Finch', isReal: true, regionLabel: 'Algeria', sciName: 'Fringilla caerulea' })
    );

    const setIsReal = vi.fn();
    const setIsLoading = vi.fn();
    const setBirdData = vi.fn();
    const setSciName = vi.fn();
    const setRegionLabel = vi.fn();
    const setFact = vi.fn();
    const setSummary = vi.fn();
    const setArticleUrl = vi.fn();
    const setImageUrl = vi.fn();
    const setDescription = vi.fn();
    const setIsError = vi.fn();

    const fetchPromise = fetchData(
      setIsReal,
      setIsLoading,
      setBirdData,
      setSciName,
      setRegionLabel,
      setFact,
      setSummary,
      setArticleUrl,
      setImageUrl,
      setDescription,
      setIsError
    );
    await vi.runAllTimersAsync();
    await fetchPromise;

    expect(setIsReal).toHaveBeenCalledWith(true);
    expect(setSciName).toHaveBeenCalledWith('Fringilla caerulea');
    expect(setRegionLabel).toHaveBeenCalledWith('Algeria');
    expect(setFact).toHaveBeenCalledWith(null);
    expect(setSummary).toHaveBeenCalledWith(null);
    expect(setArticleUrl).toHaveBeenCalledWith(null);
    expect(setImageUrl).toHaveBeenCalledWith(null);
    expect(setDescription).toHaveBeenCalledWith(null);
    expect(setIsLoading).toHaveBeenCalledWith(false);
    expect(setBirdData).toHaveBeenCalledWith('Blue Finch');
    expect(setIsError).not.toHaveBeenCalled();
    expect(trackMock).not.toHaveBeenCalled();
  });

  it('fetches and caches fresh bird data', async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue({
        birdName: 'Copper Heron',
        isReal: false,
        fact: 'Invented fact should still cache if present.',
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const setIsReal = vi.fn();
    const setIsLoading = vi.fn();
    const setBirdData = vi.fn();
    const setSciName = vi.fn();
    const setRegionLabel = vi.fn();
    const setFact = vi.fn();
    const setSummary = vi.fn();
    const setArticleUrl = vi.fn();
    const setImageUrl = vi.fn();
    const setDescription = vi.fn();
    const setIsError = vi.fn();

    const fetchPromise = fetchData(
      setIsReal,
      setIsLoading,
      setBirdData,
      setSciName,
      setRegionLabel,
      setFact,
      setSummary,
      setArticleUrl,
      setImageUrl,
      setDescription,
      setIsError
    );
    await vi.runAllTimersAsync();
    await fetchPromise;

    expect(fetchMock).toHaveBeenCalledWith('/api/bird', { signal: undefined });
    expect(localStorage.getItem('birdData:classic')).toBe(
      JSON.stringify({
        birdName: 'Copper Heron',
        isReal: false,
        regionLabel: undefined,
        sciName: undefined,
        fact: 'Invented fact should still cache if present.',
          summary: undefined,
          articleUrl: undefined,
          imageUrl: undefined,
          description: undefined,
      })
    );
    expect(setIsReal).toHaveBeenCalledWith(false);
    expect(setSciName).toHaveBeenCalledWith(null);
    expect(setRegionLabel).toHaveBeenCalledWith(null);
    expect(setFact).toHaveBeenCalledWith('Invented fact should still cache if present.');
    expect(setSummary).toHaveBeenCalledWith(null);
    expect(setArticleUrl).toHaveBeenCalledWith(null);
    expect(setImageUrl).toHaveBeenCalledWith(null);
    expect(setDescription).toHaveBeenCalledWith(null);
    expect(setIsLoading).toHaveBeenCalledWith(false);
    expect(setBirdData).toHaveBeenCalledWith('Copper Heron');
    expect(setIsError).not.toHaveBeenCalled();
    expect(trackMock).not.toHaveBeenCalled();
  });

  it('tracks a successful fact load for real birds separately from image loading', async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue({
        birdName: 'Blue Jay',
        isReal: true,
        fact: 'A bright corvid with loud calls.',
        factSource: 'cdn',
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const fetchPromise = fetchData(
      vi.fn(),
      vi.fn(),
      vi.fn(),
      vi.fn(),
      vi.fn(),
      vi.fn(),
      vi.fn(),
      vi.fn(),
      vi.fn(),
      vi.fn(),
      vi.fn(),
    );
    await vi.runAllTimersAsync();
    await fetchPromise;

    expect(trackMock).toHaveBeenCalledWith(
      'bird_content_loaded',
      expect.objectContaining({
        source: 'cdn',
        content_type: 'fact',
        load_stage: 'api',
        outcome: 'success',
      })
    );
  });

  it('tracks a failed fact load for real birds when no fact content is returned', async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue({
        birdName: 'Blue Jay',
        isReal: true,
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const fetchPromise = fetchData(
      vi.fn(),
      vi.fn(),
      vi.fn(),
      vi.fn(),
      vi.fn(),
      vi.fn(),
      vi.fn(),
      vi.fn(),
      vi.fn(),
      vi.fn(),
      vi.fn(),
    );
    await vi.runAllTimersAsync();
    await fetchPromise;

    expect(trackMock).toHaveBeenCalledWith(
      'bird_content_loaded',
      expect.objectContaining({
        source: 'none',
        content_type: 'fact',
        load_stage: 'api',
        outcome: 'failure',
      })
    );
  });

  it('handles api error responses without caching', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue({ error: 'bad bird' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const setIsReal = vi.fn();
    const setIsLoading = vi.fn();
    const setBirdData = vi.fn();
    const setSciName = vi.fn();
    const setRegionLabel = vi.fn();
    const setFact = vi.fn();
    const setSummary = vi.fn();
    const setArticleUrl = vi.fn();
    const setImageUrl = vi.fn();
    const setDescription = vi.fn();
    const setIsError = vi.fn();

    await fetchData(
      setIsReal,
      setIsLoading,
      setBirdData,
      setSciName,
      setRegionLabel,
      setFact,
      setSummary,
      setArticleUrl,
      setImageUrl,
      setDescription,
      setIsError
    );

    expect(setIsError).toHaveBeenCalledWith(true);
    expect(setIsLoading).toHaveBeenCalledWith(false);
    expect(setBirdData).not.toHaveBeenCalled();
    expect(localStorage.getItem('birdData:classic')).toBeNull();
  });

  it('handles thrown fetch failures', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('network down'));
    vi.stubGlobal('fetch', fetchMock);

    const setIsReal = vi.fn();
    const setIsLoading = vi.fn();
    const setBirdData = vi.fn();
    const setSciName = vi.fn();
    const setRegionLabel = vi.fn();
    const setFact = vi.fn();
    const setSummary = vi.fn();
    const setArticleUrl = vi.fn();
    const setImageUrl = vi.fn();
    const setDescription = vi.fn();
    const setIsError = vi.fn();

    await fetchData(
      setIsReal,
      setIsLoading,
      setBirdData,
      setSciName,
      setRegionLabel,
      setFact,
      setSummary,
      setArticleUrl,
      setImageUrl,
      setDescription,
      setIsError
    );

    expect(setSciName).toHaveBeenCalledWith(null);
    expect(setRegionLabel).toHaveBeenCalledWith(null);
    expect(setFact).toHaveBeenCalledWith(null);
    expect(setSummary).toHaveBeenCalledWith(null);
    expect(setArticleUrl).toHaveBeenCalledWith(null);
    expect(setImageUrl).toHaveBeenCalledWith(null);
    expect(setDescription).toHaveBeenCalledWith(null);
    expect(setIsError).toHaveBeenCalledWith(true);
    expect(setIsLoading).toHaveBeenCalledWith(false);
    expect(setBirdData).not.toHaveBeenCalled();
  });

  it('does not reject when an aborted cached reveal delay is cleaned up', async () => {
    vi.useFakeTimers();
    localStorage.setItem(
      'birdData:classic',
      JSON.stringify({ birdName: 'Blue Finch', isReal: true, regionLabel: 'Algeria', sciName: 'Fringilla caerulea' })
    );

    const controller = new AbortController();
    const setIsReal = vi.fn();
    const setIsLoading = vi.fn();
    const setBirdData = vi.fn();
    const setSciName = vi.fn();
    const setRegionLabel = vi.fn();
    const setFact = vi.fn();
    const setSummary = vi.fn();
    const setArticleUrl = vi.fn();
    const setImageUrl = vi.fn();
    const setDescription = vi.fn();
    const setIsError = vi.fn();

    const fetchPromise = fetchData(
      setIsReal,
      setIsLoading,
      setBirdData,
      setSciName,
      setRegionLabel,
      setFact,
      setSummary,
      setArticleUrl,
      setImageUrl,
      setDescription,
      setIsError,
      'classic',
      controller.signal
    );

    controller.abort();
    await vi.runAllTimersAsync();

    await expect(fetchPromise).resolves.toBeUndefined();
    expect(setBirdData).not.toHaveBeenCalled();
    expect(setIsLoading).not.toHaveBeenCalledWith(false);
    expect(setIsError).not.toHaveBeenCalled();
  });
});