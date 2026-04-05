import type { BirdErrorResponse, BirdResponse, GameMode } from '@/types';

const BIRD_DATA_STORAGE_KEY = 'birdData';

const BIRD_REVEAL_DELAY_MS = 1000;

function getBirdDataStorageKey(mode: GameMode): string {
  return `${BIRD_DATA_STORAGE_KEY}:${mode}`;
}

function waitForRevealDelay(ms: number, signal?: AbortSignal): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const timer = window.setTimeout(() => {
      cleanup();
      resolve(true);
    }, ms);

    const onAbort = () => {
      window.clearTimeout(timer);
      cleanup();
      resolve(false);
    };

    const cleanup = () => {
      signal?.removeEventListener('abort', onAbort);
    };

    if (!signal) {
      return;
    }

    if (signal.aborted) {
      onAbort();
      return;
    }

    signal.addEventListener('abort', onAbort, { once: true });
  });
}

const fetchData = async (
  setIsReal: (val: boolean) => void,
  setIsLoading: (val: boolean) => void,
  setBirdData: (val: string) => void,
  setSciName: (val: string | null) => void,
  setRegionLabel: (val: string | null) => void,
  setFact: (val: string | null) => void,
  setIsError: (val: boolean) => void,
  mode: GameMode = 'classic',
  signal?: AbortSignal
) => {
  const storageKey = getBirdDataStorageKey(mode);
  const cached = localStorage.getItem(storageKey);
  if (cached) {
    const { birdName, isReal, sciName, regionLabel, fact } = JSON.parse(cached) as BirdResponse;
    setIsReal(isReal);
    setSciName(sciName ?? null);
    setRegionLabel(regionLabel ?? null);
    setFact(fact ?? null);
    const delayCompleted = await waitForRevealDelay(BIRD_REVEAL_DELAY_MS, signal);
    if (!delayCompleted || signal?.aborted) {
      return;
    }
    setIsLoading(false);
    setBirdData(birdName);
    return;
  }

  try {
    const response = await fetch('/api/bird', { signal });
    const data: BirdResponse | BirdErrorResponse = await response.json();

    if ('error' in data) {
      setIsError(true);
      setIsLoading(false);
      return;
    }

    const birdData = {
      birdName: data.birdName,
      isReal: data.isReal,
      regionLabel: data.regionLabel,
      sciName: data.sciName,
      fact: data.fact,
    };
    localStorage.setItem(storageKey, JSON.stringify(birdData));

    setIsReal(data.isReal);
    setSciName(data.sciName ?? null);
    setRegionLabel(data.regionLabel ?? null);
    setFact(data.fact ?? null);
    const delayCompleted = await waitForRevealDelay(BIRD_REVEAL_DELAY_MS, signal);
    if (!delayCompleted || signal?.aborted) {
      return;
    }
    setIsLoading(false);
    setBirdData(data.birdName);
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return;
    }

    setSciName(null);
    setRegionLabel(null);
    setFact(null);
    setIsError(true);
    setIsLoading(false);
  }
};

export default fetchData;
