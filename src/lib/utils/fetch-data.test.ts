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
      JSON.stringify({ birdName: 'Blue Finch', isReal: true, regionLabel: 'Algeria', sciName: 'Fringilla caerulea', cachedAt: Date.now() })
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
    const cachedBirdData = JSON.parse(localStorage.getItem('birdData:classic') ?? '{}') as Record<string, unknown>;
    expect(cachedBirdData).toMatchObject({
      birdName: 'Copper Heron',
      isReal: false,
      fact: 'Invented fact should still cache if present.',
    });
    expect(typeof cachedBirdData.cachedAt).toBe('number');
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
    expect(trackMock).toHaveBeenCalledWith(
      'bird_content_loaded',
      expect.objectContaining({
        source: 'none',
        content_type: 'fact',
        load_stage: 'api',
        outcome: 'success',
        is_real: false,
        cache_status: 'none',
      })
    );
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

  it('discards stale cached bird data older than 24 hours', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-20T12:00:00.000Z'));
    const fetchMock = vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue({
        birdName: 'Fresh Finch',
        isReal: true,
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    localStorage.setItem(
      'birdData:classic',
      JSON.stringify({ birdName: 'Stale Finch', isReal: true, cachedAt: Date.now() - 86_400_001 })
    );

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

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('birdData:classic')).toContain('Fresh Finch');
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

  it('calls optional callbacks when reading from cache', async () => {
    vi.useFakeTimers();
    localStorage.setItem(
      'birdData:classic',
      JSON.stringify({
        birdName: 'Blue Finch',
        isReal: true,
        imageThumbUrl: 'https://example.com/thumb.jpg',
        fallbackImageUrl: 'https://example.com/fallback.jpg',
        contentSource: 'cdn',
        attribution: { artist: 'Jane', license: 'CC BY 4.0', licenseUrl: 'https://cc.org' },
        cachedAt: Date.now(),
      })
    );

    const setImageThumbUrl = vi.fn();
    const setFallbackImageUrl = vi.fn();
    const setContentSource = vi.fn();
    const setAttribution = vi.fn();

    const fetchPromise = fetchData(
      vi.fn(), vi.fn(), vi.fn(), vi.fn(), vi.fn(), vi.fn(), vi.fn(), vi.fn(), vi.fn(), vi.fn(), vi.fn(),
      'classic', undefined, setImageThumbUrl, setFallbackImageUrl, setContentSource, setAttribution,
    );
    await vi.runAllTimersAsync();
    await fetchPromise;

    expect(setImageThumbUrl).toHaveBeenCalledWith('https://example.com/thumb.jpg');
    expect(setFallbackImageUrl).toHaveBeenCalledWith('https://example.com/fallback.jpg');
    expect(setContentSource).toHaveBeenCalledWith('cdn');
    expect(setAttribution).toHaveBeenCalledWith(expect.objectContaining({ artist: 'Jane' }));
  });

  it('calls optional callbacks when fetching fresh data from the network', async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue({
        birdName: 'Tawny Owl',
        isReal: true,
        imageThumbUrl: 'https://example.com/tawny-thumb.jpg',
        fallbackImageUrl: 'https://example.com/tawny-fallback.jpg',
        contentSource: 'wikipedia',
        attribution: { artist: 'Bob', license: 'CC BY-SA', licenseUrl: 'https://cc.org/sa' },
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const setImageThumbUrl = vi.fn();
    const setFallbackImageUrl = vi.fn();
    const setContentSource = vi.fn();
    const setAttribution = vi.fn();

    const fetchPromise = fetchData(
      vi.fn(), vi.fn(), vi.fn(), vi.fn(), vi.fn(), vi.fn(), vi.fn(), vi.fn(), vi.fn(), vi.fn(), vi.fn(),
      'classic', undefined, setImageThumbUrl, setFallbackImageUrl, setContentSource, setAttribution,
    );
    await vi.runAllTimersAsync();
    await fetchPromise;

    expect(setImageThumbUrl).toHaveBeenCalledWith('https://example.com/tawny-thumb.jpg');
    expect(setFallbackImageUrl).toHaveBeenCalledWith('https://example.com/tawny-fallback.jpg');
    expect(setContentSource).toHaveBeenCalledWith('wikipedia');
    expect(setAttribution).toHaveBeenCalledWith(expect.objectContaining({ artist: 'Bob' }));
  });

  it('silently returns when fetch throws an AbortError', async () => {
    const abortError = new DOMException('The operation was aborted.', 'AbortError');
    const fetchMock = vi.fn().mockRejectedValue(abortError);
    vi.stubGlobal('fetch', fetchMock);

    const setIsError = vi.fn();
    const setIsLoading = vi.fn();

    await fetchData(
      vi.fn(), setIsLoading, vi.fn(), vi.fn(), vi.fn(), vi.fn(), vi.fn(), vi.fn(), vi.fn(), vi.fn(), setIsError,
    );

    expect(setIsError).not.toHaveBeenCalled();
    expect(setIsLoading).not.toHaveBeenCalled();
  });

  it('discards cached data with a non-numeric cachedAt and re-fetches', async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue({ birdName: 'Fresh Warbler', isReal: false }),
    });
    vi.stubGlobal('fetch', fetchMock);

    localStorage.setItem(
      'birdData:classic',
      JSON.stringify({ birdName: 'Old Warbler', isReal: false, cachedAt: 'not-a-number' })
    );

    const setBirdData = vi.fn();
    const fetchPromise = fetchData(
      vi.fn(), vi.fn(), setBirdData, vi.fn(), vi.fn(), vi.fn(), vi.fn(), vi.fn(), vi.fn(), vi.fn(), vi.fn(),
    );
    await vi.runAllTimersAsync();
    await fetchPromise;

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(setBirdData).toHaveBeenCalledWith('Fresh Warbler');
  });

  it('does not complete reveal when signal is already aborted before fetch starts', async () => {
    vi.useFakeTimers();
    localStorage.setItem(
      'birdData:classic',
      JSON.stringify({ birdName: 'Blue Finch', isReal: true, cachedAt: Date.now() })
    );

    const controller = new AbortController();
    controller.abort();

    const setBirdData = vi.fn();
    const setIsLoading = vi.fn();

    const fetchPromise = fetchData(
      vi.fn(), setIsLoading, setBirdData, vi.fn(), vi.fn(), vi.fn(), vi.fn(), vi.fn(), vi.fn(), vi.fn(), vi.fn(),
      'classic', controller.signal,
    );
    await vi.runAllTimersAsync();
    await fetchPromise;

    expect(setBirdData).not.toHaveBeenCalled();
    expect(setIsLoading).not.toHaveBeenCalledWith(false);
  });

  it('does not reject when an aborted cached reveal delay is cleaned up', async () => {
    vi.useFakeTimers();
    localStorage.setItem(
      'birdData:classic',
      JSON.stringify({ birdName: 'Blue Finch', isReal: true, regionLabel: 'Algeria', sciName: 'Fringilla caerulea', cachedAt: Date.now() })
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