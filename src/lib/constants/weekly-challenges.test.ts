import { describe, expect, it } from 'vitest';
import type { WeeklyChallengeId } from '@/types';
import { getWeeklyChallengeById, getWeeklyChallengeForWeek, WEEKLY_CHALLENGE_IDS } from './weekly-challenges';

describe('weekly challenges', () => {
  it('returns a known challenge by ID', () => {
    const challenge = getWeeklyChallengeById('seed-collector');
    expect(challenge.id).toBe('seed-collector');
    expect(challenge.name).toBe('Seed Collector');
  });

  it('falls back to the first challenge for an unknown ID', () => {
    const challenge = getWeeklyChallengeById('nonexistent-id' as WeeklyChallengeId);
    expect(challenge).toBeDefined();
    expect(WEEKLY_CHALLENGE_IDS).toContain(challenge.id);
  });

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

  it('returns all known challenge IDs', () => {
    expect(WEEKLY_CHALLENGE_IDS.length).toBeGreaterThan(0);
    for (const id of WEEKLY_CHALLENGE_IDS) {
      const challenge = getWeeklyChallengeById(id);
      expect(challenge.id).toBe(id);
    }
  });

  it('always returns a valid challenge for any week start', () => {
    for (let week = 0; week < 52; week += 1) {
      const weekStart = new Date(Date.UTC(2025, 0, 6 + (week * 7))).toISOString().slice(0, 10);
      const challenge = getWeeklyChallengeForWeek(weekStart);
      expect(challenge).toBeDefined();
      expect(typeof challenge.id).toBe('string');
      expect(typeof challenge.name).toBe('string');
    }
  });
});
