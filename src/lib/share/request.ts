import type { ShareImageParams, SharePayload } from '@/types';
import {
  buildDailyMissionSharePayload,
  buildMilestoneSharePayload,
  buildRoundSharePayload,
  buildStatsSharePayload,
  buildWeeklyChampionSharePayload,
  buildWeeklyLeaderboardSharePayload,
} from '@/lib/utils/share-data';

export type ShareCardRequest =
  | {
      type: 'round-result';
      themeName?: string | null;
      birdName: string;
      scientificName: string;
      isReal: boolean;
      isCorrect: boolean;
      imageUrl: string | null;
      streak: number;
      fieldNote: string;
    }
  | {
      type: 'leaderboard-rank';
      themeName?: string | null;
      challengeName: string;
      username: string;
      rank: number;
      score: string;
      isFinal: boolean;
    }
  | {
      type: 'weekly-champions';
      themeName?: string | null;
      username: string;
      gold: number;
      silver: number;
      bronze: number;
    }
  | {
      type: 'milestone-badge';
      themeName?: string | null;
      badgeName: string;
      birdsIdentified: number;
      milestoneValue: number;
      description: string;
    }
  | {
      type: 'stats-summary';
      themeName?: string | null;
      username: string;
      bestStreak: number;
      currentStreak: number;
      bestDailyStreak: number;
      currentDailyStreak: number;
      birdsIdentified: number;
      accuracy: number;
      seeds: number;
      bestWeeklyPlacement: string;
    }
  | {
      type: 'daily-summary';
      themeName?: string | null;
      currentStreak: number;
      completedCount: number;
      rewardedCount: number;
      missionCount: number;
    };

function parseBoolean(value: string | null): boolean | null {
  if (value === 'true') {
    return true;
  }

  if (value === 'false') {
    return false;
  }

  return null;
}

function parseInteger(value: string | null): number | null {
  if (!value) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function getRequired(searchParams: URLSearchParams, key: string): string | null {
  const value = searchParams.get(key)?.trim();
  return value ? value : null;
}

export function toShareSearchParams(imageParams: ShareImageParams): URLSearchParams {
  const searchParams = new URLSearchParams();
  searchParams.set('type', imageParams.type);

  Object.entries(imageParams.params).forEach(([key, value]) => {
    if (value === null || value === undefined || value === '') {
      return;
    }

    searchParams.set(key, String(value));
  });

  return searchParams;
}

export function buildSharePageUrl(origin: string, imageParams: ShareImageParams): string {
  const url = new URL('/share', origin);
  url.search = toShareSearchParams(imageParams).toString();
  return url.toString();
}

export function buildShareImageUrl(origin: string, imageParams: ShareImageParams): string {
  const url = new URL('/api/share', origin);
  url.search = toShareSearchParams(imageParams).toString();
  return url.toString();
}

export function searchParamsFromObject(searchParams: Record<string, string | string[] | undefined>): URLSearchParams {
  const normalized = new URLSearchParams();

  Object.entries(searchParams).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      if (value[0]) {
        normalized.set(key, value[0]);
      }
      return;
    }

    if (value) {
      normalized.set(key, value);
    }
  });

  return normalized;
}

