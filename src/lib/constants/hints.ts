import type { HintState } from '@/types';

export const FACT_HINT_COST = 25;
export const IMAGE_HINT_COST = 50;
export const CURRENT_HINTS_STORAGE_KEY = 'currentHints';

export const emptyHintState: HintState = {
  fact: null,
  image: null,
};