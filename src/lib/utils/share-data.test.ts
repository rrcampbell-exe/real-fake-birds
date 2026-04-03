import { describe, expect, it } from 'vitest';
import {
  buildDailyChallengeSharePayload,
  buildMilestoneSharePayload,
  buildRoundSharePayload,
  buildStatsSharePayload,
} from './share-data';

describe('share-data', () => {
  it('builds round share copy without route-specific metadata', () => {
    expect(
      buildRoundSharePayload({
        birdName: 'Silver Finch',
        isReal: true,
        isCorrect: true,
        currentStreak: 3,
        earnedBadgeName: null,
      })
    ).toEqual({
      title: 'Real Fake Birds round result',
      text: 'I nailed Silver Finch as a real bird in Real Fake Birds. Current streak: 3.',
    });
  });

  it('builds milestone and stats share copy without route-specific metadata', () => {
    expect(buildMilestoneSharePayload({ badgeName: 'Downy Feather', birdsIdentified: 10 })).toEqual({
      title: 'Real Fake Birds milestone',
      text: 'I unlocked the Downy Feather badge in Real Fake Birds after identifying 10 birds.',
    });
    expect(
      buildStatsSharePayload({
        bestStreak: 5,
        currentStreak: 2,
        birdsIdentified: 14,
        accuracy: 71,
      })
    ).toEqual({
      title: 'Real Fake Birds stats',
      text: 'My Real Fake Birds stats: best streak 5, current streak 2, 14 birds identified, 71% accuracy.',
    });
  });

  it('builds daily challenge share copy without route-specific metadata', () => {
    expect(
      buildDailyChallengeSharePayload({
        date: '2026-04-03',
        roundsPlayed: 5,
        correctAnswers: 4,
        completed: true,
        completionBonusAwarded: true,
        perfectBonusAwarded: false,
        bonusSeedsAwarded: 25,
        roundResults: [true, true, true, true, false],
      })
    ).toEqual({
      title: 'Real Fake Birds daily challenge',
      text: "I scored 4/5 on today's Real Fake Birds Daily Challenge.",
    });
  });
});