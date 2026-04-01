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
    const setSeedsEarned = vi.fn();
    const setUnlockedThemeName = vi.fn();
    const setEarnedBadgeName = vi.fn();

    responseEval(
      createEvent(),
      true,
      'real',
      setIsCorrect,
      setIsStreak,
      setIsMilestone,
      setSeedsEarned,
      setUnlockedThemeName,
      setEarnedBadgeName
    );

    expect(setIsCorrect).toHaveBeenCalledWith(true);
    expect(setIsStreak).toHaveBeenLastCalledWith(false);
    expect(setIsMilestone).toHaveBeenLastCalledWith(false);
    expect(JSON.parse(localStorage.getItem('birdScore')!)).toEqual({
      birdsSeen: 1,
      birdsIdentified: 1,
      currentStreak: 1,
      justAchievedStreak: false,
      bestStreak: 1,
      seeds: 0,
    });
  });

  it('marks streak achievements and awards seeds when a threshold is reached', () => {
    localStorage.setItem(
      'birdScore',
      JSON.stringify({
        birdsSeen: 3,
        birdsIdentified: 1,
        currentStreak: 1,
        justAchievedStreak: false,
        bestStreak: 1,
        seeds: 0,
      })
    );

    const setIsCorrect = vi.fn();
    const setIsStreak = vi.fn();
    const setIsMilestone = vi.fn();
    const setSeedsEarned = vi.fn();
    const setUnlockedThemeName = vi.fn();
    const setEarnedBadgeName = vi.fn();

    responseEval(
      createEvent(),
      true,
      'real',
      setIsCorrect,
      setIsStreak,
      setIsMilestone,
      setSeedsEarned,
      setUnlockedThemeName,
      setEarnedBadgeName
    );

    expect(setIsStreak).toHaveBeenCalledWith(true);
    expect(setSeedsEarned).toHaveBeenCalledWith(2);
    expect(JSON.parse(localStorage.getItem('birdScore')!)).toMatchObject({ seeds: 2 });
    expect(localStorage.getItem('birdStreakAchieved')).toBe('true');
  });

  it('marks milestone achievements and unlocks the matching live theme', () => {
    localStorage.removeItem('unlockedThemes');
    localStorage.setItem(
      'birdScore',
      JSON.stringify({
        birdsSeen: 20,
        birdsIdentified: 9,
        currentStreak: 4,
        justAchievedStreak: false,
        bestStreak: 4,
        seeds: 0,
      })
    );

    const setIsCorrect = vi.fn();
    const setIsStreak = vi.fn();
    const setIsMilestone = vi.fn();
    const setSeedsEarned = vi.fn();
    const setUnlockedThemeName = vi.fn();
    const setEarnedBadgeName = vi.fn();

    responseEval(
      createEvent(),
      false,
      'fake',
      setIsCorrect,
      setIsStreak,
      setIsMilestone,
      setSeedsEarned,
      setUnlockedThemeName,
      setEarnedBadgeName
    );

    expect(setIsMilestone).toHaveBeenCalledWith(true);
    expect(setUnlockedThemeName).toHaveBeenCalledWith('Raven');
    expect(setEarnedBadgeName).toHaveBeenCalledWith('Downy Feather');
    expect(localStorage.getItem('birdMilestoneAchieved')).toBe('true');
    expect(localStorage.getItem('hasUnseenBadges')).toBe('true');
    expect(localStorage.getItem('hasNewThemeUnlock')).toBe('true');
    expect(JSON.parse(localStorage.getItem('birdMilestonesArray')!)).toHaveLength(1);
    expect(JSON.parse(localStorage.getItem('unlockedThemes')!)).toContain('Raven');
  });

  it('awards cumulative seeds at higher streak thresholds', () => {
    localStorage.setItem(
      'birdScore',
      JSON.stringify({
        birdsSeen: 12,
        birdsIdentified: 12,
        currentStreak: 9,
        justAchievedStreak: false,
        bestStreak: 9,
        seeds: 3,
      })
    );

    const setIsCorrect = vi.fn();
    const setIsStreak = vi.fn();
    const setIsMilestone = vi.fn();
    const setSeedsEarned = vi.fn();
    const setUnlockedThemeName = vi.fn();
    const setEarnedBadgeName = vi.fn();

    responseEval(
      createEvent(),
      true,
      'real',
      setIsCorrect,
      setIsStreak,
      setIsMilestone,
      setSeedsEarned,
      setUnlockedThemeName,
      setEarnedBadgeName
    );

    expect(setSeedsEarned).toHaveBeenCalledWith(17);
    expect(JSON.parse(localStorage.getItem('birdScore')!)).toMatchObject({ seeds: 20 });
  });

  it('does not re-announce theme unlock when milestone theme was already purchased', () => {
    localStorage.setItem(
      'birdScore',
      JSON.stringify({
        birdsSeen: 60,
        birdsIdentified: 24,
        currentStreak: 3,
        justAchievedStreak: false,
        bestStreak: 12,
        seeds: 0,
      })
    );
    localStorage.setItem('unlockedThemes', JSON.stringify(['Robin']));
    localStorage.setItem(
      'birdMilestonesArray',
      JSON.stringify([
        {
          badge: 'Downy Feather',
          value: 10,
          description: 'x',
          achievement: 'x',
        },
      ])
    );

    const setIsCorrect = vi.fn();
    const setIsStreak = vi.fn();
    const setIsMilestone = vi.fn();
    const setSeedsEarned = vi.fn();
    const setUnlockedThemeName = vi.fn();
    const setEarnedBadgeName = vi.fn();

    responseEval(
      createEvent(),
      true,
      'real',
      setIsCorrect,
      setIsStreak,
      setIsMilestone,
      setSeedsEarned,
      setUnlockedThemeName,
      setEarnedBadgeName
    );

    expect(setIsMilestone).toHaveBeenCalledWith(true);
    expect(setUnlockedThemeName).toHaveBeenCalledWith(null);
    expect(setEarnedBadgeName).toHaveBeenCalledWith('Contour Feather');
    expect(localStorage.getItem('hasUnseenBadges')).toBe('true');
    expect(localStorage.getItem('hasNewThemeUnlock')).not.toBe('true');
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
        seeds: 8,
      })
    );

    const setIsCorrect = vi.fn();
    const setIsStreak = vi.fn();
    const setIsMilestone = vi.fn();
    const setSeedsEarned = vi.fn();
    const setUnlockedThemeName = vi.fn();
    const setEarnedBadgeName = vi.fn();

    responseEval(
      createEvent(),
      true,
      'fake',
      setIsCorrect,
      setIsStreak,
      setIsMilestone,
      setSeedsEarned,
      setUnlockedThemeName,
      setEarnedBadgeName
    );

    expect(setIsCorrect).not.toHaveBeenCalled();
    expect(JSON.parse(localStorage.getItem('birdScore')!)).toEqual({
      birdsSeen: 8,
      birdsIdentified: 4,
      currentStreak: 0,
      bestStreak: 5,
      justAchievedStreak: false,
      seeds: 8,
    });
  });
});