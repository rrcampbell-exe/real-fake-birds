import { localStorageCheck } from './local-storage-check';
import { getStreakReward, isStreakCheckpoint } from '../constants/streaks';
import { getThemeUnlockByMilestoneValue } from '../constants/theme-unlocks';
import { track } from '@/lib/analytics';
import { applyRoundToSessionMissions } from './missions';
import { consumeStreakInsurance, expireStreakInsuranceAfterGuess } from './streak-insurance';
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
import type { GameMode, GameRoundResult, HintType } from '@/types';

const BASE_CORRECT_SEED_REWARD = 1;

function calculateStreakSeedReward(currentStreak: number): number {
  return getStreakReward(currentStreak);
}

const streakEval = (currentStreak: number, setIsStreak: (val: boolean) => void): number => {
  const isStreakMilestone = isStreakCheckpoint(currentStreak);
  setIsStreak(isStreakMilestone);
  localStorage.setItem('birdStreakAchieved', JSON.stringify(isStreakMilestone));

  return calculateStreakSeedReward(currentStreak);
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
  setEarnedBadgeName: (val: string | null) => void,
  options?: {
    mode?: GameMode;
    usedHintTypes?: HintType[];
    onRoundResolved?: (result: GameRoundResult) => void;
  }
): GameRoundResult => {
  e.preventDefault();

  const hasLocalStorage = localStorageCheck();
  const usedHintTypes = options?.usedHintTypes ?? [];
  const mode = options?.mode ?? 'classic';
  const isCorrect =
    (isReal && chosenResponse === 'real') ||
    (!isReal && chosenResponse === 'fake');
  setIsCorrect(isCorrect);

  if (!hasLocalStorage) {
    writeBirdScore(defaultBirdScore);
  }

  if (isCorrect) {
    const birdScore = readBirdScore();
    expireStreakInsuranceAfterGuess();
    const existingUnlockedThemeNames = new Set(getUnlockedThemeNames(birdScore));
    let { birdsSeen, birdsIdentified, currentStreak, bestStreak, seeds } = birdScore;
    const { justAchievedStreak } = birdScore;

    birdsSeen = birdsSeen + 1;
    birdsIdentified = birdsIdentified + 1;
    currentStreak = currentStreak + 1;
    bestStreak = currentStreak > bestStreak ? currentStreak : bestStreak;

    const streakSeedsEarned = streakEval(currentStreak, setIsStreak);
    const roundSeedsEarned = BASE_CORRECT_SEED_REWARD + streakSeedsEarned;
    seeds = seeds + roundSeedsEarned;

    const updatedBirdScore = {
      ...birdScore,
      birdsSeen,
      birdsIdentified,
      currentStreak,
      justAchievedStreak,
      bestStreak,
      seeds,
    };

    writeBirdScore(updatedBirdScore);

    const milestoneResult = milestoneEval(
      updatedBirdScore.birdsIdentified,
      existingUnlockedThemeNames,
      setIsMilestone
    );
    setUnlockedThemeName(milestoneResult.unlockedThemeName);
    setEarnedBadgeName(milestoneResult.earnedBadgeName);

    const result = {
      isCorrect: true,
      isReal,
      chosenResponse,
      roundSeedsEarned,
      seedsEarned: roundSeedsEarned,
      currentStreak,
      bestStreak,
      birdsSeen,
      birdsIdentified,
      usedHintTypes,
      streakProtected: false,
      earnedBadgeName: milestoneResult.earnedBadgeName,
      unlockedThemeName: milestoneResult.unlockedThemeName,
      missionRewards: [],
      missionSetBonusSeedsEarned: 0,
      completedDailyMissionSet: false,
      dailyMissionStreak: null,
    } satisfies GameRoundResult;

    track('game_round_complete', {
      mode,
      is_correct: true,
      is_real: isReal,
      hint_count: usedHintTypes.length,
      seeds_earned: roundSeedsEarned,
      current_streak: currentStreak,
      birds_identified: birdsIdentified,
    });

    if (currentStreak > 1 && isStreakCheckpoint(currentStreak)) {
      track('streak_achieved', { mode, current_streak: currentStreak, seeds_earned: roundSeedsEarned });
    }

    if (milestoneResult.earnedBadgeName) {
      track('milestone_reached', {
        mode,
        badge_name: milestoneResult.earnedBadgeName,
        birds_identified: birdsIdentified,
      });
    }

    if (milestoneResult.unlockedThemeName) {
      track('theme_unlocked', {
        mode,
        theme_name: milestoneResult.unlockedThemeName,
        birds_identified: birdsIdentified,
      });
    }

    const missionUpdate = applyRoundToSessionMissions(result);
    const { newlyCompletedMissionIds } = missionUpdate;
    newlyCompletedMissionIds.forEach((missionId) => {
      track('mission_completed', { mission_id: missionId, mode });
    });

    const missionSeedsEarned = missionUpdate.totalRewardSeeds;
    const finalResult = {
      ...result,
      seedsEarned: roundSeedsEarned + missionSeedsEarned,
      missionRewards: missionUpdate.missionRewards,
      missionSetBonusSeedsEarned: missionUpdate.missionSetBonusSeedsEarned,
      completedDailyMissionSet: missionUpdate.completedDailyMissionSet,
      dailyMissionStreak: missionUpdate.dailyMissionStreak,
    } satisfies GameRoundResult;

    setSeedsEarned(finalResult.seedsEarned);

    options?.onRoundResolved?.(finalResult);

    return finalResult;
  }

  const birdScore = readBirdScore();
  let { birdsSeen } = birdScore;
  const { bestStreak } = birdScore;
  const { birdsIdentified, seeds } = birdScore;
  const streakProtected = consumeStreakInsurance();

  birdsSeen = birdsSeen + 1;

  const updatedBirdScore = {
    ...birdScore,
    birdsSeen,
    birdsIdentified,
    currentStreak: streakProtected ? birdScore.currentStreak : 0,
    bestStreak,
    justAchievedStreak: false,
    seeds,
  };

  setIsStreak(false);
  setIsMilestone(false);
  setSeedsEarned(0);
  setUnlockedThemeName(null);
  setEarnedBadgeName(null);
  writeBirdScore(updatedBirdScore);

  const result = {
    isCorrect: false,
    isReal,
    chosenResponse,
    roundSeedsEarned: 0,
    seedsEarned: 0,
    currentStreak: updatedBirdScore.currentStreak,
    bestStreak,
    birdsSeen,
    birdsIdentified,
    usedHintTypes,
    streakProtected,
    earnedBadgeName: null,
    unlockedThemeName: null,
    missionRewards: [],
    missionSetBonusSeedsEarned: 0,
    completedDailyMissionSet: false,
    dailyMissionStreak: null,
  } satisfies GameRoundResult;

  track('game_round_complete', {
    mode,
    is_correct: false,
    is_real: isReal,
    hint_count: usedHintTypes.length,
    seeds_earned: 0,
    current_streak: updatedBirdScore.currentStreak,
    streak_protected: streakProtected,
  });

  if (streakProtected) {
    track('streak_insurance_consumed', {
      mode,
      preserved_streak: updatedBirdScore.currentStreak,
    });
  }

  const missionUpdate = applyRoundToSessionMissions(result);
  const { newlyCompletedMissionIds } = missionUpdate;
  newlyCompletedMissionIds.forEach((missionId) => {
    track('mission_completed', { mission_id: missionId, mode });
  });

  const finalResult = {
    ...result,
    seedsEarned: missionUpdate.totalRewardSeeds,
    missionRewards: missionUpdate.missionRewards,
    missionSetBonusSeedsEarned: missionUpdate.missionSetBonusSeedsEarned,
    completedDailyMissionSet: missionUpdate.completedDailyMissionSet,
    dailyMissionStreak: missionUpdate.dailyMissionStreak,
  } satisfies GameRoundResult;

  setSeedsEarned(finalResult.seedsEarned);

  options?.onRoundResolved?.(finalResult);

  return finalResult;
};

export default responseEval;
