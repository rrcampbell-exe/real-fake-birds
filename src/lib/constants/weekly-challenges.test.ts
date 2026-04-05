import { describe, expect, it } from 'vitest';
import { getWeeklyChallengeForWeek } from './weekly-challenges';

describe('weekly challenges', () => {
  it('uses Plumage Precision for the accuracy challenge copy', () => {
    const seenChallenges = new Set<string>();

    for (let week = 0; week < 24; week += 1) {
      const weekStart = new Date(Date.UTC(2026, 0, 5 + (week * 7))).toISOString().slice(0, 10);
      const challenge = getWeeklyChallengeForWeek(weekStart);
      seenChallenges.add(challenge.name);

      if (challenge.id === 'plumage-precision') {
        expect(challenge.name).toBe('Plumage Precision');
        expect(challenge.tiebreakerLabel).toBe('Birds seen');
        expect(challenge.qualificationText).toContain('50 birds');
        return;
      }
    }

    expect(seenChallenges.size).toBeGreaterThan(0);
    throw new Error('Expected to encounter Plumage Precision in the sampled weeks.');
  });

  it('does not repeat the same challenge in back-to-back weeks', () => {
    let previousId: string | null = null;

    for (let week = 0; week < 32; week += 1) {
      const weekStart = new Date(Date.UTC(2026, 0, 5 + (week * 7))).toISOString().slice(0, 10);
      const challenge = getWeeklyChallengeForWeek(weekStart);
      expect(challenge.id).not.toBe(previousId);
      previousId = challenge.id;
    }
  });
});
