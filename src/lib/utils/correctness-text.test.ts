import { beforeEach, describe, expect, it } from 'vitest';
import { correctnessText } from './correctness-text';

describe('correctnessText', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns default correct copy when no bird score is stored', () => {
    expect(correctnessText(true, false, false)).toBe('Correct!');
  });

  it('returns default incorrect copy when no bird score is stored', () => {
    expect(correctnessText(false, false, false)).toBe('Incorrect.');
  });

  it('returns streak copy with current streak from storage', () => {
    localStorage.setItem(
      'birdScore',
      JSON.stringify({ currentStreak: 5, birdsIdentified: 12 })
    );
    expect(correctnessText(true, true, false)).toBe(
      "That's 5 correct in a row!\nHave some bonus seeds as a treat."
    );
  });

  it('returns milestone copy with identified count from storage', () => {
    localStorage.setItem(
      'birdScore',
      JSON.stringify({ currentStreak: 10, birdsIdentified: 25 })
    );
    expect(correctnessText(true, false, true)).toBe(
      "Wow! You've correctly identified real fake birds 25 times!"
    );
  });

  it('returns "Bonus seeds!" when streak is exactly 2', () => {
    localStorage.setItem(
      'birdScore',
      JSON.stringify({ currentStreak: 2, birdsIdentified: 5 })
    );
    expect(correctnessText(true, true, false)).toBe('Bonus seeds!');
  });

  it('returns combined streak + milestone copy', () => {
    localStorage.setItem(
      'birdScore',
      JSON.stringify({ currentStreak: 5, birdsIdentified: 25 })
    );
    expect(correctnessText(true, true, true)).toBe(
      "That's 5 correct in a row and 25 birds you've now identified successfully!\nHave some bonus seeds as a treat."
    );
  });

  it('returns "Correct!" when correct but no streak and no milestone with score stored', () => {
    localStorage.setItem(
      'birdScore',
      JSON.stringify({ currentStreak: 1, birdsIdentified: 3 })
    );
    expect(correctnessText(true, false, false)).toBe('Correct!');
  });

  it('returns "Incorrect." when incorrect with score stored', () => {
    localStorage.setItem(
      'birdScore',
      JSON.stringify({ currentStreak: 0, birdsIdentified: 3 })
    );
    expect(correctnessText(false, false, false)).toBe('Incorrect.');
  });
});
