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
    text: `My ${APP_NAME} stats: best streak ${options.bestStreak}, current streak ${options.currentStreak}, ${options.birdsIdentified} birds identified, ${options.accuracy}% accuracy.`,
  };
}

export function buildDailyChallengeSharePayload(state: DailyChallengeState): SharePayload {
  return {
    title: `${APP_NAME} daily challenge`,
    text: `I scored ${state.correctAnswers}/${DAILY_CHALLENGE_CONFIG.roundCount} on today's ${APP_NAME} Daily Challenge.`,
  };
}