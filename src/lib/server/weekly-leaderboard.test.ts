import { describe, expect, it } from 'vitest';
import { getWeeklyChallengeForWeek } from '@/lib/constants/weekly-challenges';
import { qualifiesForWeeklyChallenge, rankWeeklyLeaderboardRows, type WeeklyLeaderboardStatsRow } from './weekly-leaderboard';

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

  it('requires 50 birds for Plumage Precision qualification', () => {
    let plumagePrecision = getWeeklyChallengeForWeek('2026-01-05');

    for (let week = 0; week < 40 && plumagePrecision.id !== 'plumage-precision'; week += 1) {
      const weekStart = new Date(Date.UTC(2026, 0, 5 + (week * 7))).toISOString().slice(0, 10);
      plumagePrecision = getWeeklyChallengeForWeek(weekStart);
    }

    expect(plumagePrecision.id).toBe('plumage-precision');
    expect(qualifiesForWeeklyChallenge(createRow({ weeklyBirdsSeen: 49, weeklyBirdsIdentified: 48 }), plumagePrecision)).toBe(false);
    expect(qualifiesForWeeklyChallenge(createRow({ weeklyBirdsSeen: 50, weeklyBirdsIdentified: 48 }), plumagePrecision)).toBe(true);
  });
});
