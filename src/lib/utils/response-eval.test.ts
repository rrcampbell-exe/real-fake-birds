import { describe, expect, it, vi } from 'vitest';
import responseEval from './response-eval';

function createEvent() {
  return {
    preventDefault: vi.fn(),
  } as unknown as React.FormEvent;
}

describe('responseEval', () => {
  it('initializes score and updates correct guesses', () => {
    const setIsCorrect = vi.fn();
    const setIsStreak = vi.fn();
    const setIsMilestone = vi.fn();

    responseEval(createEvent(), true, 'real', setIsCorrect, setIsStreak, setIsMilestone);

    expect(setIsCorrect).toHaveBeenCalledWith(true);
    expect(setIsStreak).toHaveBeenLastCalledWith(false);
    expect(setIsMilestone).toHaveBeenLastCalledWith(false);
    expect(JSON.parse(localStorage.getItem('birdScore')!)).toEqual({
      birdsSeen: 1,
      birdsIdentified: 1,
      currentStreak: 1,
      justAchievedStreak: false,
      bestStreak: 1,
    });
  });

  it('marks streak achievements when a threshold is reached', () => {
    localStorage.setItem(
      'birdScore',
      JSON.stringify({
        birdsSeen: 3,
        birdsIdentified: 1,
        currentStreak: 1,
        justAchievedStreak: false,
        bestStreak: 1,
      })
    );

    const setIsCorrect = vi.fn();
    const setIsStreak = vi.fn();
    const setIsMilestone = vi.fn();

    responseEval(createEvent(), true, 'real', setIsCorrect, setIsStreak, setIsMilestone);

    expect(setIsStreak).toHaveBeenCalledWith(true);
    expect(localStorage.getItem('birdStreakAchieved')).toBe('true');
  });

  it('marks milestone achievements and persists unlocked badges', () => {
    localStorage.setItem(
      'birdScore',
      JSON.stringify({
        birdsSeen: 20,
        birdsIdentified: 9,
        currentStreak: 4,
        justAchievedStreak: false,
        bestStreak: 4,
      })
    );

    const setIsCorrect = vi.fn();
    const setIsStreak = vi.fn();
    const setIsMilestone = vi.fn();

    responseEval(createEvent(), false, 'fake', setIsCorrect, setIsStreak, setIsMilestone);

    expect(setIsMilestone).toHaveBeenCalledWith(true);
    expect(localStorage.getItem('birdMilestoneAchieved')).toBe('true');
    expect(localStorage.getItem('hasUnseenBadges')).toBe('true');
    expect(JSON.parse(localStorage.getItem('birdMilestonesArray')!)).toHaveLength(1);
  });

  it('resets the current streak after an incorrect guess', () => {
    localStorage.setItem(
      'birdScore',
      JSON.stringify({
        birdsSeen: 7,
        birdsIdentified: 4,
        currentStreak: 3,
        justAchievedStreak: false,
        bestStreak: 5,
      })
    );

    const setIsCorrect = vi.fn();
    const setIsStreak = vi.fn();
    const setIsMilestone = vi.fn();

    responseEval(createEvent(), true, 'fake', setIsCorrect, setIsStreak, setIsMilestone);

    expect(setIsCorrect).not.toHaveBeenCalled();
    expect(JSON.parse(localStorage.getItem('birdScore')!)).toEqual({
      birdsSeen: 8,
      birdsIdentified: 4,
      currentStreak: 0,
      bestStreak: 5,
      justAchievedStreak: false,
    });
  });
});