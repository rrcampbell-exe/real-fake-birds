import type { MissionDefinition } from '@/types';

export const SESSION_MISSIONS_STORAGE_KEY = 'sessionMissions';
export const DAILY_MISSION_COUNT = 3;
export const DAILY_MISSION_BONUS_SEEDS = 15;

export const missionDefinitions: MissionDefinition[] = [
  {
    id: 'warmup-rounds',
    description: 'Play 3 rounds today.',
    toastDescription: 'You played 3 rounds today.',
    type: 'play_rounds',
    target: 3,
    rewardSeeds: 8,
  },
  {
    id: 'full-flight',
    description: 'Play 5 rounds today.',
    toastDescription: 'You played 5 rounds today.',
    type: 'play_rounds',
    target: 5,
    rewardSeeds: 12,
  },
  {
    id: 'sharp-eyes',
    description: 'Get 3 birds right.',
    toastDescription: 'You got 3 birds right.',
    type: 'correct_answers',
    target: 3,
    rewardSeeds: 10,
  },
  {
    id: 'no-peeking',
    description: 'Identify 2 birds without hints.',
    toastDescription: 'You identified 2 birds without hints.',
    type: 'correct_without_hints',
    target: 2,
    rewardSeeds: 14,
  },
  {
    id: 'deep-focus',
    description: 'Identify 4 birds without hints.',
    toastDescription: 'You identified 4 birds without hints.',
    type: 'correct_without_hints',
    target: 4,
    rewardSeeds: 20,
  },
  {
    id: 'field-notes',
    description: 'Use 2 hints to study the flock.',
    toastDescription: 'You used 2 hints to study the flock.',
    type: 'use_hints',
    target: 2,
    rewardSeeds: 8,
  },
  {
    id: 'seed-harvest',
    description: 'Earn 12 seeds today.',
    toastDescription: 'You earned 12 seeds today.',
    type: 'earn_seeds',
    target: 12,
    rewardSeeds: 12,
  },
  {
    id: 'real-deal',
    description: 'Correctly spot 2 real birds.',
    toastDescription: 'You correctly spotted 2 real birds.',
    type: 'identify_real_birds',
    target: 2,
    rewardSeeds: 10,
  },
  {
    id: 'fraud-watch',
    description: 'Correctly expose 2 fake birds.',
    toastDescription: 'You correctly exposed 2 fake birds.',
    type: 'identify_fake_birds',
    target: 2,
    rewardSeeds: 10,
  },
];