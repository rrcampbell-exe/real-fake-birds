import { describe, expect, it } from 'vitest';
import {
  defaultBirdScore,
  getUnlockedThemeNames,
  mergeNonRoundRemoteScore,
  migrateStoredPlayerProgress,
  normalizeBirdScore,
  writeBirdScore,
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
    expect(migration.score.currentDailyStreak).toBe(0);
    expect(migration.score.bestDailyStreak).toBe(0);
    expect(migration.unlockedThemes).toContain('Cardinal');
    expect(migration.unlockedThemes).not.toContain('Flamingo');
    expect(migration.selectedThemeName).toBe('Finch');
    expect(JSON.parse(localStorage.getItem('birdTheme')!)).toMatchObject({ name: 'Finch' });
  });

  it('preserves existing streak fields when writing a partial bird score update', () => {
    localStorage.setItem(
      'birdScore',
      JSON.stringify({
        birdsSeen: 14,
        birdsIdentified: 10,
        currentStreak: 6,
        justAchievedStreak: false,
        bestStreak: 8,
        currentDailyStreak: 2,
        bestDailyStreak: 4,
        seeds: 12,
      })
    );

    const updated = writeBirdScore({ seeds: 15 });

    expect(updated).toMatchObject({
      birdsSeen: 14,
      birdsIdentified: 10,
      currentStreak: 6,
      bestStreak: 8,
      seeds: 15,
    });
  });

  it('keeps the local classic streak when a non-round remote summary is stale', () => {
    const merged = mergeNonRoundRemoteScore(
      {
        birdsSeen: 7,
        birdsIdentified: 7,
        currentStreak: 0,
        bestStreak: 5,
        currentDailyStreak: 1,
        bestDailyStreak: 1,
        seeds: 20,
      },
      {
        birdsSeen: 12,
        birdsIdentified: 12,
        currentStreak: 6,
        justAchievedStreak: false,
        bestStreak: 6,
        currentDailyStreak: 1,
        bestDailyStreak: 1,
        seeds: 20,
      }
    );

    expect(merged).toMatchObject({
      birdsSeen: 12,
      birdsIdentified: 12,
      currentStreak: 6,
      bestStreak: 6,
      seeds: 20,
    });
  });
});