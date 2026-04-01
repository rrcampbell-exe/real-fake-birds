import { describe, expect, it } from 'vitest';
import {
  defaultBirdScore,
  getUnlockedThemeNames,
  migrateStoredPlayerProgress,
  normalizeBirdScore,
} from './player-progress';

describe('player-progress', () => {
  it('normalizes missing seed balances for existing players', () => {
    expect(
      normalizeBirdScore({
        birdsSeen: 10,
        birdsIdentified: 7,
        currentStreak: 3,
        bestStreak: 4,
        justAchievedStreak: false,
      })
    ).toEqual({
      ...defaultBirdScore,
      birdsSeen: 10,
      birdsIdentified: 7,
      currentStreak: 3,
      bestStreak: 4,
    });
  });

  it('treats milestone-earned live themes as unlocked even without purchase history', () => {
    expect(
      getUnlockedThemeNames({
        ...defaultBirdScore,
        birdsIdentified: 350,
      })
    ).toEqual([
      'Blue Jay',
      'Cardinal',
      'Crane',
      'Finch',
      'Gull',
      'Heron',
      'Oriole',
      'Raven',
      'Robin',
      'Woodpecker',
    ]);
  });

  it('migrates existing players by adding seeds, milestone themes, and a safe current theme', () => {
    localStorage.setItem(
      'birdScore',
      JSON.stringify({
        birdsSeen: 500,
        birdsIdentified: 350,
        currentStreak: 8,
        bestStreak: 24,
        justAchievedStreak: false,
      })
    );
    localStorage.setItem('birdTheme', JSON.stringify({ name: 'Flamingo' }));

    const migration = migrateStoredPlayerProgress();

    expect(migration.score.seeds).toBe(0);
    expect(migration.unlockedThemes).toContain('Cardinal');
    expect(migration.unlockedThemes).not.toContain('Flamingo');
    expect(migration.selectedThemeName).toBe('Finch');
    expect(JSON.parse(localStorage.getItem('birdTheme')!)).toMatchObject({ name: 'Finch' });
  });
});