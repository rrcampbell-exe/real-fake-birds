import type { WeeklyChallengeDefinition, WeeklyChallengeId } from '@/types';

const WEEKLY_CHALLENGE_DEFINITIONS: WeeklyChallengeDefinition[] = [
  {
    id: 'seed-collector',
    name: 'Seed Collector',
    description: 'Gather more seeds this week than anyone else.',
    icon: 'sprout',
    primaryLabel: 'Seeds earned',
    tiebreakerLabel: 'Accuracy',
    metric: 'weeklySeedsEarned',
    tiebreakerMetric: 'accuracy',
  },
  {
    id: 'plumage-precision',
    name: 'Plumage Precision',
    description: 'Post the sharpest accuracy over a full slate of birds.',
    icon: 'target',
    primaryLabel: 'Accuracy',
    tiebreakerLabel: 'Birds seen',
    qualificationText: 'See at least 50 birds this week to qualify for the leaderboard.',
    metric: 'accuracy',
    tiebreakerMetric: 'weeklyBirdsSeen',
    minimumBirdsSeen: 50,
  },
  {
    id: 'on-fire',
    name: 'On Fire',
    description: 'Build the longest guessing streak of the week.',
    icon: 'flame',
    primaryLabel: 'Best streak',
    tiebreakerLabel: 'Birds identified',
    metric: 'weeklyBestStreak',
    tiebreakerMetric: 'weeklyBirdsIdentified',
  },
  {
    id: 'explorer',
    name: 'Explorer',
    description: 'Find the most brand-new birds for your journal this week.',
    icon: 'binoculars',
    primaryLabel: 'New birds discovered',
    tiebreakerLabel: 'Unique birds seen',
    metric: 'weeklyNewBirdsDiscovered',
    tiebreakerMetric: 'weeklyUniqueBirdsSeen',
  },
  {
    id: 'fake-spotter',
    name: 'Fake Spotter',
    description: 'Catch more impostors than anybody else.',
    icon: 'masks',
    primaryLabel: 'Fake birds identified',
    tiebreakerLabel: 'Accuracy',
    metric: 'weeklyFakeBirdsIdentified',
    tiebreakerMetric: 'accuracy',
  },
  {
    id: 'real-recognizer',
    name: 'Real Recognizer',
    description: 'Correctly name the most genuine birds this week.',
    icon: 'feather',
    primaryLabel: 'Real birds identified',
    tiebreakerLabel: 'Accuracy',
    metric: 'weeklyRealBirdsIdentified',
    tiebreakerMetric: 'accuracy',
  },
  {
    id: 'completionist',
    name: 'Completionist',
    description: 'See the widest variety of birds this week.',
    icon: 'collection',
    primaryLabel: 'Unique birds seen',
    tiebreakerLabel: 'Birds seen',
    metric: 'weeklyUniqueBirdsSeen',
    tiebreakerMetric: 'weeklyBirdsSeen',
  },
  {
    id: 'birdwatcher',
    name: 'Birdwatcher',
    description: 'Rack up the biggest number of total sightings this week.',
    icon: 'bird',
    primaryLabel: 'Birds seen',
    tiebreakerLabel: 'Accuracy',
    metric: 'weeklyBirdsSeen',
    tiebreakerMetric: 'accuracy',
  },
];

function hashString(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash;
}

function createSeededRandom(seed: number): () => number {
  let current = seed || 1;

  return () => {
    current |= 0;
    current = (current + 0x6D2B79F5) | 0;
    let result = Math.imul(current ^ (current >>> 15), 1 | current);
    result ^= result + Math.imul(result ^ (result >>> 7), 61 | result);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

function shiftIsoDateByDays(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split('-').map((value) => Number.parseInt(value, 10));
  const utcDate = new Date(Date.UTC(year, month - 1, day, 12));
  utcDate.setUTCDate(utcDate.getUTCDate() + days);
  return utcDate.toISOString().slice(0, 10);
}

function getShuffledChallenges(seedSource: string): WeeklyChallengeDefinition[] {
  const nextRandom = createSeededRandom(hashString(seedSource));
  const shuffled = [...WEEKLY_CHALLENGE_DEFINITIONS];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(nextRandom() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled;
}

export const WEEKLY_CHALLENGE_IDS = WEEKLY_CHALLENGE_DEFINITIONS.map((challenge) => challenge.id);

export function getWeeklyChallengeById(id: WeeklyChallengeId): WeeklyChallengeDefinition {
  return WEEKLY_CHALLENGE_DEFINITIONS.find((challenge) => challenge.id === id) ?? WEEKLY_CHALLENGE_DEFINITIONS[0];
}

export function getWeeklyChallengeForWeek(weekStart: string): WeeklyChallengeDefinition {
  const shuffled = getShuffledChallenges(weekStart);
  const candidate = shuffled[0];
  const previousWeekChallengeId = getShuffledChallenges(shiftIsoDateByDays(weekStart, -7))[0]?.id;

  if (candidate && candidate.id !== previousWeekChallengeId) {
    return candidate;
  }

  return shuffled[1] ?? candidate ?? WEEKLY_CHALLENGE_DEFINITIONS[0];
}
