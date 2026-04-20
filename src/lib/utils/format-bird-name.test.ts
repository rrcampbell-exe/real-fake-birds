import { describe, expect, it } from 'vitest';
import { formatBirdName } from './format-bird-name';

describe('formatBirdName', () => {
  it('returns the original name when no parentheticals are present', () => {
    expect(formatBirdName('Blue Jay')).toBe('Blue Jay');
  });

  it('strips parentheticals in the middle of a name', () => {
    expect(formatBirdName('Bolivia (Plurinational State of) Temptress Roller')).toBe('Bolivia Temptress Roller');
  });

  it('strips leading parentheticals and collapses whitespace', () => {
    expect(formatBirdName('(Eastern) Punjabi Sparrow')).toBe('Punjabi Sparrow');
  });

  it('strips multiple parenthetical segments', () => {
    expect(formatBirdName('Virgin Islands (U.S.) Oracle Grouse (Preview)')).toBe('Virgin Islands Oracle Grouse');
  });
});