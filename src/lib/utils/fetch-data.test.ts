import { afterEach, describe, expect, it, vi } from 'vitest';
import fetchData from './fetch-data';

describe('fetchData', () => {
  afterEach(() => {
    vi.clearAllTimers();
  });

  it('uses cached bird data when available', async () => {
    vi.useFakeTimers();
    localStorage.setItem(
      'birdData',
      JSON.stringify({ birdName: 'Blue Finch', isReal: true, regionLabel: 'Algeria', sciName: 'Fringilla caerulea' })
    );

    const setIsReal = vi.fn();
    const setIsLoading = vi.fn();
    const setBirdData = vi.fn();
    const setSciName = vi.fn();
    const setRegionLabel = vi.fn();
    const setFact = vi.fn();
    const setIsError = vi.fn();

    await fetchData(setIsReal, setIsLoading, setBirdData, setSciName, setRegionLabel, setFact, setIsError);
    await vi.runAllTimersAsync();

    expect(setIsReal).toHaveBeenCalledWith(true);
    expect(setSciName).toHaveBeenCalledWith('Fringilla caerulea');
    expect(setRegionLabel).toHaveBeenCalledWith('Algeria');
    expect(setFact).toHaveBeenCalledWith(null);
    expect(setIsLoading).toHaveBeenCalledWith(false);
    expect(setBirdData).toHaveBeenCalledWith('Blue Finch');
    expect(setIsError).not.toHaveBeenCalled();
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
    const setIsError = vi.fn();

    await fetchData(setIsReal, setIsLoading, setBirdData, setSciName, setRegionLabel, setFact, setIsError);
    await vi.runAllTimersAsync();

    expect(fetchMock).toHaveBeenCalledWith('/api/bird');
    expect(localStorage.getItem('birdData')).toBe(
      JSON.stringify({
        birdName: 'Copper Heron',
        isReal: false,
        regionLabel: undefined,
        sciName: undefined,
        fact: 'Invented fact should still cache if present.',
      })
    );
    expect(setIsReal).toHaveBeenCalledWith(false);
    expect(setSciName).toHaveBeenCalledWith(null);
    expect(setRegionLabel).toHaveBeenCalledWith(null);
    expect(setFact).toHaveBeenCalledWith('Invented fact should still cache if present.');
    expect(setIsLoading).toHaveBeenCalledWith(false);
    expect(setBirdData).toHaveBeenCalledWith('Copper Heron');
    expect(setIsError).not.toHaveBeenCalled();
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
    const setIsError = vi.fn();

    await fetchData(setIsReal, setIsLoading, setBirdData, setSciName, setRegionLabel, setFact, setIsError);

    expect(setIsError).toHaveBeenCalledWith(true);
    expect(setIsLoading).toHaveBeenCalledWith(false);
    expect(setBirdData).not.toHaveBeenCalled();
    expect(localStorage.getItem('birdData')).toBeNull();
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
    const setIsError = vi.fn();

    await fetchData(setIsReal, setIsLoading, setBirdData, setSciName, setRegionLabel, setFact, setIsError);

    expect(setSciName).toHaveBeenCalledWith(null);
    expect(setRegionLabel).toHaveBeenCalledWith(null);
    expect(setFact).toHaveBeenCalledWith(null);
    expect(setIsError).toHaveBeenCalledWith(true);
    expect(setIsLoading).toHaveBeenCalledWith(false);
    expect(setBirdData).not.toHaveBeenCalled();
  });
});