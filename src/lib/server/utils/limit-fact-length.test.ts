import { describe, expect, it } from 'vitest';
import { limitFactLength } from './limit-fact-length';

describe('limitFactLength', () => {
  it('returns the first two sentences only', () => {
    expect(
      limitFactLength('First sentence. Second sentence. Third sentence.', 2)
    ).toBe('First sentence. Second sentence.');
  });

  it('returns the original text when it is already short', () => {
    expect(limitFactLength('Short fact.')).toBe('Short fact.');
  });
});