export function parseShareCardRequest(searchParams: URLSearchParams): ShareCardRequest | null {
  const type = searchParams.get('type');
  const themeName = searchParams.get('themeName');

  if (type === 'round-result') {
    const birdName = getRequired(searchParams, 'birdName');
    const scientificName = searchParams.get('scientificName')?.trim() ?? '';
    const fieldNote = getRequired(searchParams, 'fieldNote');
    const streak = parseInteger(searchParams.get('streak')) ?? 0;
    const isReal = parseBoolean(searchParams.get('isReal'));
    const isCorrect = parseBoolean(searchParams.get('isCorrect'));

    if (!birdName || !fieldNote || isReal === null || isCorrect === null) {
      return null;
    }

    return {
      type,
      themeName,
      birdName,
      scientificName,
      isReal,
      isCorrect,
      imageUrl: searchParams.get('imageUrl'),
      streak,
      fieldNote,
    };
  }

  if (type === 'leaderboard-rank') {
    const challengeName = getRequired(searchParams, 'challengeName');
    const username = getRequired(searchParams, 'username');
    const score = getRequired(searchParams, 'score');
    const rank = parseInteger(searchParams.get('rank'));
    const isFinal = parseBoolean(searchParams.get('isFinal'));

    if (!challengeName || !username || !score || rank === null || isFinal === null) {
      return null;
    }

    return {
      type,
      themeName,
      challengeName,
      username,
      rank,
      score,
      isFinal,
    };
  }

  if (type === 'weekly-champions') {
    const username = getRequired(searchParams, 'username');
    const gold = parseInteger(searchParams.get('gold'));
    const silver = parseInteger(searchParams.get('silver'));
    const bronze = parseInteger(searchParams.get('bronze'));

    if (!username || gold === null || silver === null || bronze === null) {
      return null;
    }

    return {
      type,
      themeName,
      username,
      gold,
      silver,
      bronze,
    };
  }

  if (type === 'milestone-badge') {
    const badgeName = getRequired(searchParams, 'badgeName');
    const description = getRequired(searchParams, 'description');
    const birdsIdentified = parseInteger(searchParams.get('birdsIdentified'));
    const milestoneValue = parseInteger(searchParams.get('milestoneValue'));

    if (!badgeName || !description || birdsIdentified === null || milestoneValue === null) {
      return null;
    }

    return {
      type,
      themeName,
      badgeName,
      birdsIdentified,
      milestoneValue,
      description,
    };
  }

  if (type === 'stats-summary') {
    const username = getRequired(searchParams, 'username');
    const bestStreak = parseInteger(searchParams.get('bestStreak'));
    const currentStreak = parseInteger(searchParams.get('currentStreak'));
    const bestDailyStreak = parseInteger(searchParams.get('bestDailyStreak'));
    const currentDailyStreak = parseInteger(searchParams.get('currentDailyStreak'));
    const birdsIdentified = parseInteger(searchParams.get('birdsIdentified'));
    const accuracy = parseInteger(searchParams.get('accuracy'));
    const seeds = parseInteger(searchParams.get('seeds'));
    const bestWeeklyPlacement = searchParams.get('bestWeeklyPlacement')?.trim() ?? '---';

    if (
      !username
      || bestStreak === null
      || currentStreak === null
      || bestDailyStreak === null
      || currentDailyStreak === null
      || birdsIdentified === null
      || accuracy === null
      || seeds === null
    ) {
      return null;
    }

    return {
      type,
      themeName,
      username,
      bestStreak,
      currentStreak,
      bestDailyStreak,
      currentDailyStreak,
      birdsIdentified,
      accuracy,
      seeds,
      bestWeeklyPlacement,
    };
  }

  if (type === 'daily-summary') {
    const currentStreak = parseInteger(searchParams.get('currentStreak'));
    const completedCount = parseInteger(searchParams.get('completedCount'));
    const rewardedCount = parseInteger(searchParams.get('rewardedCount'));
    const missionCount = parseInteger(searchParams.get('missionCount'));

    if (currentStreak === null || completedCount === null || rewardedCount === null || missionCount === null) {
      return null;
    }

    return {
      type,
      themeName,
      currentStreak,
      completedCount,
      rewardedCount,
      missionCount,
    };
  }

  return null;
}

export function getSharePayloadForRequest(request: ShareCardRequest): SharePayload {
  switch (request.type) {
    case 'round-result':
      return buildRoundSharePayload({
        birdName: request.birdName,
        isReal: request.isReal,
        isCorrect: request.isCorrect,
        currentStreak: request.streak,
      });
    case 'leaderboard-rank':
      return buildWeeklyLeaderboardSharePayload({
        challengeName: request.challengeName,
        rank: request.rank,
        isFinal: request.isFinal,
      });
    case 'weekly-champions':
      return buildWeeklyChampionSharePayload({
        firstPlaceCount: request.gold,
        secondPlaceCount: request.silver,
        thirdPlaceCount: request.bronze,
      });
    case 'milestone-badge':
      return buildMilestoneSharePayload({
        badgeName: request.badgeName,
        birdsIdentified: request.birdsIdentified,
      });
    case 'stats-summary':
      return buildStatsSharePayload({
        bestStreak: request.bestStreak,
        currentStreak: request.currentStreak,
        birdsIdentified: request.birdsIdentified,
        accuracy: request.accuracy,
      });
    case 'daily-summary':
      return buildDailyMissionSharePayload({
        currentStreak: request.currentStreak,
        completedCount: request.completedCount,
        missionCount: request.missionCount,
      });
  }
}

export function getShareTargetForRequest(request: ShareCardRequest): { href: string; label: string } {
  switch (request.type) {
    case 'round-result':
      return { href: '/', label: 'Play a Round' };
    case 'leaderboard-rank':
      return { href: '/leaderboard', label: 'Open Leaderboard' };
    case 'weekly-champions':
    case 'milestone-badge':
    case 'stats-summary':
      return { href: '/rewards', label: 'Open Rewards' };
    case 'daily-summary':
      return { href: '/daily', label: 'Open Daily Missions' };
  }
}