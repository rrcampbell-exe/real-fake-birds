import { describe, expect, it } from 'vitest';
import { errorEval } from './error-eval';

describe('errorEval', () => {
  it('returns true when any response entry is an error object', () => {
    expect(errorEval(['ok', { error: 'timeout' }])).toBe(true);
  });

  it('returns false when all response entries are strings', () => {
    expect(errorEval(['blue', 'swift', 'sparrow'])).toBe(false);
  });
});