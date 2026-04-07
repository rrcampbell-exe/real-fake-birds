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
    expect(setSeedsEarned).toHaveBeenCalledWith(1);
    expect(JSON.parse(localStorage.getItem('birdScore')!)).toEqual({
      birdsSeen: 1,
      birdsIdentified: 1,
      currentStreak: 1,
      justAchievedStreak: false,
      bestStreak: 1,
      currentDailyStreak: 0,
      bestDailyStreak: 0,
      seeds: 1,
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
    expect(setSeedsEarned).toHaveBeenCalledWith(3);
    expect(JSON.parse(localStorage.getItem('birdScore')!)).toMatchObject({ seeds: 3 });
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

  it('awards the configured major payout at the 10 streak checkpoint', () => {
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

    expect(setSeedsEarned).toHaveBeenCalledWith(13);
    expect(JSON.parse(localStorage.getItem('birdScore')!)).toMatchObject({ seeds: 16 });
  });

  it('awards the configured 25 streak checkpoint payout', () => {
    localStorage.setItem(
      'birdScore',
      JSON.stringify({
        birdsSeen: 30,
        birdsIdentified: 24,
        currentStreak: 24,
        justAchievedStreak: false,
        bestStreak: 24,
        seeds: 11,
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
    expect(setSeedsEarned).toHaveBeenCalledWith(21);
    expect(JSON.parse(localStorage.getItem('birdScore')!)).toMatchObject({
      currentStreak: 25,
      seeds: 32,
    });
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

    expect(setIsCorrect).toHaveBeenCalledWith(false);
    expect(JSON.parse(localStorage.getItem('birdScore')!)).toEqual({
      birdsSeen: 8,
      birdsIdentified: 4,
      currentStreak: 0,
      bestStreak: 5,
      justAchievedStreak: false,
      currentDailyStreak: 0,
      bestDailyStreak: 0,
      seeds: 8,
    });
  });

  it('consumes streak insurance instead of dropping the streak on a miss', () => {
    localStorage.setItem(
      'birdScore',
      JSON.stringify({
        birdsSeen: 9,
        birdsIdentified: 6,
        currentStreak: 4,
        justAchievedStreak: false,
        bestStreak: 5,
        seeds: 8,
      })
    );
    localStorage.setItem(
      'streakInsurance',
      JSON.stringify({
        active: true,
        protectedMissesRemaining: 1,
        cost: 33,
        purchasedAtStreak: 4,
      })
    );

    responseEval(
      createEvent(),
      true,
      'fake',
      vi.fn(),
      vi.fn(),
      vi.fn(),
      vi.fn(),
      vi.fn(),
      vi.fn()
    );

    expect(JSON.parse(localStorage.getItem('birdScore')!)).toEqual({
      birdsSeen: 10,
      birdsIdentified: 6,
      currentStreak: 4,
      bestStreak: 5,
      justAchievedStreak: false,
      currentDailyStreak: 0,
      bestDailyStreak: 0,
      seeds: 8,
    });
    expect(JSON.parse(localStorage.getItem('streakInsurance')!)).toEqual({
      active: false,
      protectedMissesRemaining: 0,
      cost: 0,
      purchasedAtStreak: 0,
    });
  });

  it('expires streak insurance after a correct answer', () => {
    localStorage.setItem(
      'birdScore',
      JSON.stringify({
        birdsSeen: 9,
        birdsIdentified: 6,
        currentStreak: 4,
        justAchievedStreak: false,
        bestStreak: 5,
        seeds: 8,
      })
    );
    localStorage.setItem(
      'streakInsurance',
      JSON.stringify({
        active: true,
        protectedMissesRemaining: 1,
        cost: 33,
        purchasedAtStreak: 4,
      })
    );

    responseEval(
      createEvent(),
      true,
      'real',
      vi.fn(),
      vi.fn(),
      vi.fn(),
      vi.fn(),
      vi.fn(),
      vi.fn()
    );

    expect(JSON.parse(localStorage.getItem('streakInsurance')!)).toEqual({
      active: false,
      protectedMissesRemaining: 0,
      cost: 0,
      purchasedAtStreak: 0,
    });
  });
});