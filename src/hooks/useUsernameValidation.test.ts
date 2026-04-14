import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/auth/validate-username', () => ({
  validateUsernameAvailability: vi.fn(),
}));

import { validateUsernameAvailability } from '@/lib/auth/validate-username';
import { useUsernameValidation } from './useUsernameValidation';

const mockedValidateUsernameAvailability = vi.mocked(validateUsernameAvailability);

describe('useUsernameValidation', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockedValidateUsernameAvailability.mockReset();
    mockedValidateUsernameAvailability.mockResolvedValue({
      isValid: true,
      issues: [],
      normalizedUsername: 'ceo',
      available: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('waits until typing pauses before surfacing too-short validation', async () => {
    const { result } = renderHook(() => useUsernameValidation());

    act(() => {
      result.current.setValue('c');
    });

    expect(result.current.issues).toEqual([]);
    expect(result.current.available).toBeNull();

    await act(async () => {
      vi.advanceTimersByTime(399);
    });

    expect(result.current.issues).toEqual([]);

    await act(async () => {
      vi.advanceTimersByTime(1);
    });

    expect(result.current.issues).toContain('too_short');
    expect(mockedValidateUsernameAvailability).not.toHaveBeenCalled();
  });

  it('clears stale warnings while the user continues typing and validates after the pause', async () => {
    const { result } = renderHook(() => useUsernameValidation());

    act(() => {
      result.current.setValue('c');
    });

    await act(async () => {
      vi.advanceTimersByTime(400);
    });

    expect(result.current.issues).toContain('too_short');

    act(() => {
      result.current.setValue('ceo');
    });

    expect(result.current.issues).toEqual([]);
    expect(result.current.available).toBeNull();

    await act(async () => {
      vi.advanceTimersByTime(400);
      await Promise.resolve();
    });

    expect(mockedValidateUsernameAvailability).toHaveBeenCalledWith('ceo', expect.any(AbortSignal));
  });

  it('resets to the empty state when the value is cleared', async () => {
    const { result } = renderHook(() => useUsernameValidation());

    act(() => {
      result.current.setValue('ceo');
    });

    await act(async () => {
      vi.advanceTimersByTime(400);
      await Promise.resolve();
    });

    act(() => {
      result.current.setValue('   ');
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.normalizedUsername).toBe('');
    expect(result.current.issues).toEqual([]);
    expect(result.current.available).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('surfaces remote availability results', async () => {
    mockedValidateUsernameAvailability.mockResolvedValueOnce({
      isValid: true,
      issues: [],
      normalizedUsername: 'ceo',
      available: false,
    });

    const { result } = renderHook(() => useUsernameValidation());

    act(() => {
      result.current.setValue('ceo');
    });

    await act(async () => {
      vi.advanceTimersByTime(400);
      await Promise.resolve();
    });

    expect(result.current.normalizedUsername).toBe('ceo');
    expect(result.current.available).toBe(false);
    expect(result.current.issues).toEqual([]);
    expect(result.current.isChecking).toBe(false);
  });

  it('surfaces validation errors from the availability request', async () => {
    mockedValidateUsernameAvailability.mockRejectedValueOnce(new Error('Network down'));

    const { result } = renderHook(() => useUsernameValidation());

    act(() => {
      result.current.setValue('ceo');
    });

    await act(async () => {
      vi.advanceTimersByTime(400);
      await Promise.resolve();
    });

    expect(result.current.available).toBeNull();
    expect(result.current.isChecking).toBe(false);
    expect(result.current.error).toBe('Network down');
  });
});
