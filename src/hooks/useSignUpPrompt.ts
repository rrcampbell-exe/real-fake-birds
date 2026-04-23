'use client';

import { useAccountState } from '@/components/account/AccountStateProvider';
import { useStoredJson } from '@/hooks/useStoredValue';
import { BIRD_SCORE_STORAGE_KEY, defaultBirdScore } from '@/lib/utils/player-progress';
import { notifyStoredValueChanged } from '@/hooks/useStoredValue';
import {
  getEligibleSignUpPromptThreshold,
  SIGN_UP_PROMPT_LAST_THRESHOLD_STORAGE_KEY,
} from '@/lib/utils/signup-prompt';

function writePromptThreshold(threshold: number | null): void {
  if (typeof window === 'undefined') {
    return;
  }

  if (threshold === null) {
    window.localStorage.removeItem(SIGN_UP_PROMPT_LAST_THRESHOLD_STORAGE_KEY);
  } else {
    window.localStorage.setItem(
      SIGN_UP_PROMPT_LAST_THRESHOLD_STORAGE_KEY,
      JSON.stringify(threshold)
    );
  }

  notifyStoredValueChanged(SIGN_UP_PROMPT_LAST_THRESHOLD_STORAGE_KEY);
}

export function useSignUpPrompt(mode: 'classic' | 'daily' = 'classic') {
  const { isSignedIn } = useAccountState();
  const birdScore = useStoredJson(BIRD_SCORE_STORAGE_KEY, defaultBirdScore);
  const lastPromptThreshold = useStoredJson<number | null>(SIGN_UP_PROMPT_LAST_THRESHOLD_STORAGE_KEY, null);

  const activeThreshold = mode === 'classic' && !isSignedIn
    ? getEligibleSignUpPromptThreshold(birdScore.birdsSeen, lastPromptThreshold)
    : null;

  return {
    birdsSeen: birdScore.birdsSeen,
    birdsIdentified: birdScore.birdsIdentified,
    seeds: birdScore.seeds,
    activeThreshold,
    shouldPrompt: activeThreshold !== null,
    dismiss: () => {
      if (activeThreshold !== null) {
        writePromptThreshold(activeThreshold);
      }
    },
    onAccountCreated: () => {
      if (activeThreshold !== null) {
        writePromptThreshold(activeThreshold);
      }
    },
  };
}