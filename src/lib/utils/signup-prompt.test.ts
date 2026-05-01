import { describe, expect, it } from 'vitest';
import type { GetLeaderboardResponse } from '@/lib/auth/account-sync';
import {
  buildSignUpPromptContent,
  getEligibleSignUpPromptThreshold,
  getHighestSignUpPromptThreshold,
  shouldShowSignUpPrompt,
} from './signup-prompt';

function buildLeaderboard(
  overrides: Omit<Partial<GetLeaderboardResponse['leaderboard']>, 'challenge'> & {
    challenge?: Partial<GetLeaderboardResponse['leaderboard']['challenge']>;
  } = {}
): GetLeaderboardResponse['leaderboard'] {
  const { challenge: challengeOverrides, ...leaderboardOverrides } = overrides;
  const baseChallenge: GetLeaderboardResponse['leaderboard']['challenge'] = {
    id: 'seed-collector',
    name: 'Seed Collector',
    description: 'Gather more seeds this week than anyone else.',
    icon: 'sprout',
    primaryLabel: 'Seeds earned',
    tiebreakerLabel: 'Accuracy',
    metric: 'weeklySeedsEarned',
    tiebreakerMetric: 'accuracy',
  };
  const challenge: GetLeaderboardResponse['leaderboard']['challenge'] = {
    ...baseChallenge,
    ...(challengeOverrides ?? {}),
  };

  return {
    weekStart: '2026-04-06',
    endsAt: '2026-04-13T00:00:00.000Z',
    challenge,
    currentUserEntry: null,
    entries: Array.from({ length: 10 }, (_, index) => ({
      rank: index + 1,
      username: `birder-${index + 1}`,
      avatarPalette: null,
      primaryValue: 200 - index,
      primaryDisplayValue: `${200 - index} seeds`,
      tiebreakerValue: 90 - index,
      tiebreakerDisplayValue: `${90 - index}% accuracy`,
      birdsSeen: 80 - index,
      isCurrentUser: false,
    })),
    ...leaderboardOverrides,
  };
}

describe('signup prompt thresholds', () => {
  it('returns the highest active threshold for the current birds seen', () => {
    expect(getHighestSignUpPromptThreshold(9)).toBeNull();
    expect(getHighestSignUpPromptThreshold(10)).toBe(10);
    expect(getHighestSignUpPromptThreshold(24)).toBe(10);
    expect(getHighestSignUpPromptThreshold(25)).toBe(25);
    expect(getHighestSignUpPromptThreshold(50)).toBe(50);
    expect(getHighestSignUpPromptThreshold(135)).toBe(100);
    expect(getHighestSignUpPromptThreshold(255)).toBe(200);
  });

  it('only becomes eligible after crossing a new threshold', () => {
    expect(getEligibleSignUpPromptThreshold(10, null)).toBe(10);
    expect(getEligibleSignUpPromptThreshold(24, 10)).toBeNull();
    expect(getEligibleSignUpPromptThreshold(25, 10)).toBe(25);
    expect(getEligibleSignUpPromptThreshold(99, 50)).toBeNull();
    expect(getEligibleSignUpPromptThreshold(100, 50)).toBe(100);
    expect(getEligibleSignUpPromptThreshold(199, 100)).toBeNull();
    expect(getEligibleSignUpPromptThreshold(200, 100)).toBe(200);
    expect(getEligibleSignUpPromptThreshold(5, 200)).toBeNull();
  });

  it('reports whether the prompt should show', () => {
    expect(shouldShowSignUpPrompt(9, null)).toBe(false);
    expect(shouldShowSignUpPrompt(10, null)).toBe(true);
    expect(shouldShowSignUpPrompt(25, 25)).toBe(false);
    expect(shouldShowSignUpPrompt(100, 50)).toBe(true);
  });
});

