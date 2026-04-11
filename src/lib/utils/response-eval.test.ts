import { beforeEach, describe, expect, it, vi } from 'vitest';
import responseEval from './response-eval';
import { createSessionMissionsStateForDate, writeSessionMissions } from './missions';

const FIRST_GAME_OF_DAY_BONUS_STORAGE_KEY = 'lastFirstGameBonusDate';

function createEvent() {
  return {
    preventDefault: vi.fn(),
  } as unknown as React.FormEvent;
}

describe('responseEval', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.setSystemTime(new Date(2026, 3, 5, 12, 0, 0));
    localStorage.setItem(FIRST_GAME_OF_DAY_BONUS_STORAGE_KEY, '2026-04-05');
    const state = createSessionMissionsStateForDate('2026-04-05');
    writeSessionMissions({
      ...state,
      missions: state.missions.map((mission) => ({
        ...mission,
        progress: -1000,
        completed: false,
        claimed: false,
      })),
      bonusClaimed: false,
    });
  });

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
      activePersonalBestTarget: null,
      currentDailyStreak: 0,
      bestDailyStreak: 0,
      seeds: 1,
    });
  });

  it('awards 5 bonus seeds on the first correct answer of the day', () => {
    localStorage.removeItem(FIRST_GAME_OF_DAY_BONUS_STORAGE_KEY);

    const setSeedsEarned = vi.fn();

    const result = responseEval(
      createEvent(),
      true,
      'real',
      vi.fn(),
      vi.fn(),
      vi.fn(),
      setSeedsEarned,
      vi.fn(),
      vi.fn()
    );

    expect(result.roundSeedsEarned).toBe(6);
    expect(result.seedsEarned).toBe(6);
    expect(setSeedsEarned).toHaveBeenCalledWith(6);
    expect(JSON.parse(localStorage.getItem('birdScore')!)).toMatchObject({ seeds: 6 });
    expect(localStorage.getItem(FIRST_GAME_OF_DAY_BONUS_STORAGE_KEY)).toBe('2026-04-05');
  });

  it('does not award the daily bonus twice on the same day', () => {
    localStorage.removeItem(FIRST_GAME_OF_DAY_BONUS_STORAGE_KEY);

    const firstResult = responseEval(
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

    const secondResult = responseEval(
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

    expect(firstResult.roundSeedsEarned).toBe(6);
    expect(secondResult.roundSeedsEarned).toBe(1);
    expect(JSON.parse(localStorage.getItem('birdScore')!)).toMatchObject({ seeds: 7 });
  });

  it('resets the first correct answer bonus on the next calendar day', () => {
    localStorage.removeItem(FIRST_GAME_OF_DAY_BONUS_STORAGE_KEY);

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

    vi.setSystemTime(new Date(2026, 3, 6, 12, 0, 0));

    const nextDayResult = responseEval(
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

    expect(nextDayResult.roundSeedsEarned).toBe(6);
    expect(localStorage.getItem(FIRST_GAME_OF_DAY_BONUS_STORAGE_KEY)).toBe('2026-04-06');
  });

  it('marks streak achievements and awards seeds when a threshold is reached', () => {
    localStorage.setItem(
      'birdScore',
      JSON.stringify({
        birdsSeen: 3,
        birdsIdentified: 1,
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
    expect(setSeedsEarned).toHaveBeenCalledWith(7);
    expect(JSON.parse(localStorage.getItem('birdScore')!)).toMatchObject({ currentStreak: 5, seeds: 7 });
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

  it('awards bonus seeds for the new intermediate milestones without flagging a badge unlock', () => {
    localStorage.setItem(
      'birdScore',
      JSON.stringify({
        birdsSeen: 160,
        birdsIdentified: 124,
        currentStreak: 0,
        justAchievedStreak: false,
        bestStreak: 9,
        seeds: 10,
      })
    );
    localStorage.setItem(
      'birdMilestonesArray',
      JSON.stringify([
        { value: 10 },
        { value: 25 },
        { value: 50 },
        { value: 75 },
        { value: 100 },
      ])
    );

    const setIsMilestone = vi.fn();
    const setSeedsEarned = vi.fn();
    const setUnlockedThemeName = vi.fn();
    const setEarnedBadgeName = vi.fn();

    const result = responseEval(
      createEvent(),
      true,
      'real',
      vi.fn(),
      vi.fn(),
      setIsMilestone,
      setSeedsEarned,
      setUnlockedThemeName,
      setEarnedBadgeName
    );

    expect(setIsMilestone).toHaveBeenCalledWith(true);
    expect(setUnlockedThemeName).toHaveBeenCalledWith(null);
    expect(setEarnedBadgeName).toHaveBeenCalledWith(null);
    expect(result.roundSeedsEarned).toBe(26);
    expect(result.milestoneRewardSeedsEarned).toBe(25);
    expect(setSeedsEarned).toHaveBeenCalledWith(26);
    expect(JSON.parse(localStorage.getItem('birdScore')!)).toMatchObject({
      birdsIdentified: 125,
      seeds: 36,
    });
    expect(localStorage.getItem('hasUnseenBadges')).not.toBe('true');
    expect(localStorage.getItem('hasNewThemeUnlock')).not.toBe('true');
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
      activePersonalBestTarget: null,
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
      activePersonalBestTarget: null,
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

  it('marks the first personal-best break only once for eligible streaks', () => {
    localStorage.setItem(
      'birdScore',
      JSON.stringify({
        birdsSeen: 40,
        birdsIdentified: 40,
        currentStreak: 12,
        justAchievedStreak: false,
        bestStreak: 12,
        activePersonalBestTarget: 12,
        seeds: 5,
      })
    );

    const result = responseEval(
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

    expect(result.justBrokeBestStreak).toBe(true);

    localStorage.setItem(
      'birdScore',
      JSON.stringify({
        birdsSeen: 40,
        birdsIdentified: 40,
        currentStreak: 13,
        justAchievedStreak: false,
        bestStreak: 13,
        activePersonalBestTarget: 12,
        seeds: 6,
      })
    );

    const followUp = responseEval(
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

    expect(followUp.justBrokeBestStreak).toBe(false);
  });

  it('flags the first break of an eligible personal best and preserves the chase target', () => {
    localStorage.setItem(
      'birdScore',
      JSON.stringify({
        birdsSeen: 40,
        birdsIdentified: 40,
        currentStreak: 12,
        justAchievedStreak: false,
        bestStreak: 12,
        activePersonalBestTarget: 12,
        seeds: 5,
      })
    );

    const result = responseEval(
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

    expect(result.justBrokeBestStreak).toBe(true);
    expect(result.previousBestStreak).toBe(12);
    expect(JSON.parse(localStorage.getItem('birdScore')!)).toMatchObject({
      currentStreak: 13,
      bestStreak: 13,
      activePersonalBestTarget: 12,
    });
  });

  it('rewards the player when they finally lose a new personal best streak', () => {
    localStorage.setItem(
      'birdScore',
      JSON.stringify({
        birdsSeen: 50,
        birdsIdentified: 45,
        currentStreak: 13,
        justAchievedStreak: false,
        bestStreak: 13,
        activePersonalBestTarget: 12,
        seeds: 8,
      })
    );

    const setSeedsEarned = vi.fn();
    const result = responseEval(
      createEvent(),
      true,
      'fake',
      vi.fn(),
      vi.fn(),
      vi.fn(),
      setSeedsEarned,
      vi.fn(),
      vi.fn()
    );

    expect(result.justLostBestStreak).toBe(true);
    expect(result.personalBestRewardSeeds).toBe(6);
    expect(result.seedsEarned).toBeGreaterThanOrEqual(6);
    expect(setSeedsEarned).toHaveBeenCalledWith(result.seedsEarned);
    expect(JSON.parse(localStorage.getItem('birdScore')!)).toMatchObject({
      currentStreak: 0,
      bestStreak: 13,
      activePersonalBestTarget: null,
      seeds: 14,
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