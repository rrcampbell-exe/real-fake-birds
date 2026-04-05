'use client';

import { startTransition, useDeferredValue, useEffect, useState } from 'react';
import { validateUsername } from '@/lib/auth/username';
import { validateUsernameAvailability } from '@/lib/auth/validate-username';
import type { UsernameValidationIssue } from '@/lib/auth/username';

const USERNAME_VALIDATION_DELAY_MS = 400;

interface UsernameValidationState {
  value: string;
  normalizedUsername: string;
  issues: UsernameValidationIssue[];
  available: boolean | null;
  isChecking: boolean;
  error: string | null;
}

const initialState: UsernameValidationState = {
  value: '',
  normalizedUsername: '',
  issues: [],
  available: null,
  isChecking: false,
  error: null,
};

export function useUsernameValidation() {
  const [state, setState] = useState<UsernameValidationState>(initialState);
  const deferredValue = useDeferredValue(state.value);

  useEffect(() => {
    const trimmed = deferredValue.trim();
    const controller = new AbortController();

    if (!trimmed) {
      setState((current) => ({
        ...current,
        normalizedUsername: '',
        issues: [],
        available: null,
        isChecking: false,
        error: null,
      }));

      return () => {
        controller.abort();
      };
    }

    const timeoutId = window.setTimeout(async () => {
      const localValidation = validateUsername(trimmed);
      if (!localValidation.isValid) {
        setState((current) => ({
          ...current,
          normalizedUsername: localValidation.normalizedUsername,
          issues: localValidation.issues,
          available: false,
          isChecking: false,
          error: null,
        }));
        return;
      }

      setState((current) => ({
        ...current,
        normalizedUsername: localValidation.normalizedUsername,
        issues: [],
        available: null,
        isChecking: true,
        error: null,
      }));

      try {
        const result = await validateUsernameAvailability(trimmed, controller.signal);
        setState((current) => ({
          ...current,
          normalizedUsername: result.normalizedUsername,
          issues: result.issues,
          available: result.available,
          isChecking: false,
          error: null,
        }));
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        setState((current) => ({
          ...current,
          isChecking: false,
          available: null,
          error: error instanceof Error ? error.message : 'Unable to validate username.',
        }));
      }
    }, USERNAME_VALIDATION_DELAY_MS);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [deferredValue]);

  return {
    ...state,
    setValue(value: string) {
      const trimmed = value.trim();
      startTransition(() => {
        setState((current) => ({
          ...current,
          value,
          normalizedUsername: '',
          issues: [],
          available: null,
          isChecking: trimmed.length > 0,
          error: null,
        }));
      });
    },
  };
}