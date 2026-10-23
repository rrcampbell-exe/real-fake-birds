import type { UsernameValidationIssue } from './username';
import { apiFetch } from '@/lib/api/client';

export interface UsernameAvailabilityResult {
  isValid: boolean;
  issues: UsernameValidationIssue[];
  normalizedUsername: string;
  available: boolean | null;
}

export async function validateUsernameAvailability(
  username: string,
  signal?: AbortSignal
): Promise<UsernameAvailabilityResult> {
  const response = await apiFetch('/api/auth', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      action: 'validate-username',
      username,
    }),
    signal,
  });

  if (!response.ok) {
    throw new Error('Unable to validate username.');
  }

  return response.json() as Promise<UsernameAvailabilityResult>;
}