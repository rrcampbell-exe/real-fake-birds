import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { usePrefersReducedMotion } from './usePrefersReducedMotion';

describe('usePrefersReducedMotion', () => {
  const listeners: Array<(e: Partial<MediaQueryListEvent>) => void> = [];

  function makeMockMq(matches: boolean) {
    return {
      matches,
      addEventListener: (_: string, listener: (e: Partial<MediaQueryListEvent>) => void) => {
        listeners.push(listener);
      },
      removeEventListener: vi.fn(),
    };
  }

  beforeEach(() => {
    listeners.length = 0;
    Object.defineProperty(window, 'matchMedia', {
      value: vi.fn().mockReturnValue(makeMockMq(false)),
      writable: true,
    });
  });

  it('returns false when reduced motion is not preferred', () => {
    const { result } = renderHook(() => usePrefersReducedMotion());
    expect(result.current).toBe(false);
  });

  it('returns true when reduced motion is preferred', () => {
    Object.defineProperty(window, 'matchMedia', {
      value: vi.fn().mockReturnValue(makeMockMq(true)),
      writable: true,
    });
    const { result } = renderHook(() => usePrefersReducedMotion());
    expect(result.current).toBe(true);
  });

  it('updates when the media query changes', () => {
    const { result } = renderHook(() => usePrefersReducedMotion());
    expect(result.current).toBe(false);

    act(() => {
      listeners.forEach((l) => l({ matches: true }));
    });

    expect(result.current).toBe(true);
  });
});
