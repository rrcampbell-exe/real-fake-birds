import type { BirdScore, Milestone } from '@/types';
import { notifyStoredValueChanged } from '@/hooks/useStoredValue';
import { milestones } from '@/lib/constants/milestones';
import {
  getThemeUnlockByThemeName,
  themeUnlocks,
} from '@/lib/constants/theme-unlocks';
import { finch, themes } from '@/lib/themes';

export const BIRD_SCORE_STORAGE_KEY = 'birdScore';
export const BIRD_MILESTONES_STORAGE_KEY = 'birdMilestonesArray';
export const UNLOCKED_THEMES_STORAGE_KEY = 'unlockedThemes';
export const UNSEEN_BADGES_STORAGE_KEY = 'hasUnseenBadges';
export const NEW_THEME_UNLOCK_STORAGE_KEY = 'hasNewThemeUnlock';

export const defaultBirdScore: BirdScore = {
  birdsSeen: 0,
  birdsIdentified: 0,
  currentStreak: 0,
  justAchievedStreak: false,
  bestStreak: 0,
  activePersonalBestTarget: null,
  currentDailyStreak: 0,
  bestDailyStreak: 0,
  seeds: 0,
};

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function uniqueThemeNames(themeNames: string[]): string[] {
  return Array.from(new Set(themeNames)).sort((left, right) => left.localeCompare(right));
}

function arraysEqual(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function parseStoredThemeNames(raw: string | null): string[] {
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as unknown;

    if (!Array.isArray(parsed)) return [];

    return uniqueThemeNames(
      parsed.filter((value): value is string => typeof value === 'string').filter((themeName) => {
        const themeUnlock = getThemeUnlockByThemeName(themeName);
        return Boolean(themeUnlock && !themeUnlock.comingSoon);
      })
    );
  } catch {
    return [];
  }
}

export function normalizeBirdScore(scoreLike: Partial<BirdScore> | null | undefined): BirdScore {
  return {
    birdsSeen: isFiniteNumber(scoreLike?.birdsSeen) ? scoreLike.birdsSeen : 0,
    birdsIdentified: isFiniteNumber(scoreLike?.birdsIdentified) ? scoreLike.birdsIdentified : 0,
    currentStreak: isFiniteNumber(scoreLike?.currentStreak) ? scoreLike.currentStreak : 0,
    justAchievedStreak:
      typeof scoreLike?.justAchievedStreak === 'boolean' ? scoreLike.justAchievedStreak : false,
    bestStreak: isFiniteNumber(scoreLike?.bestStreak) ? scoreLike.bestStreak : 0,
    activePersonalBestTarget: isFiniteNumber(scoreLike?.activePersonalBestTarget)
      ? scoreLike.activePersonalBestTarget
      : null,
    currentDailyStreak: isFiniteNumber(scoreLike?.currentDailyStreak)
      ? scoreLike.currentDailyStreak
      : 0,
    bestDailyStreak: isFiniteNumber(scoreLike?.bestDailyStreak) ? scoreLike.bestDailyStreak : 0,
    seeds: isFiniteNumber(scoreLike?.seeds) ? scoreLike.seeds : 0,
  };
}

export function mergeBirdScore(
  scoreLike: Partial<BirdScore> | null | undefined,
  baseScore: Partial<BirdScore> | null | undefined = readBirdScore()
): BirdScore {
  return normalizeBirdScore({
    ...normalizeBirdScore(baseScore),
    ...(scoreLike ?? {}),
  });
}

export function mergeNonRoundRemoteScore(
  scoreLike: Partial<BirdScore> | null | undefined,
  localScore: BirdScore = readBirdScore()
): BirdScore {
  const remoteScore = mergeBirdScore(scoreLike, localScore);

  return normalizeBirdScore({
    ...localScore,
    ...remoteScore,
    birdsSeen: Math.max(localScore.birdsSeen, remoteScore.birdsSeen),
    birdsIdentified: Math.max(localScore.birdsIdentified, remoteScore.birdsIdentified),
    currentStreak: localScore.currentStreak,
    justAchievedStreak: localScore.justAchievedStreak,
    bestStreak: Math.max(localScore.bestStreak, remoteScore.bestStreak),
    activePersonalBestTarget: localScore.activePersonalBestTarget,
    currentDailyStreak: Math.max(localScore.currentDailyStreak, remoteScore.currentDailyStreak),
    bestDailyStreak: Math.max(localScore.bestDailyStreak, remoteScore.bestDailyStreak),
  });
}

export function readBirdScore(): BirdScore {
  if (typeof window === 'undefined') return defaultBirdScore;

  const raw = localStorage.getItem(BIRD_SCORE_STORAGE_KEY);
  if (!raw) return defaultBirdScore;

  try {
    return normalizeBirdScore(JSON.parse(raw) as Partial<BirdScore>);
  } catch {
    return defaultBirdScore;
  }
}

export function writeBirdScore(scoreLike: Partial<BirdScore>, notify = true): BirdScore {
  const score = mergeBirdScore(scoreLike);
  localStorage.setItem(BIRD_SCORE_STORAGE_KEY, JSON.stringify(score));

  if (notify) {
    notifyStoredValueChanged(BIRD_SCORE_STORAGE_KEY);
  }

  return score;
}

