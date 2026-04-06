import { notifyStoredValueChanged } from '@/hooks/useStoredValue';
import type { StreakInsuranceState } from '@/types';
import { readBirdScore } from './player-progress';
import { spendSeeds } from './seed-spend';

export const STREAK_INSURANCE_STORAGE_KEY = 'streakInsurance';
export const STREAK_INSURANCE_MIN_STREAK = 5;

export const defaultStreakInsuranceState: StreakInsuranceState = {
  active: false,
  protectedMissesRemaining: 0,
  cost: 0,
  purchasedAtStreak: 0,
};

export function isStreakInsuranceExpired(
  state: StreakInsuranceState,
  currentStreak: number
): boolean {
  return state.active && currentStreak > state.purchasedAtStreak;
}

function normalizeState(
  stateLike: Partial<StreakInsuranceState> | null | undefined
): StreakInsuranceState {
  return {
    active: typeof stateLike?.active === 'boolean' ? stateLike.active : false,
    protectedMissesRemaining:
      typeof stateLike?.protectedMissesRemaining === 'number'
        ? stateLike.protectedMissesRemaining
        : 0,
    cost: typeof stateLike?.cost === 'number' ? stateLike.cost : 0,
    purchasedAtStreak:
      typeof stateLike?.purchasedAtStreak === 'number' ? stateLike.purchasedAtStreak : 0,
  };
}

export function getStreakInsuranceCost(currentStreak: number): number {
  if (currentStreak >= 75) {
    return 55;
  }

  if (currentStreak >= 50) {
    return 42;
  }

  if (currentStreak >= 35) {
    return 32;
  }

  if (currentStreak >= 25) {
    return 24;
  }

  if (currentStreak >= 15) {
    return 18;
  }

  if (currentStreak >= 10) {
    return 14;
  }

  return 10;
}

export function readStreakInsuranceState(): StreakInsuranceState {
  if (typeof window === 'undefined') {
    return defaultStreakInsuranceState;
  }

  const raw = localStorage.getItem(STREAK_INSURANCE_STORAGE_KEY);
  if (!raw) {
    return defaultStreakInsuranceState;
  }

  try {
    return normalizeState(JSON.parse(raw) as Partial<StreakInsuranceState>);
  } catch {
    return defaultStreakInsuranceState;
  }
}

export function writeStreakInsuranceState(
  stateLike: Partial<StreakInsuranceState>
): StreakInsuranceState {
  const state = normalizeState(stateLike);
  localStorage.setItem(STREAK_INSURANCE_STORAGE_KEY, JSON.stringify(state));
  notifyStoredValueChanged(STREAK_INSURANCE_STORAGE_KEY);
  return state;
}

export function purchaseStreakInsurance(): {
  ok: boolean;
  error?: string;
  state: StreakInsuranceState;
} {
  const score = readBirdScore();
  const currentState = readStreakInsuranceState();
  const normalizedCurrentState = isStreakInsuranceExpired(currentState, score.currentStreak)
    ? writeStreakInsuranceState(defaultStreakInsuranceState)
    : currentState;

  if (normalizedCurrentState.active) {
    return {
      ok: false,
      error: 'Streak insurance is already armed for your next guess.',
      state: normalizedCurrentState,
    };
  }

  if (score.currentStreak < STREAK_INSURANCE_MIN_STREAK) {
    return {
      ok: false,
      error: `Build a ${STREAK_INSURANCE_MIN_STREAK}-bird streak first.`,
      state: normalizedCurrentState,
    };
  }

  const cost = getStreakInsuranceCost(score.currentStreak);
  if (!spendSeeds(cost)) {
    return {
      ok: false,
      error: `You need ${cost} seeds for streak insurance.`,
      state: currentState,
    };
  }

  return {
    ok: true,
    state: writeStreakInsuranceState({
      active: true,
      protectedMissesRemaining: 1,
      cost,
      purchasedAtStreak: score.currentStreak,
    }),
  };
}

export function consumeStreakInsurance(): boolean {
  const score = readBirdScore();
  const state = readStreakInsuranceState();
  if (isStreakInsuranceExpired(state, score.currentStreak)) {
    writeStreakInsuranceState(defaultStreakInsuranceState);
    return false;
  }

  if (!state.active || state.protectedMissesRemaining <= 0) {
    return false;
  }

  writeStreakInsuranceState(defaultStreakInsuranceState);
  return true;
}

export function expireStreakInsuranceAfterGuess(): void {
  const score = readBirdScore();
  const state = readStreakInsuranceState();

  if (!state.active) {
    return;
  }

  if (isStreakInsuranceExpired(state, score.currentStreak)) {
    writeStreakInsuranceState(defaultStreakInsuranceState);
    return;
  }

  writeStreakInsuranceState(defaultStreakInsuranceState);
}

export function clearStreakInsurance(): void {
  writeStreakInsuranceState(defaultStreakInsuranceState);
}