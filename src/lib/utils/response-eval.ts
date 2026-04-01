import { localStorageCheck } from './local-storage-check';
import { streakValues } from '../constants/streaks';
import { milestones } from '../constants/milestones';
import { getThemeUnlockByMilestoneValue } from '../constants/theme-unlocks';
import {
  BIRD_MILESTONES_STORAGE_KEY,
  NEW_THEME_UNLOCK_STORAGE_KEY,
  UNSEEN_BADGES_STORAGE_KEY,
  defaultBirdScore,
  getEarnedMilestonesForBirds,
  getUnlockedThemeNames,
  readBirdScore,
  setStoredBoolean,
  unlockThemeName,
  writeBirdScore,
} from './player-progress';

function calculateSeedReward(currentStreak: number): number {
  if (!streakValues.includes(currentStreak)) return 0;

  return streakValues
    .filter((value) => value <= currentStreak)
    .reduce((totalSeeds, value) => totalSeeds + value, 0);
}

const streakEval = (currentStreak: number, setIsStreak: (val: boolean) => void): number => {
  const isStreakMilestone = streakValues.includes(currentStreak);
  setIsStreak(isStreakMilestone);
  localStorage.setItem('birdStreakAchieved', JSON.stringify(isStreakMilestone));

  return calculateSeedReward(currentStreak);
};

const milestoneEval = (
  birdsIdentified: number,
  existingUnlockedThemeNames: Set<string>,
  setIsMilestone: (val: boolean) => void
): { unlockedThemeName: string | null; earnedBadgeName: string | null } => {
  const earnedMilestones = getEarnedMilestonesForBirds(birdsIdentified);

  const stored = localStorage.getItem(BIRD_MILESTONES_STORAGE_KEY);
  const previousCount = stored ? (JSON.parse(stored) as unknown[]).length : 0;
  let unlockedThemeName: string | null = null;
  let earnedBadgeName: string | null = null;

  if (earnedMilestones.length > previousCount) {
    setIsMilestone(true);
    localStorage.setItem('birdMilestoneAchieved', 'true');
    setStoredBoolean(UNSEEN_BADGES_STORAGE_KEY, true);

    const latestMilestone = earnedMilestones[earnedMilestones.length - 1];
    earnedBadgeName = latestMilestone.badge;
    const themeUnlock = getThemeUnlockByMilestoneValue(latestMilestone.value);
    if (themeUnlock && !themeUnlock.comingSoon) {
      if (!existingUnlockedThemeNames.has(themeUnlock.themeName)) {
        unlockThemeName(themeUnlock.themeName);
        unlockedThemeName = themeUnlock.themeName;
        setStoredBoolean(NEW_THEME_UNLOCK_STORAGE_KEY, true);
      }
    }
  } else {
    setIsMilestone(false);
  }

  localStorage.setItem(BIRD_MILESTONES_STORAGE_KEY, JSON.stringify(earnedMilestones));
  return { unlockedThemeName, earnedBadgeName };
};

const responseEval = (
  e: React.FormEvent,
  isReal: boolean,
  chosenResponse: 'real' | 'fake',
  setIsCorrect: (val: boolean) => void,
  setIsStreak: (val: boolean) => void,
  setIsMilestone: (val: boolean) => void,
  setSeedsEarned: (val: number) => void,
  setUnlockedThemeName: (val: string | null) => void,
  setEarnedBadgeName: (val: string | null) => void
) => {
  e.preventDefault();

  const hasLocalStorage = localStorageCheck();
  const isCorrect =
    (isReal && chosenResponse === 'real') ||
    (!isReal && chosenResponse === 'fake');
  if (isCorrect) setIsCorrect(true);

  if (!hasLocalStorage) {
    writeBirdScore(defaultBirdScore);
  }

  if (isCorrect) {
    const birdScore = readBirdScore();
    const existingUnlockedThemeNames = new Set(getUnlockedThemeNames(birdScore));
    let { birdsSeen, birdsIdentified, currentStreak, bestStreak, seeds } = birdScore;
    const { justAchievedStreak } = birdScore;

    birdsSeen = birdsSeen + 1;
    birdsIdentified = birdsIdentified + 1;
    currentStreak = currentStreak + 1;
    bestStreak = currentStreak > bestStreak ? currentStreak : bestStreak;

    const seedsEarned = streakEval(currentStreak, setIsStreak);
    seeds = seeds + seedsEarned;

    const updatedBirdScore = {
      birdsSeen,
      birdsIdentified,
      currentStreak,
      justAchievedStreak,
      bestStreak,
      seeds,
    };

    writeBirdScore(updatedBirdScore);

    setSeedsEarned(seedsEarned);
    const milestoneResult = milestoneEval(
      updatedBirdScore.birdsIdentified,
      existingUnlockedThemeNames,
      setIsMilestone
    );
    setUnlockedThemeName(milestoneResult.unlockedThemeName);
    setEarnedBadgeName(milestoneResult.earnedBadgeName);

    return;
  }

  const birdScore = readBirdScore();
  let { birdsSeen } = birdScore;
  const { bestStreak } = birdScore;
  const { birdsIdentified, seeds } = birdScore;

  birdsSeen = birdsSeen + 1;

  const updatedBirdScore = {
    birdsSeen,
    birdsIdentified,
    currentStreak: 0,
    bestStreak,
    justAchievedStreak: false,
    seeds,
  };

  setSeedsEarned(0);
  setUnlockedThemeName(null);
  setEarnedBadgeName(null);
  writeBirdScore(updatedBirdScore);
};

export default responseEval;