export function setStoredBoolean(key: string, value: boolean, notify = true): void {
  localStorage.setItem(key, JSON.stringify(value));

  if (notify) {
    notifyStoredValueChanged(key);
  }
}

export function getEarnedMilestonesForBirds(birdsIdentified: number): Milestone[] {
  return milestones.filter((milestone) => milestone.value <= birdsIdentified);
}

export function getPurchasedThemeNames(): string[] {
  if (typeof window === 'undefined') return [];
  return parseStoredThemeNames(localStorage.getItem(UNLOCKED_THEMES_STORAGE_KEY));
}

export function getMilestoneUnlockedThemeNames(birdsIdentified: number): string[] {
  return themeUnlocks
    .filter((themeUnlock) => !themeUnlock.comingSoon && themeUnlock.milestoneValue <= birdsIdentified)
    .map((themeUnlock) => themeUnlock.themeName);
}

export function getUnlockedThemeNames(scoreLike?: Partial<BirdScore> | null): string[] {
  const score = scoreLike ? normalizeBirdScore(scoreLike) : readBirdScore();

  return uniqueThemeNames([
    finch.name,
    ...getMilestoneUnlockedThemeNames(score.birdsIdentified),
    ...getPurchasedThemeNames(),
  ]);
}

export function isThemeUnlocked(themeName: string, scoreLike?: Partial<BirdScore> | null): boolean {
  return getUnlockedThemeNames(scoreLike).includes(themeName);
}

export function setUnlockedThemeNames(themeNames: string[], notify = true): string[] {
  const normalizedThemeNames = uniqueThemeNames(
    themeNames.filter((themeName) => {
      const themeUnlock = getThemeUnlockByThemeName(themeName);
      return Boolean(themeUnlock && !themeUnlock.comingSoon);
    })
  );

  localStorage.setItem(UNLOCKED_THEMES_STORAGE_KEY, JSON.stringify(normalizedThemeNames));

  if (notify) {
    notifyStoredValueChanged(UNLOCKED_THEMES_STORAGE_KEY);
  }

  return normalizedThemeNames;
}

export function unlockThemeName(themeName: string, notify = true): string[] {
  const themeUnlock = getThemeUnlockByThemeName(themeName);
  if (!themeUnlock || themeUnlock.comingSoon) {
    return getPurchasedThemeNames();
  }

  return setUnlockedThemeNames([...getPurchasedThemeNames(), themeName], notify);
}

export function migrateStoredPlayerProgress(): {
  score: BirdScore;
  unlockedThemes: string[];
  selectedThemeName: string;
} {
  if (typeof window === 'undefined') {
    return {
      score: defaultBirdScore,
      unlockedThemes: [finch.name],
      selectedThemeName: finch.name,
    };
  }

  const changedKeys = new Set<string>();
  const score = readBirdScore();
  const scoreString = JSON.stringify(score);

  if (localStorage.getItem(BIRD_SCORE_STORAGE_KEY) !== scoreString) {
    localStorage.setItem(BIRD_SCORE_STORAGE_KEY, scoreString);
    changedKeys.add(BIRD_SCORE_STORAGE_KEY);
  }

  const earnedMilestones = getEarnedMilestonesForBirds(score.birdsIdentified);
  const earnedMilestonesString = JSON.stringify(earnedMilestones);
  if (localStorage.getItem(BIRD_MILESTONES_STORAGE_KEY) !== earnedMilestonesString) {
    localStorage.setItem(BIRD_MILESTONES_STORAGE_KEY, earnedMilestonesString);
    changedKeys.add(BIRD_MILESTONES_STORAGE_KEY);
  }

  const mergedUnlockedThemes = uniqueThemeNames([
    ...getPurchasedThemeNames(),
    ...getMilestoneUnlockedThemeNames(score.birdsIdentified),
  ]);
  const storedUnlockedThemes = parseStoredThemeNames(
    localStorage.getItem(UNLOCKED_THEMES_STORAGE_KEY)
  );
  if (!arraysEqual(storedUnlockedThemes, mergedUnlockedThemes)) {
    localStorage.setItem(UNLOCKED_THEMES_STORAGE_KEY, JSON.stringify(mergedUnlockedThemes));
    changedKeys.add(UNLOCKED_THEMES_STORAGE_KEY);
  }

  const storedTheme = localStorage.getItem('birdTheme');
  let selectedThemeName = finch.name;

  if (storedTheme) {
    try {
      const parsed = JSON.parse(storedTheme) as { name?: string };
      const theme = themes.find((currentTheme) => currentTheme.name === parsed?.name);

      if (theme && isThemeUnlocked(theme.name, score)) {
        selectedThemeName = theme.name;
      }
    } catch {
      selectedThemeName = finch.name;
    }
  }

  const selectedTheme = themes.find((theme) => theme.name === selectedThemeName) ?? finch;
  const selectedThemeString = JSON.stringify(selectedTheme);
  if (storedTheme !== selectedThemeString) {
    localStorage.setItem('birdTheme', selectedThemeString);
    changedKeys.add('birdTheme');
  }

  changedKeys.forEach((key) => notifyStoredValueChanged(key));

  return {
    score,
    unlockedThemes: [finch.name, ...mergedUnlockedThemes],
    selectedThemeName,
  };
}