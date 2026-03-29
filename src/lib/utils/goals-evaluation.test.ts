import { describe, expect, it } from 'vitest';
import {
  currentMilestoneGoalEval,
  currentStreakGoalEval,
  isNextMilestoneEval,
  isNextStreakEval,
} from './goals-evaluation';

describe('goals-evaluation', () => {
  it('returns the next streak target above the current streak', () => {
    expect(isNextStreakEval([2, 5, 10], 3)).toBe(5);
  });

  it('returns undefined when there is no next streak target', () => {
    expect(isNextStreakEval([2, 5, 10], 10)).toBeUndefined();
  });

  it('returns the current streak goal when matched exactly', () => {
    expect(currentStreakGoalEval([2, 5, 10], 5)).toBe(5);
  });

  it('returns the next milestone above birds identified', () => {
    expect(isNextMilestoneEval([10, 25, 50], 24)).toBe(25);
  });

  it('returns the current milestone goal when matched exactly', () => {
    expect(currentMilestoneGoalEval([10, 25, 50], 50)).toBe(50);
  });
});