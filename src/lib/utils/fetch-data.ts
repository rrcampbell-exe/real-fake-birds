import type { BirdResponse, BirdErrorResponse } from '@/types';

const fetchData = async (
  setIsReal: (val: boolean) => void,
  setIsLoading: (val: boolean) => void,
  setBirdData: (val: string) => void,
  setIsError: (val: boolean) => void
) => {
  const cached = localStorage.getItem('birdData');
  if (cached) {
    const { birdName, isReal } = JSON.parse(cached);
    setIsReal(isReal);
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
    };
    localStorage.setItem('birdData', JSON.stringify(birdData));

    setIsReal(data.isReal);
    setTimeout(() => setIsLoading(false), 1000);
    setTimeout(() => setBirdData(data.birdName), 1000);
  } catch {
    setIsError(true);
    setIsLoading(false);
  }
};

export default fetchData;
