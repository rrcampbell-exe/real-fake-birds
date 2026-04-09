import { describe, expect, it } from 'vitest';
import {
  buildSignUpPromptContent,
  getEligibleSignUpPromptThreshold,
  getHighestSignUpPromptThreshold,
  shouldShowSignUpPrompt,
} from './signup-prompt';

function buildLeaderboard(overrides: Record<string, unknown> = {}) {
  return {
    weekStart: '2026-04-06',
    endsAt: '2026-04-13T00:00:00.000Z',
    challenge: {
      id: 'seed-collector',
      name: 'Seed Collector',
      description: 'Gather more seeds this week than anyone else.',
      icon: 'sprout',
      primaryLabel: 'Seeds earned',
      tiebreakerLabel: 'Accuracy',
      metric: 'weeklySeedsEarned',
      tiebreakerMetric: 'accuracy',
      ...((overrides.challenge as Record<string, unknown> | undefined) ?? {}),
    },
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
    ...overrides,
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
    expect(content.title).toBe("Don't lose your flock.");
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

    expect(content.title).toContain('Keep the streak');
    expect(content.summary).toContain('28 seen');
    expect(content.achievementLine).toContain('Downy Feather');
    expect(content.achievementLine).toContain('Robin');
    expect(content.nextRewardLine).toContain('Tail Feather');
    expect(content.nextRewardLine).toContain('Gull');
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
          qualificationText: 'See at least 50 birds this week to qualify for the leaderboard.',
          metric: 'accuracy',
          tiebreakerMetric: 'weeklyBirdsSeen',
          minimumBirdsSeen: 50,
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

    expect(content.leaderboardLine).toContain('cleared the 50-bird qualification line');
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
          qualificationText: 'See at least 50 birds this week to qualify for the leaderboard.',
          metric: 'accuracy',
          tiebreakerMetric: 'weeklyBirdsSeen',
          minimumBirdsSeen: 50,
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
          id: 'mystery-week',
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
          id: 'mystery-week',
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
});
