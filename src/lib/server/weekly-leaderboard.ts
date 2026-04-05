import { getWeeklyChallengeForWeek } from '@/lib/constants/weekly-challenges';
import type {
  WeeklyChallengeDefinition,
  WeeklyChallengeMetric,
  WeeklyLeaderboardEntry,
  WeeklyOverview,
  WeeklyPlacementSummary,
  WeeklyRecap,
} from '@/types';

const numberFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 0,
});

const percentageFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});

export interface WeeklyLeaderboardStatsRow {
  userId: string;
  usernameCanonical: string | null;
  currentWeekStart: string | null;
  weeklyBirdsSeen: number;
  weeklyBirdsIdentified: number;
  weeklySeedsEarned: number;
  weeklyBestStreak: number;
  weeklyNewBirdsDiscovered: number;
  weeklyFakeBirdsIdentified: number;
  weeklyRealBirdsIdentified: number;
  weeklyUniqueBirdsSeen: number;
  weeklySeenBirdKeys: string[];
  previousWeekStart: string | null;
  previousWeekParticipated: boolean;
  previousWeekQualified: boolean;
  previousWeekRank: number | null;
  previousWeekRewardSeeds: number;
}

export interface RankedWeeklyLeaderboard {
  rankedRows: Array<{
    userId: string;
    entry: WeeklyLeaderboardEntry;
  }>;
  entries: WeeklyLeaderboardEntry[];
  currentUserEntry: WeeklyLeaderboardEntry | null;
}

function formatMetricValue(metric: WeeklyChallengeMetric, value: number): string {
  if (metric === 'accuracy') {
    return `${percentageFormatter.format(value)}%`;
  }

  return numberFormatter.format(value);
}

export function calculateWeeklyAccuracy(row: WeeklyLeaderboardStatsRow): number {
  if (row.weeklyBirdsSeen <= 0) {
    return 0;
  }

  return Number(((row.weeklyBirdsIdentified / row.weeklyBirdsSeen) * 100).toFixed(2));
}

export function getMetricValue(row: WeeklyLeaderboardStatsRow, metric: WeeklyChallengeMetric): number {
  switch (metric) {
    case 'accuracy':
      return calculateWeeklyAccuracy(row);
    case 'weeklyBestStreak':
      return row.weeklyBestStreak;
    case 'weeklyBirdsIdentified':
      return row.weeklyBirdsIdentified;
    case 'weeklyBirdsSeen':
      return row.weeklyBirdsSeen;
    case 'weeklyFakeBirdsIdentified':
      return row.weeklyFakeBirdsIdentified;
    case 'weeklyNewBirdsDiscovered':
      return row.weeklyNewBirdsDiscovered;
    case 'weeklyRealBirdsIdentified':
      return row.weeklyRealBirdsIdentified;
    case 'weeklySeedsEarned':
      return row.weeklySeedsEarned;
    case 'weeklyUniqueBirdsSeen':
      return row.weeklyUniqueBirdsSeen;
    default:
      return 0;
  }
}

export function normalizeWeeklySeenBirdKeys(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(new Set(value.filter((item): item is string => typeof item === 'string'))).sort((left, right) => left.localeCompare(right));
}

export function qualifiesForWeeklyChallenge(
  row: WeeklyLeaderboardStatsRow,
  challenge: WeeklyChallengeDefinition
): boolean {
  if ((challenge.minimumBirdsSeen ?? 0) > row.weeklyBirdsSeen) {
    return false;
  }

  return row.weeklyBirdsSeen > 0 && Boolean(row.usernameCanonical);
}

export function rankWeeklyLeaderboardRows(
  rows: WeeklyLeaderboardStatsRow[],
  challenge: WeeklyChallengeDefinition,
  currentUserId?: string | null
): RankedWeeklyLeaderboard {
  const eligibleRows = rows
    .filter((row) => qualifiesForWeeklyChallenge(row, challenge))
    .sort((left, right) => {
      const primaryDelta = getMetricValue(right, challenge.metric) - getMetricValue(left, challenge.metric);
      if (primaryDelta !== 0) {
        return primaryDelta;
      }

      const tiebreakerDelta = getMetricValue(right, challenge.tiebreakerMetric) - getMetricValue(left, challenge.tiebreakerMetric);
      if (tiebreakerDelta !== 0) {
        return tiebreakerDelta;
      }

      return (left.usernameCanonical ?? '').localeCompare(right.usernameCanonical ?? '');
    });

  let previousPrimaryValue: number | null = null;
  let previousTiebreakerValue: number | null = null;
  let currentRank = 0;

  const rankedEntries = eligibleRows.map((row, index) => {
    const primaryValue = getMetricValue(row, challenge.metric);
    const tiebreakerValue = getMetricValue(row, challenge.tiebreakerMetric);

    if (primaryValue !== previousPrimaryValue || tiebreakerValue !== previousTiebreakerValue) {
      currentRank = index + 1;
      previousPrimaryValue = primaryValue;
      previousTiebreakerValue = tiebreakerValue;
    }

    const entry: WeeklyLeaderboardEntry = {
      rank: currentRank,
      username: row.usernameCanonical ?? 'unknown',
      avatarPalette: null,
      primaryValue,
      primaryDisplayValue: formatMetricValue(challenge.metric, primaryValue),
      tiebreakerValue,
      tiebreakerDisplayValue: formatMetricValue(challenge.tiebreakerMetric, tiebreakerValue),
      birdsSeen: row.weeklyBirdsSeen,
      isCurrentUser: row.userId === currentUserId,
    };

    return {
      userId: row.userId,
      entry,
    };
  });

  const currentUserEntry = rankedEntries.find((item) => item.userId === currentUserId)?.entry ?? null;

  return {
    rankedRows: rankedEntries,
    entries: rankedEntries.map((item) => item.entry),
    currentUserEntry,
  };
}

export function getWeeklyRewardSeeds(rank: number | null): number {
  if (!rank) {
    return 0;
  }

  if (rank === 1) {
    return 500;
  }

  if (rank === 2) {
    return 350;
  }

  if (rank === 3) {
    return 250;
  }

  if (rank <= 10) {
    return 100;
  }

  return 25;
}

export function buildPreviousWeeklyRecap(row: WeeklyLeaderboardStatsRow | null): WeeklyRecap | null {
  if (!row?.previousWeekStart) {
    return null;
  }

  return {
    weekStart: row.previousWeekStart,
    participated: row.previousWeekParticipated,
    qualified: row.previousWeekQualified,
    rank: row.previousWeekRank,
    rewardSeeds: row.previousWeekRewardSeeds,
  };
}

export function buildPlacementSummary(options: {
  bestWeeklyPlacement: number | null;
  firstPlaceCount: number;
  secondPlaceCount: number;
  thirdPlaceCount: number;
}): WeeklyPlacementSummary {
  return {
    bestWeeklyPlacement: options.bestWeeklyPlacement,
    firstPlaceCount: options.firstPlaceCount,
    secondPlaceCount: options.secondPlaceCount,
    thirdPlaceCount: options.thirdPlaceCount,
  };
}

export function buildWeeklyOverview(options: {
  currentWeekStart: string;
  row: WeeklyLeaderboardStatsRow | null;
  placementSummary: WeeklyPlacementSummary;
}): WeeklyOverview {
  return {
    currentWeekStart: options.currentWeekStart,
    challenge: getWeeklyChallengeForWeek(options.currentWeekStart),
    previousRecap: buildPreviousWeeklyRecap(options.row),
    placementSummary: options.placementSummary,
  };
}