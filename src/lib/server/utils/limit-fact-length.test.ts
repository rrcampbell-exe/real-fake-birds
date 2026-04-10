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

  it('returns empty string for empty input', () => {
    expect(limitFactLength('')).toBe('');
  });

  it('returns empty string for whitespace-only input', () => {
    expect(limitFactLength('   ')).toBe('');
  });

  it('normalizes excess whitespace before splitting', () => {
    expect(limitFactLength('First  sentence.   Second   sentence.  Third sentence.')).toBe(
      'First sentence. Second sentence.'
    );
  });

  it('handles a single sentence with no sentence boundary', () => {
    expect(limitFactLength('Just one sentence without a period')).toBe('Just one sentence without a period');
  });
});
