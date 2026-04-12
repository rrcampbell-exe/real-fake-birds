import { describe, expect, it } from 'vitest';
import { getWeeklyChallengeForWeek } from '@/lib/constants/weekly-challenges';
import {
  buildPlacementSummary,
  buildPreviousWeeklyRecap,
  buildWeeklyOverview,
  calculateWeeklyAccuracy,
  getMetricValue,
  getWeeklyRewardSeeds,
  normalizeWeeklySeenBirdKeys,
  qualifiesForWeeklyChallenge,
  rankWeeklyLeaderboardRows,
  type WeeklyLeaderboardStatsRow,
} from './weekly-leaderboard';

function createRow(overrides: Partial<WeeklyLeaderboardStatsRow>): WeeklyLeaderboardStatsRow {
  return {
    userId: overrides.userId ?? 'user-1',
    usernameCanonical: overrides.usernameCanonical ?? 'birder',
    currentWeekStart: overrides.currentWeekStart ?? '2026-04-06',
    weeklyBirdsSeen: overrides.weeklyBirdsSeen ?? 0,
    weeklyBirdsIdentified: overrides.weeklyBirdsIdentified ?? 0,
    weeklySeedsEarned: overrides.weeklySeedsEarned ?? 0,
    weeklyBestStreak: overrides.weeklyBestStreak ?? 0,
    weeklyNewBirdsDiscovered: overrides.weeklyNewBirdsDiscovered ?? 0,
    weeklyFakeBirdsIdentified: overrides.weeklyFakeBirdsIdentified ?? 0,
    weeklyRealBirdsIdentified: overrides.weeklyRealBirdsIdentified ?? 0,
    weeklyUniqueBirdsSeen: overrides.weeklyUniqueBirdsSeen ?? 0,
    weeklySeenBirdKeys: overrides.weeklySeenBirdKeys ?? [],
    previousWeekStart: overrides.previousWeekStart ?? null,
    previousWeekParticipated: overrides.previousWeekParticipated ?? false,
    previousWeekQualified: overrides.previousWeekQualified ?? false,
    previousWeekRank: overrides.previousWeekRank ?? null,
    previousWeekRewardSeeds: overrides.previousWeekRewardSeeds ?? 0,
  };
}

