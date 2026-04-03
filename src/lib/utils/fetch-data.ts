import type { BirdErrorResponse, BirdResponse, GameMode } from '@/types';

const BIRD_DATA_STORAGE_KEY = 'birdData';

function getBirdDataStorageKey(mode: GameMode): string {
  return `${BIRD_DATA_STORAGE_KEY}:${mode}`;
}

const fetchData = async (
  setIsReal: (val: boolean) => void,
  setIsLoading: (val: boolean) => void,
  setBirdData: (val: string) => void,
  setSciName: (val: string | null) => void,
  setRegionLabel: (val: string | null) => void,
  setFact: (val: string | null) => void,
  setIsError: (val: boolean) => void,
  mode: GameMode = 'classic'
) => {
  const storageKey = getBirdDataStorageKey(mode);
  const cached = localStorage.getItem(storageKey);
  if (cached) {
    const { birdName, isReal, sciName, regionLabel, fact } = JSON.parse(cached) as BirdResponse;
    setIsReal(isReal);
    setSciName(sciName ?? null);
    setRegionLabel(regionLabel ?? null);
    setFact(fact ?? null);
    setTimeout(() => setIsLoading(false), 1000);
    setTimeout(() => setBirdData(birdName), 1000);
    return;
  }

  try {
    const response = await fetch('/api/bird');
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
    setTimeout(() => setIsLoading(false), 1000);
    setTimeout(() => setBirdData(data.birdName), 1000);
  } catch {
    setSciName(null);
    setRegionLabel(null);
    setFact(null);
    setIsError(true);
    setIsLoading(false);
  }
};

export default fetchData;
