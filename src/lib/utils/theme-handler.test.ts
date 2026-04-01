import { describe, expect, it } from 'vitest';
import { cardinal, flamingo, finch, oriole } from '@/lib/themes';
import { getTheme, getUnlockedThemes, resolveTheme, setTheme } from './theme-handler';

describe('theme-handler', () => {
  it('stores the selected theme', () => {
    localStorage.setItem(
      'birdScore',
      JSON.stringify({
        birdsSeen: 500,
        birdsIdentified: 350,
        currentStreak: 0,
        justAchievedStreak: false,
        bestStreak: 20,
        seeds: 0,
      })
    );

    setTheme(cardinal);
    expect(localStorage.getItem('birdTheme')).toBe(JSON.stringify(cardinal));
  });

  it('returns the stored theme when it is recognized and unlocked', () => {
    localStorage.setItem(
      'birdScore',
      JSON.stringify({
        birdsSeen: 250,
        birdsIdentified: 200,
        currentStreak: 0,
        justAchievedStreak: false,
        bestStreak: 20,
        seeds: 0,
      })
    );
    localStorage.setItem('birdTheme', JSON.stringify(oriole));
    expect(getTheme()).toEqual(oriole);
  });

  it('falls back to finch when stored data is invalid', () => {
    localStorage.setItem('birdTheme', '{bad json');
    expect(getTheme()).toEqual(finch);
  });

  it('falls back to finch when stored theme name is unknown', () => {
    localStorage.setItem(
      'birdTheme',
      JSON.stringify({ ...flamingo, name: 'NotABird' })
    );
    expect(getTheme()).toEqual(finch);
  });

  it('resolves a stored theme name to the latest theme definition', () => {
    localStorage.setItem(
      'birdScore',
      JSON.stringify({
        birdsSeen: 250,
        birdsIdentified: 200,
        currentStreak: 0,
        justAchievedStreak: false,
        bestStreak: 20,
        seeds: 0,
      })
    );
    localStorage.setItem(
      'birdTheme',
      JSON.stringify({
        name: 'Oriole',
        primary: '#C43E00',
        secondary: '#FFF176',
        textColor: '#3B1A00',
        realFakeTextColor: '#5C2600',
        themeSong: '/sounds/themes/finch.mp3',
      })
    );

    expect(getTheme()).toEqual(oriole);
  });

  it('resolveTheme() returns the canonical theme by name', () => {
    localStorage.setItem(
      'birdScore',
      JSON.stringify({
        birdsSeen: 250,
        birdsIdentified: 200,
        currentStreak: 0,
        justAchievedStreak: false,
        bestStreak: 20,
        seeds: 0,
      })
    );
    expect(resolveTheme({ name: 'Oriole' })).toEqual(oriole);
  });

  it('falls back to finch when a stored theme is not live yet', () => {
    localStorage.setItem('birdTheme', JSON.stringify(flamingo));
    expect(getTheme()).toEqual(finch);
  });

  it('returns only unlocked live themes', () => {
    localStorage.setItem(
      'birdScore',
      JSON.stringify({
        birdsSeen: 500,
        birdsIdentified: 350,
        currentStreak: 0,
        justAchievedStreak: false,
        bestStreak: 20,
        seeds: 0,
      })
    );

    expect(getUnlockedThemes().map((theme) => theme.name)).toEqual([
      'Finch',
      'Raven',
      'Robin',
      'Gull',
      'Crane',
      'Woodpecker',
      'Blue Jay',
      'Oriole',
      'Heron',
      'Cardinal',
    ]);
  });
});