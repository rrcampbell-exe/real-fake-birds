import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/components/account/AccountStateProvider', () => ({
  useAccountState: vi.fn(),
}));

vi.mock('@/hooks/useStoredValue', () => ({
  useStoredJson: vi.fn(),
  notifyStoredValueChanged: vi.fn(),
}));

import { useAccountState } from '@/components/account/AccountStateProvider';
import { notifyStoredValueChanged, useStoredJson } from '@/hooks/useStoredValue';
import { useSignUpPrompt } from './useSignUpPrompt';

describe('useSignUpPrompt', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(useAccountState).mockReset();
    vi.mocked(useStoredJson).mockReset();
    vi.mocked(notifyStoredValueChanged).mockReset();
  });

  it('activates the prompt for eligible classic-mode guests', () => {
    vi.mocked(useAccountState).mockReturnValue({ isSignedIn: false } as ReturnType<typeof useAccountState>);
    vi.mocked(useStoredJson)
      .mockReturnValueOnce({ birdsSeen: 25, birdsIdentified: 10, seeds: 6 })
      .mockReturnValueOnce(10);

    const { result } = renderHook(() => useSignUpPrompt());

    expect(result.current.shouldPrompt).toBe(true);
    expect(result.current.activeThreshold).toBe(25);
    expect(result.current.birdsSeen).toBe(25);
  });

  it('disables the prompt in daily mode and for signed-in users', () => {
    vi.mocked(useAccountState).mockReturnValue({ isSignedIn: true } as ReturnType<typeof useAccountState>);
    vi.mocked(useStoredJson)
      .mockReturnValueOnce({ birdsSeen: 25, birdsIdentified: 10, seeds: 6 })
      .mockReturnValueOnce(null);

    const { result } = renderHook(() => useSignUpPrompt('daily'));

    expect(result.current.shouldPrompt).toBe(false);
    expect(result.current.activeThreshold).toBeNull();
  });

  it('persists the active threshold when dismissed or when an account is created', () => {
    vi.mocked(useAccountState).mockReturnValue({ isSignedIn: false } as ReturnType<typeof useAccountState>);
    vi.mocked(useStoredJson)
      .mockReturnValueOnce({ birdsSeen: 50, birdsIdentified: 20, seeds: 8 })
      .mockReturnValueOnce(25);

    const { result } = renderHook(() => useSignUpPrompt());

    result.current.dismiss();
    expect(localStorage.getItem('signUpPromptLastThreshold')).toBe('50');
    expect(notifyStoredValueChanged).toHaveBeenCalledWith('signUpPromptLastThreshold');

    result.current.onAccountCreated();
    expect(notifyStoredValueChanged).toHaveBeenCalledTimes(2);
  });

  it('does not write prompt state when there is no active threshold', () => {
    vi.mocked(useAccountState).mockReturnValue({ isSignedIn: false } as ReturnType<typeof useAccountState>);
    vi.mocked(useStoredJson)
      .mockReturnValueOnce({ birdsSeen: 9, birdsIdentified: 2, seeds: 1 })
      .mockReturnValueOnce(null);

    const { result } = renderHook(() => useSignUpPrompt());

    result.current.dismiss();
    result.current.onAccountCreated();

    expect(localStorage.getItem('signUpPromptLastThreshold')).toBeNull();
    expect(notifyStoredValueChanged).not.toHaveBeenCalled();
  });
});