describe('weekly leaderboard ranking', () => {
  it('uses the tiebreaker when primary values match', () => {
    const challenge = getWeeklyChallengeForWeek('2026-04-06');
    const rows = [
      createRow({ userId: 'user-a', usernameCanonical: 'alpha', weeklySeedsEarned: 100, weeklyBirdsSeen: 20, weeklyBirdsIdentified: 18 }),
      createRow({ userId: 'user-b', usernameCanonical: 'beta', weeklySeedsEarned: 100, weeklyBirdsSeen: 20, weeklyBirdsIdentified: 19 }),
      createRow({ userId: 'user-c', usernameCanonical: 'gamma', weeklySeedsEarned: 90, weeklyBirdsSeen: 20, weeklyBirdsIdentified: 18 }),
    ];

    const ranked = rankWeeklyLeaderboardRows(rows, challenge, 'user-b');

    expect(ranked.entries[0]?.username).toBe('beta');
    expect(ranked.entries[1]?.username).toBe('alpha');
    expect(ranked.currentUserEntry?.rank).toBe(1);
  });

  it('requires 25 birds for Plumage Precision qualification', () => {
    let plumagePrecision = getWeeklyChallengeForWeek('2026-01-05');

    for (let week = 0; week < 40 && plumagePrecision.id !== 'plumage-precision'; week += 1) {
      const weekStart = new Date(Date.UTC(2026, 0, 5 + (week * 7))).toISOString().slice(0, 10);
      plumagePrecision = getWeeklyChallengeForWeek(weekStart);
    }

    expect(plumagePrecision.id).toBe('plumage-precision');
    expect(qualifiesForWeeklyChallenge(createRow({ weeklyBirdsSeen: 24, weeklyBirdsIdentified: 23 }), plumagePrecision)).toBe(false);
    expect(qualifiesForWeeklyChallenge(createRow({ weeklyBirdsSeen: 25, weeklyBirdsIdentified: 23 }), plumagePrecision)).toBe(true);
  });

  it('covers the remaining leaderboard helpers and branches', () => {
    const challenge = getWeeklyChallengeForWeek('2026-04-06');
    const row = createRow({
      weeklyBirdsSeen: 21,
      weeklyBirdsIdentified: 19,
      weeklyBestStreak: 7,
      weeklyNewBirdsDiscovered: 4,
      weeklyFakeBirdsIdentified: 8,
      weeklyRealBirdsIdentified: 11,
      weeklySeedsEarned: 44,
      weeklyUniqueBirdsSeen: 17,
      previousWeekStart: '2026-03-30',
      previousWeekParticipated: true,
      previousWeekQualified: true,
      previousWeekRank: 2,
      previousWeekRewardSeeds: 350,
    });

    expect(calculateWeeklyAccuracy(createRow({ weeklyBirdsSeen: 0, weeklyBirdsIdentified: 10 }))).toBe(0);
    expect(calculateWeeklyAccuracy(createRow({ weeklyBirdsSeen: 3, weeklyBirdsIdentified: 2 }))).toBe(66.67);
    expect(getMetricValue(row, 'accuracy')).toBe(90.48);
    expect(getMetricValue(row, 'weeklyBestStreak')).toBe(7);
    expect(getMetricValue(row, 'weeklyBirdsIdentified')).toBe(19);
    expect(getMetricValue(row, 'weeklyBirdsSeen')).toBe(21);
    expect(getMetricValue(row, 'weeklyFakeBirdsIdentified')).toBe(8);
    expect(getMetricValue(row, 'weeklyNewBirdsDiscovered')).toBe(4);
    expect(getMetricValue(row, 'weeklyRealBirdsIdentified')).toBe(11);
    expect(getMetricValue(row, 'weeklySeedsEarned')).toBe(44);
    expect(getMetricValue(row, 'weeklyUniqueBirdsSeen')).toBe(17);
    expect(normalizeWeeklySeenBirdKeys(['b', 'a', 4, 'a', null])).toEqual(['a', 'b']);
    expect(normalizeWeeklySeenBirdKeys('bad')).toEqual([]);
    expect(qualifiesForWeeklyChallenge(createRow({ usernameCanonical: '', weeklyBirdsSeen: 10 }), challenge)).toBe(false);
    expect(qualifiesForWeeklyChallenge(createRow({ weeklyBirdsSeen: 0, weeklyBirdsIdentified: 10 }), challenge)).toBe(false);

    const ranked = rankWeeklyLeaderboardRows(
      [
        createRow({ userId: 'user-b', usernameCanonical: 'beta', weeklySeedsEarned: 100, weeklyBirdsSeen: 10, weeklyBirdsIdentified: 9 }),
        createRow({ userId: 'user-a', usernameCanonical: 'alpha', weeklySeedsEarned: 100, weeklyBirdsSeen: 10, weeklyBirdsIdentified: 9 }),
      ],
      challenge,
      'missing'
    );
    expect(ranked.entries.map((entry) => entry.username)).toEqual(['alpha', 'beta']);
    expect(ranked.entries.map((entry) => entry.rank)).toEqual([1, 1]);
    expect(ranked.currentUserEntry).toBeNull();

    expect(getWeeklyRewardSeeds(null)).toBe(0);
    expect(getWeeklyRewardSeeds(1)).toBe(500);
    expect(getWeeklyRewardSeeds(2)).toBe(350);
    expect(getWeeklyRewardSeeds(3)).toBe(250);
    expect(getWeeklyRewardSeeds(7)).toBe(100);
    expect(getWeeklyRewardSeeds(12)).toBe(25);

    expect(buildPreviousWeeklyRecap(null)).toBeNull();
    expect(buildPreviousWeeklyRecap(createRow({ previousWeekStart: null }))).toBeNull();
    expect(buildPreviousWeeklyRecap(row)).toEqual({
      weekStart: '2026-03-30',
      participated: true,
      qualified: true,
      rank: 2,
      rewardSeeds: 350,
    });

    const placementSummary = buildPlacementSummary({
      bestWeeklyPlacement: 1,
      firstPlaceCount: 2,
      secondPlaceCount: 1,
      thirdPlaceCount: 0,
    });
    expect(placementSummary).toEqual({
      bestWeeklyPlacement: 1,
      firstPlaceCount: 2,
      secondPlaceCount: 1,
      thirdPlaceCount: 0,
    });

    const overview = buildWeeklyOverview({
      currentWeekStart: '2026-04-06',
      row,
      placementSummary,
    });
    expect(overview.currentWeekStart).toBe('2026-04-06');
    expect(overview.challenge).toEqual(challenge);
    expect(overview.previousRecap?.weekStart).toBe('2026-03-30');
    expect(overview.placementSummary).toEqual(placementSummary);
  });
});
