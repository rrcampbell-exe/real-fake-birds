import type { BirdScore } from '@/types';

export function correctnessText(
  isCorrect: boolean,
  isStreak: boolean,
  isMilestone: boolean
): string {
  const stored = localStorage.getItem('birdScore');
  if (!stored) return isCorrect ? 'Correct!' : 'Incorrect.';

  const { currentStreak, birdsIdentified } = JSON.parse(stored) as BirdScore;

  const milestoneAddedText = isMilestone
    ? ` and ${birdsIdentified} birds you've now identified successfully`
    : '';

  if (isStreak && currentStreak !== 2) {
    return `That's ${currentStreak} correct in a row${milestoneAddedText}!
Have some bonus seeds as a treat.`;
  }
  if (isMilestone) {
    return `Wow! You've correctly identified real fake birds ${birdsIdentified} times!`;
  }
  if (isStreak) {
    return 'Bonus seeds!';
  }
  if (isCorrect) {
    return 'Correct!';
  }
  return 'Incorrect.';
}
