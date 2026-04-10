import { describe, expect, it } from 'vitest';
import {
  buildDailyChallengeSharePayload,
  buildDailyMissionSharePayload,
  buildMilestoneSharePayload,
  buildRoundSharePayload,
  buildStatsSharePayload,
  buildWeeklyLeaderboardSharePayload,
  buildWeeklyChampionSharePayload,
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
      text: 'My Real Fake Birds stats: best guess streak 5, current guess streak 2, 14 birds identified, 71% accuracy.',
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

  it('builds daily mission share copy with streak language', () => {
    expect(
      buildDailyMissionSharePayload({
        currentStreak: 3,
        completedCount: 2,
        missionCount: 3,
      })
    ).toEqual({
      title: 'Real Fake Birds daily missions',
      text: 'I completed 2/3 daily missions in Real Fake Birds and kept my streak alive at 3 days.',
    });
  });
});
describe('buildWeeklyLeaderboardSharePayload', () => {
  it('uses "am currently sitting" and "this week\'s" when not final', () => {
    const payload = buildWeeklyLeaderboardSharePayload({
      challengeName: 'Seed Collector',
      rank: 3,
      isFinal: false,
    });
    expect(payload.title).toBe('Real Fake Birds leaderboard');
    expect(payload.text).toContain('am currently sitting');
    expect(payload.text).toContain("this week's");
    expect(payload.text).toContain('#3');
    expect(payload.text).toContain('Seed Collector');
  });

  it('uses "finished" and "last week\'s" when final', () => {
    const payload = buildWeeklyLeaderboardSharePayload({
      challengeName: 'Seed Collector',
      rank: 1,
      isFinal: true,
    });
    expect(payload.text).toContain('finished');
    expect(payload.text).toContain("last week's");
  });
});

describe('buildWeeklyChampionSharePayload', () => {
  it('uses plural "finishes" when total podiums is not 1', () => {
    const payload = buildWeeklyChampionSharePayload({
      firstPlaceCount: 2,
      secondPlaceCount: 1,
      thirdPlaceCount: 0,
    });
    expect(payload.title).toBe('Real Fake Birds podiums');
    expect(payload.text).toContain('3 weekly podium finishes');
    expect(payload.text).toContain('2 gold');
    expect(payload.text).toContain('1 silver');
    expect(payload.text).toContain('0 bronze');
  });

  it('uses singular "finish" when total podiums is exactly 1', () => {
    const payload = buildWeeklyChampionSharePayload({
      firstPlaceCount: 1,
      secondPlaceCount: 0,
      thirdPlaceCount: 0,
    });
    expect(payload.text).toContain('1 weekly podium finish ');
    expect(payload.text).not.toContain('finishes');
  });
});

describe('buildRoundSharePayload – additional branches', () => {
  it('includes badge text when earnedBadgeName is provided', () => {
    const payload = buildRoundSharePayload({
      birdName: 'Robin',
      isReal: true,
      isCorrect: true,
      currentStreak: 1,
      earnedBadgeName: 'Downy Feather',
    });
    expect(payload.text).toContain('Just earned the Downy Feather badge.');
  });

  it('omits streak text when currentStreak is 1', () => {
    const payload = buildRoundSharePayload({
      birdName: 'Robin',
      isReal: false,
      isCorrect: false,
      currentStreak: 1,
      earnedBadgeName: null,
    });
    expect(payload.text).not.toContain('streak');
  });
});
