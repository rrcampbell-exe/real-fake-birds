import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/hooks/useStoredValue', () => ({
  useStoredJson: vi.fn(),
  notifyStoredValueChanged: vi.fn(),
}));

import { notifyStoredValueChanged, useStoredJson } from '@/hooks/useStoredValue';
import { ONBOARDING_STORAGE_KEY, useOnboarding } from './useOnboarding';

const mockedUseStoredJson = vi.mocked(useStoredJson);
const mockedNotifyStoredValueChanged = vi.mocked(notifyStoredValueChanged);

describe('useOnboarding', () => {
  beforeEach(() => {
    localStorage.clear();
    mockedUseStoredJson.mockReset();
    mockedNotifyStoredValueChanged.mockReset();
  });

  it('should show onboarding when storage value is null (first visit)', () => {
    mockedUseStoredJson.mockReturnValue(null);
    const { result } = renderHook(() => useOnboarding());
    expect(result.current.shouldShowOnboarding).toBe(true);
  });

  it('should show onboarding when storage value is false', () => {
    mockedUseStoredJson.mockReturnValue(false);
    const { result } = renderHook(() => useOnboarding());
    expect(result.current.shouldShowOnboarding).toBe(true);
  });

  it('should not show onboarding when storage value is true', () => {
    mockedUseStoredJson.mockReturnValue(true);
    const { result } = renderHook(() => useOnboarding());
    expect(result.current.shouldShowOnboarding).toBe(false);
  });

  it('persists dismissal to localStorage', () => {
    mockedUseStoredJson.mockReturnValue(null);
    const { result } = renderHook(() => useOnboarding());

    act(() => {
      result.current.dismissOnboarding();
    });

    const stored = localStorage.getItem(ONBOARDING_STORAGE_KEY);
    expect(stored).toBe('true');
    expect(mockedNotifyStoredValueChanged).toHaveBeenCalledWith(ONBOARDING_STORAGE_KEY);
  });
});