describe('buildSignUpPromptContent', () => {
  it('returns base copy and no achievement line when nothing has been earned yet', () => {
    const content = buildSignUpPromptContent({
      birdsSeen: 8,
      birdsIdentified: 0,
      seeds: 3,
      unlockedThemeNames: ['Finch'],
      leaderboard: null,
    });

    expect(content.eyebrow).toBe('Protect your progress');
    expect(content.title).toBe("Your flock needs a leader.");
    expect(content.achievementLine).toBeNull();
    expect(content.leaderboardLine).toBeNull();
  });

  it('includes unlocked rewards and next rewards in the copy', () => {
    const content = buildSignUpPromptContent({
      birdsSeen: 28,
      birdsIdentified: 25,
      seeds: 18,
      unlockedThemeNames: ['Raven', 'Robin'],
      leaderboard: null,
    });

    expect(content.title).toContain('Keep this progress');
    expect(content.summary).toContain('28 seen');
    expect(content.achievementLine).toContain('Downy Feather');
    expect(content.achievementLine).toContain('Robin');
    expect(content.nextRewardLine).toContain('Tail Feather');
    expect(content.nextRewardLine).toContain('Gull');
  });

  it('can point the next reward line at an intermediate seed milestone', () => {
    const content = buildSignUpPromptContent({
      birdsSeen: 380,
      birdsIdentified: 360,
      seeds: 44,
      unlockedThemeNames: ['Finch', 'Raven', 'Robin', 'Gull', 'Crane', 'Woodpecker', 'Blue Jay', 'Oriole', 'Heron', 'Cardinal'],
      leaderboard: null,
    });

    expect(content.nextRewardLine).toContain('+50 bonus seeds');
    expect(content.nextRewardLine).toContain('15 more correct birds');
  });

  it('supports badges-only and themes-only achievement copy', () => {
    const badgesOnly = buildSignUpPromptContent({
      birdsSeen: 20,
      birdsIdentified: 10,
      seeds: 5,
      unlockedThemeNames: ['Finch'],
      leaderboard: null,
    });
    const themesOnly = buildSignUpPromptContent({
      birdsSeen: 20,
      birdsIdentified: 0,
      seeds: 5,
      unlockedThemeNames: ['Finch', 'Raven', 'Robin'],
      leaderboard: null,
    });

    expect(badgesOnly.achievementLine).toContain('earned the Downy Feather');
    expect(themesOnly.achievementLine).toContain('unlocked the Raven and Robin themes');
  });

  it('uses the collection-survival next reward copy when all milestones are exhausted', () => {
    const content = buildSignUpPromptContent({
      birdsSeen: 120,
      birdsIdentified: 10_000,
      seeds: 18,
      unlockedThemeNames: ['Finch'],
      leaderboard: null,
    });

    expect(content.nextRewardLine).toContain('deep collection');
  });

  it('includes leaderboard context for larger guest runs when available', () => {
    const content = buildSignUpPromptContent({
      birdsSeen: 63,
      birdsIdentified: 51,
      seeds: 44,
      unlockedThemeNames: ['Raven', 'Robin', 'Gull'],
      leaderboard: buildLeaderboard(),
    });

    expect(content.leaderboardLine).toContain('stockpiling seeds');
    expect(content.leaderboardLine).toContain('Seed Collector');
    expect(content.leaderboardLine).toContain('191 seeds');
  });

  it('uses qualification-aware copy for plumage precision weeks', () => {
    const content = buildSignUpPromptContent({
      birdsSeen: 52,
      birdsIdentified: 43,
      seeds: 31,
      unlockedThemeNames: ['Raven', 'Robin', 'Gull'],
      leaderboard: buildLeaderboard({
        challenge: {
          id: 'plumage-precision',
          name: 'Plumage Precision',
          icon: 'target',
          primaryLabel: 'Accuracy',
          tiebreakerLabel: 'Birds seen',
          qualificationText: 'See at least 25 birds this week to qualify for the leaderboard.',
          metric: 'accuracy',
          tiebreakerMetric: 'weeklyBirdsSeen',
          minimumBirdsSeen: 25,
        },
        entries: Array.from({ length: 10 }, (_, index) => ({
          rank: index + 1,
          username: `birder-${index + 1}`,
          avatarPalette: null,
          primaryValue: 98 - index,
          primaryDisplayValue: `${98 - index}% accuracy`,
          tiebreakerValue: 75 - index,
          tiebreakerDisplayValue: `${75 - index} birds seen`,
          birdsSeen: 75 - index,
          isCurrentUser: false,
        })),
      }),
    });

    expect(content.leaderboardLine).toContain('cleared the 25-bird qualification line');
    expect(content.leaderboardLine).toContain('Plumage Precision');
  });

  it('covers the remaining leaderboard branches for plumage precision and fallback copy', () => {
    const belowQualification = buildSignUpPromptContent({
      birdsSeen: 50,
      birdsIdentified: 40,
      seeds: 10,
      unlockedThemeNames: ['Finch'],
      leaderboard: buildLeaderboard({
        challenge: {
          id: 'plumage-precision',
          name: 'Plumage Precision',
          icon: 'target',
          primaryLabel: 'Accuracy',
          tiebreakerLabel: 'Birds seen',
          qualificationText: 'See at least 60 birds this week to qualify for the leaderboard.',
          metric: 'accuracy',
          tiebreakerMetric: 'weeklyBirdsSeen',
          minimumBirdsSeen: 60,
        },
        entries: [],
      }),
    });
    const noCutoff = buildSignUpPromptContent({
      birdsSeen: 60,
      birdsIdentified: 40,
      seeds: 10,
      unlockedThemeNames: ['Finch'],
      leaderboard: buildLeaderboard({
        challenge: {
          id: 'plumage-precision',
          name: 'Plumage Precision',
          icon: 'target',
          primaryLabel: 'Accuracy',
          tiebreakerLabel: 'Birds seen',
          qualificationText: 'See at least 25 birds this week to qualify for the leaderboard.',
          metric: 'accuracy',
          tiebreakerMetric: 'weeklyBirdsSeen',
          minimumBirdsSeen: 25,
        },
        entries: [],
      }),
    });
    const fallbackWithQualification = buildSignUpPromptContent({
      birdsSeen: 55,
      birdsIdentified: 40,
      seeds: 10,
      unlockedThemeNames: ['Finch'],
      leaderboard: buildLeaderboard({
        challenge: {
          id: 'mystery-week' as unknown as GetLeaderboardResponse['leaderboard']['challenge']['id'],
          qualificationText: 'Hit the weekly minimum to place.',
        },
        entries: [],
      }),
    });
    const fallbackWithoutQualification = buildSignUpPromptContent({
      birdsSeen: 55,
      birdsIdentified: 40,
      seeds: 10,
      unlockedThemeNames: ['Finch'],
      leaderboard: buildLeaderboard({
        challenge: {
          id: 'mystery-week' as unknown as GetLeaderboardResponse['leaderboard']['challenge']['id'],
          qualificationText: undefined,
        },
        entries: [],
      }),
    });

    expect(belowQualification.leaderboardLine).toContain('See at least 60 birds this week to qualify for the leaderboard.');
    expect(noCutoff.leaderboardLine).toContain("already cleared this week's qualification line");
    expect(fallbackWithQualification.leaderboardLine).toContain('Hit the weekly minimum to place.');
    expect(fallbackWithoutQualification.leaderboardLine).toBeNull();
  });

  it('covers the remaining weekly challenge-specific leaderboard messaging', () => {
    const challengeIds = [
      ['on-fire', 'This week rewards streaks.'],
      ['explorer', 'This week rewards new discoveries.'],
      ['fake-spotter', 'This week rewards catching impostors.'],
      ['real-recognizer', 'This week rewards naming genuine birds.'],
      ['completionist', 'This week rewards range and variety.'],
      ['birdwatcher', 'This week rewards sheer volume.'],
    ] as const;

    challengeIds.forEach(([id, expected]) => {
      const withCutoff = buildSignUpPromptContent({
        birdsSeen: 55,
        birdsIdentified: 40,
        seeds: 10,
        unlockedThemeNames: ['Finch'],
        leaderboard: buildLeaderboard({
          challenge: { id, name: id },
        }),
      });
      const withoutCutoff = buildSignUpPromptContent({
        birdsSeen: 55,
        birdsIdentified: 40,
        seeds: 10,
        unlockedThemeNames: ['Finch'],
        leaderboard: buildLeaderboard({
          challenge: { id, name: id },
          entries: [],
        }),
      });

      expect(withCutoff.leaderboardLine).toContain(expected);
      expect(withoutCutoff.leaderboardLine).toContain(expected);
    });
  });

  it('uses singular "theme" when exactly one non-Finch theme is unlocked', () => {
    const singleThemeOnly = buildSignUpPromptContent({
      birdsSeen: 12,
      birdsIdentified: 0,
      seeds: 5,
      unlockedThemeNames: ['Finch', 'Raven'],
      leaderboard: null,
    });
    expect(singleThemeOnly.achievementLine).toContain('unlocked the Raven theme');
    expect(singleThemeOnly.achievementLine).not.toContain('themes');

    const badgeAndSingleTheme = buildSignUpPromptContent({
      birdsSeen: 15,
      birdsIdentified: 10,
      seeds: 5,
      unlockedThemeNames: ['Finch', 'Raven'],
      leaderboard: null,
    });
    expect(badgeAndSingleTheme.achievementLine).toContain('unlocked the Raven theme');
    expect(badgeAndSingleTheme.achievementLine).not.toContain('themes');
  });

  it('uses singular "bird" when exactly one correct bird remains until the next reward', () => {
    // Intermediate seed milestone at 125 — birdsIdentified=124 → 1 remaining
    const seedSingular = buildSignUpPromptContent({
      birdsSeen: 130,
      birdsIdentified: 124,
      seeds: 20,
      unlockedThemeNames: ['Finch'],
      leaderboard: null,
    });
    expect(seedSingular.nextRewardLine).toContain('1 more correct bird');
    expect(seedSingular.nextRewardLine).not.toContain('birds');

    // Badge + theme milestone at 50 — birdsIdentified=49 → 1 remaining
    const badgeThemeSingular = buildSignUpPromptContent({
      birdsSeen: 55,
      birdsIdentified: 49,
      seeds: 10,
      unlockedThemeNames: ['Finch'],
      leaderboard: null,
    });
    expect(badgeThemeSingular.nextRewardLine).toContain('1 more correct bird');

    // Badge with comingSoon theme (milestone 850) — birdsIdentified=849 → 1 remaining, badge-only path
    const badgeOnlySingular = buildSignUpPromptContent({
      birdsSeen: 860,
      birdsIdentified: 849,
      seeds: 100,
      unlockedThemeNames: ['Finch'],
      leaderboard: null,
    });
    expect(badgeOnlySingular.nextRewardLine).toContain('1 more correct bird');
    expect(badgeOnlySingular.nextRewardLine).toContain('Platinum Feather badge');
  });

  it('uses ordinal placement label when leaderboard has fewer than 10 entries', () => {
    // Uses an unknown challenge ID to reach the default/generic buildLeaderboardLine path
    const shortLeaderboard = buildSignUpPromptContent({
      birdsSeen: 60,
      birdsIdentified: 50,
      seeds: 30,
      unlockedThemeNames: ['Finch'],
      leaderboard: buildLeaderboard({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        challenge: { id: 'unknown-challenge' as any, name: 'Unknown Challenge' },
        entries: [
          { rank: 1, username: 'top-birder', avatarPalette: null, primaryValue: 500, primaryDisplayValue: '500 seeds', tiebreakerValue: 99, tiebreakerDisplayValue: '99% accuracy', birdsSeen: 40, isCurrentUser: false },
          { rank: 2, username: 'birder-2', avatarPalette: null, primaryValue: 300, primaryDisplayValue: '300 seeds', tiebreakerValue: 88, tiebreakerDisplayValue: '88% accuracy', birdsSeen: 30, isCurrentUser: false },
          { rank: 3, username: 'birder-3', avatarPalette: null, primaryValue: 200, primaryDisplayValue: '200 seeds', tiebreakerValue: 77, tiebreakerDisplayValue: '77% accuracy', birdsSeen: 20, isCurrentUser: false },
        ],
      }),
    });
    expect(shortLeaderboard.leaderboardLine).toContain('3rd place');
  });

  it('omits tiebreaker text when tiebreakerDisplayValue is empty', () => {
    const noTiebreaker = buildSignUpPromptContent({
      birdsSeen: 60,
      birdsIdentified: 50,
      seeds: 30,
      unlockedThemeNames: ['Finch'],
      leaderboard: buildLeaderboard({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        challenge: { id: 'unknown-challenge' as any, name: 'Unknown Challenge' },
        entries: Array.from({ length: 10 }, (_, index) => ({
          rank: index + 1,
          username: `birder-${index + 1}`,
          avatarPalette: null,
          primaryValue: 200 - index,
          primaryDisplayValue: `${200 - index} seeds`,
          tiebreakerValue: 0,
          tiebreakerDisplayValue: '',
          birdsSeen: 50 - index,
          isCurrentUser: false,
        })),
      }),
    });
    expect(noTiebreaker.leaderboardLine).not.toContain('breaking ties');
  });

});
