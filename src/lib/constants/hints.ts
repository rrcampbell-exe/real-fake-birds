import type { HintState } from '@/types';

export const FACT_HINT_COST = 10;
export const IMAGE_HINT_COST = 40;
export const FAKE_REVEAL_COST = 12;
export const JOURNAL_FAKE_REVEAL_COST = 15;
export const CURRENT_HINTS_STORAGE_KEY = 'currentHints';

export const emptyHintState: HintState = {
  fact: null,
  image: null,
};