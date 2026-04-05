import { describe, expect, it } from 'vitest';
import {
  buildSignUpPromptContent,
  getEligibleSignUpPromptThreshold,
  getHighestSignUpPromptThreshold,
  shouldShowSignUpPrompt,
} from './signup-prompt';

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
  });

  it('reports whether the prompt should show', () => {
    expect(shouldShowSignUpPrompt(9, null)).toBe(false);
    expect(shouldShowSignUpPrompt(10, null)).toBe(true);
    expect(shouldShowSignUpPrompt(25, 25)).toBe(false);
    expect(shouldShowSignUpPrompt(100, 50)).toBe(true);
  });
});

describe('buildSignUpPromptContent', () => {
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

  it('includes leaderboard context for larger guest runs when available', () => {
    const content = buildSignUpPromptContent({
      birdsSeen: 63,
      birdsIdentified: 51,
      seeds: 44,
      unlockedThemeNames: ['Raven', 'Robin', 'Gull'],
      leaderboard: {
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
      },
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
      leaderboard: {
        weekStart: '2026-04-06',
        endsAt: '2026-04-13T00:00:00.000Z',
        challenge: {
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
        currentUserEntry: null,
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
      },
    });

    expect(content.leaderboardLine).toContain('cleared the 50-bird qualification line');
    expect(content.leaderboardLine).toContain('Plumage Precision');
  });
});