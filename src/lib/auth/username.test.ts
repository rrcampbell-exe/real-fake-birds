import { describe, expect, it } from 'vitest';
import {
  normalizeUsernameCanonical,
  normalizeUsernameForModeration,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
  validateUsername,
} from './username';

describe('username validation', () => {
  it('accepts plain valid usernames', () => {
    expect(validateUsername('BirdFan_17')).toEqual({
      isValid: true,
      issues: [],
      normalizedUsername: 'birdfan_17',
    });
  });

  it('rejects empty, short, long, and invalid-character usernames', () => {
    expect(validateUsername('')).toEqual({
      isValid: false,
      issues: ['empty'],
      normalizedUsername: '',
    });

    expect(validateUsername('ab')).toEqual({
      isValid: false,
      issues: ['too_short'],
      normalizedUsername: 'ab',
    });

    expect(validateUsername('a'.repeat(USERNAME_MAX_LENGTH + 1)).issues).toContain('too_long');
    expect(validateUsername('bird fan').issues).toContain('invalid_characters');
    expect(USERNAME_MIN_LENGTH).toBe(3);
  });

  it('normalizes leetspeak and diacritics for reserved checks', () => {
    expect(normalizeUsernameCanonical('BirdFan_17')).toBe('birdfan_17');
    expect(normalizeUsernameForModeration('Adm1n')).toBe('admin');
    expect(normalizeUsernameForModeration('Bîrd_Fån')).toBe('birdfan');
    expect(validateUsername('Adm1n').issues).toContain('reserved');
  });

  it('rejects profane usernames after moderation normalization', () => {
    const result = validateUsername('sh1tbird');

    expect(result.isValid).toBe(false);
    expect(result.issues).toContain('profane');
    expect(result.normalizedUsername).toBe('sh1tbird');
  });
});