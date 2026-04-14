'use client';

import { useMemo } from 'react';
import { useStoredJson } from '@/hooks/useStoredValue';
import {
  addToBirdhouse,
  BIRDHOUSE_FAKE_CAP,
  BIRDHOUSE_REAL_CAP,
  BIRDHOUSE_STORAGE_KEY,
  defaultBirdhouseStore,
  isBirdInBirdhouse,
  normalizeBirdhouseStore,
  removeFromBirdhouse,
  swapBirdhouseEntry,
} from '@/lib/utils/birdhouse';

export function useBirdhouse() {
  const rawBirdhouse = useStoredJson(BIRDHOUSE_STORAGE_KEY, defaultBirdhouseStore);

  const birdhouse = useMemo(
    () => normalizeBirdhouseStore(rawBirdhouse),
    [rawBirdhouse]
  );

  return {
    birdhouse,
    realCount: birdhouse.real.length,
    fakeCount: birdhouse.fake.length,
    realCap: BIRDHOUSE_REAL_CAP,
    fakeCap: BIRDHOUSE_FAKE_CAP,
    isInBirdhouse: (birdKey: string) => isBirdInBirdhouse(birdhouse, birdKey),
    add: (birdKey: string, isReal: boolean) => addToBirdhouse(birdKey, isReal),
    remove: (birdKey: string, isReal: boolean) => removeFromBirdhouse(birdKey, isReal),
    swap: (incomingBirdKey: string, outgoingBirdKey: string, isReal: boolean) => swapBirdhouseEntry({ incomingBirdKey, outgoingBirdKey, isReal }),
  };
}