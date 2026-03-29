import { describe, expect, it } from 'vitest';
import { correctnessText } from './correctness-text';

describe('correctnessText', () => {
  it('returns default correct copy when no bird score is stored', () => {
    expect(correctnessText(true, false, false)).toBe('Correct! 👏');
  });

  it('returns default incorrect copy when no bird score is stored', () => {
    expect(correctnessText(false, false, false)).toBe('Incorrect. 😬');
  });

  it('returns streak copy with current streak from storage', () => {
    localStorage.setItem(
      'birdScore',
      JSON.stringify({ currentStreak: 5, birdsIdentified: 12 })
    );

    expect(correctnessText(true, true, false)).toBe(
      "That's 5 correct in a row! 🦅"
    );
  });

  it('returns milestone copy with identified count from storage', () => {
    localStorage.setItem(
      'birdScore',
      JSON.stringify({ currentStreak: 10, birdsIdentified: 25 })
    );

    expect(correctnessText(true, false, true)).toBe(
      "Wow! You've correctly identified real fake birds 25 times! 🐧"
    );
  });
});