import { describe, expect, it } from 'vitest';
import { localStorageCheck } from './local-storage-check';

describe('localStorageCheck', () => {
  it('returns false when no bird score exists', () => {
    expect(localStorageCheck()).toBe(false);
  });

  it('returns true when bird score exists', () => {
    localStorage.setItem('birdScore', JSON.stringify({ birdsSeen: 1 }));
    expect(localStorageCheck()).toBe(true);
  });
});
  it('returns false when window is undefined (SSR)', () => {
    const originalWindow = globalThis.window;
    // @ts-expect-error intentional SSR simulation
    delete globalThis.window;
    expect(localStorageCheck()).toBe(false);
    globalThis.window = originalWindow;
  });
