import { DAILY_CHALLENGE_CONFIG } from '@/lib/constants/daily-challenge';
import type { DailyChallengeState, SharePayload } from '@/types';

const APP_NAME = 'Real Fake Birds';

export function buildRoundSharePayload(options: {
  birdName: string;
  isReal: boolean;
  isCorrect: boolean;
  currentStreak?: number;
  earnedBadgeName?: string | null;
}): SharePayload {
  const resultText = options.isCorrect ? 'nailed' : 'missed';
  const authenticityText = options.isReal ? 'real' : 'fake';
  const streakText = options.currentStreak && options.currentStreak > 1
    ? ` Current streak: ${options.currentStreak}.`
    : '';
  const badgeText = options.earnedBadgeName ? ` Just earned the ${options.earnedBadgeName} badge.` : '';

  return {
    title: `${APP_NAME} round result`,
    text: `I ${resultText} ${options.birdName} as a ${authenticityText} bird in ${APP_NAME}.${streakText}${badgeText}`,
  };
}

export function buildMilestoneSharePayload(options: {
  badgeName: string;
  birdsIdentified: number;
}): SharePayload {
  return {
    title: `${APP_NAME} milestone`,
    text: `I unlocked the ${options.badgeName} badge in ${APP_NAME} after identifying ${options.birdsIdentified} birds.`,
  };
}

export function buildStatsSharePayload(options: {
  bestStreak: number;
  currentStreak: number;
  birdsIdentified: number;
  accuracy: number;
}): SharePayload {
  return {
    title: `${APP_NAME} stats`,
    text: `My ${APP_NAME} stats: best guess streak ${options.bestStreak}, current guess streak ${options.currentStreak}, ${options.birdsIdentified} birds identified, ${options.accuracy}% accuracy.`,
  };
}

export function buildDailyChallengeSharePayload(state: DailyChallengeState): SharePayload {
  return {
    title: `${APP_NAME} daily challenge`,
    text: `I scored ${state.correctAnswers}/${DAILY_CHALLENGE_CONFIG.roundCount} on today's ${APP_NAME} Daily Challenge.`,
  };
}

export function buildDailyMissionSharePayload(options: {
  currentStreak: number;
  completedCount: number;
  missionCount: number;
}): SharePayload {
  const streakText = options.currentStreak > 0
    ? ` and kept my streak alive at ${options.currentStreak} day${options.currentStreak === 1 ? '' : 's'}`
    : '';

  return {
    title: `${APP_NAME} daily missions`,
    text: `I completed ${options.completedCount}/${options.missionCount} daily missions in ${APP_NAME}${streakText}.`,
  };
}

export function buildWeeklyLeaderboardSharePayload(options: {
  challengeName: string;
  rank: number;
  isFinal: boolean;
}): SharePayload {
  const verb = options.isFinal ? 'finished' : 'am currently sitting';
  const timeframe = options.isFinal ? "last week's" : "this week's";

  return {
    title: `${APP_NAME} leaderboard`,
    text: `I ${verb} at #${options.rank} in ${timeframe} ${options.challengeName} challenge on ${APP_NAME}.`,
  };
}

export function buildWeeklyChampionSharePayload(options: {
  firstPlaceCount: number;
  secondPlaceCount: number;
  thirdPlaceCount: number;
}): SharePayload {
  const totalPodiums = options.firstPlaceCount + options.secondPlaceCount + options.thirdPlaceCount;

  return {
    title: `${APP_NAME} podiums`,
    text: `I've landed ${totalPodiums} weekly podium finish${totalPodiums === 1 ? '' : 'es'} in ${APP_NAME}: ${options.firstPlaceCount} gold, ${options.secondPlaceCount} silver, ${options.thirdPlaceCount} bronze.`,
  };
}