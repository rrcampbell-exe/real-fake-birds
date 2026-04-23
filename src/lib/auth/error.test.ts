import { describe, expect, it } from 'vitest';
import { AccountActionError, isRetryableAccountActionError, isUnauthenticatedAccountActionError } from './error';

describe('auth error helpers', () => {
  it('marks 5xx account errors as retryable', () => {
    expect(isRetryableAccountActionError(new AccountActionError('retry later', 503, 'temporary'))).toBe(true);
    expect(isRetryableAccountActionError(new AccountActionError('nope', 401, 'not_authenticated'))).toBe(false);
  });

  it('identifies the not-authenticated account action error', () => {
    expect(isUnauthenticatedAccountActionError(new AccountActionError('sign in', 401, 'not_authenticated'))).toBe(true);
    expect(isUnauthenticatedAccountActionError(new AccountActionError('sign in', 401, 'other'))).toBe(false);
    expect(isUnauthenticatedAccountActionError(new Error('nope'))).toBe(false);
  });
});