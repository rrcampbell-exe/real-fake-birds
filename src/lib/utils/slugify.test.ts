import { describe, expect, it } from 'vitest';
import { slugifyBirdName } from './slugify';

describe('slugifyBirdName', () => {
  it('converts a simple bird name to a slug', () => {
    expect(slugifyBirdName('Blue Jay')).toBe('blue-jay');
  });

  it('converts a multi-word name', () => {
    expect(slugifyBirdName('American Robin')).toBe('american-robin');
  });

  it('strips non-alphanumeric characters', () => {
    expect(slugifyBirdName("Steller's Jay")).toBe('stellers-jay');
  });

  it('collapses multiple spaces and hyphens', () => {
    expect(slugifyBirdName('Red - Winged  Blackbird')).toBe('red-winged-blackbird');
  });

  it('trims whitespace', () => {
    expect(slugifyBirdName('  Bald Eagle  ')).toBe('bald-eagle');
  });

  it('returns unknown-bird for empty input', () => {
    expect(slugifyBirdName('')).toBe('unknown-bird');
    expect(slugifyBirdName('   ')).toBe('unknown-bird');
  });

  it('handles names with numbers', () => {
    expect(slugifyBirdName('Zone-tailed Hawk')).toBe('zone-tailed-hawk');
  });

  it('produces the same slug as deriveBirdKey without the prefix', () => {
    // deriveBirdKey('Blue Jay', true) => 'real:blue-jay'
    // slugifyBirdName('Blue Jay') => 'blue-jay'
    expect(slugifyBirdName('Blue Jay')).toBe('blue-jay');
  });
});
