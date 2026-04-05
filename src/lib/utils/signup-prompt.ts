import type { GetLeaderboardResponse } from '@/lib/auth/account-sync';
import { milestones } from '@/lib/constants/milestones';
import { getThemeUnlockByMilestoneValue } from '@/lib/constants/theme-unlocks';
import { formatNumber } from '@/lib/utils/number-format';

const SIGN_UP_PROMPT_BASE_THRESHOLDS = [10, 25, 50, 100] as const;
const REPEATING_SIGN_UP_PROMPT_INTERVAL = 100;

export const SIGN_UP_PROMPT_LAST_THRESHOLD_STORAGE_KEY = 'signUpPromptLastThreshold';

export interface SignUpPromptContent {
  eyebrow: string;
  title: string;
  body: string;
  summary: string;
  achievementLine: string | null;
  nextRewardLine: string | null;
  leaderboardLine: string | null;
}

function formatList(items: string[]): string {
  if (items.length === 0) {
    return '';
  }

  if (items.length === 1) {
    return items[0] ?? '';
  }

  if (items.length === 2) {
    return `${items[0]} and ${items[1]}`;
  }

  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
}

function toOrdinal(value: number): string {
  const lastTwoDigits = value % 100;

  if (lastTwoDigits >= 11 && lastTwoDigits <= 13) {
    return `${value}th`;
  }

  switch (value % 10) {
    case 1:
      return `${value}st`;
    case 2:
      return `${value}nd`;
    case 3:
      return `${value}rd`;
    default:
      return `${value}th`;
  }
}

export function getHighestSignUpPromptThreshold(birdsSeen: number): number | null {
  if (birdsSeen < SIGN_UP_PROMPT_BASE_THRESHOLDS[0]) {
    return null;
  }

  if (birdsSeen < 100) {
    return SIGN_UP_PROMPT_BASE_THRESHOLDS.reduce<number | null>((highest, threshold) => {
      if (birdsSeen >= threshold) {
        return threshold;
      }

      return highest;
    }, null);
  }

  return Math.floor(birdsSeen / REPEATING_SIGN_UP_PROMPT_INTERVAL) * REPEATING_SIGN_UP_PROMPT_INTERVAL;
}

export function getEligibleSignUpPromptThreshold(
  birdsSeen: number,
  lastPromptThreshold: number | null
): number | null {
  const currentThreshold = getHighestSignUpPromptThreshold(birdsSeen);

  if (currentThreshold === null) {
    return null;
  }

  if (lastPromptThreshold === null || currentThreshold > lastPromptThreshold) {
    return currentThreshold;
  }

  return null;
}

export function shouldShowSignUpPrompt(
  birdsSeen: number,
  lastPromptThreshold: number | null
): boolean {
  return getEligibleSignUpPromptThreshold(birdsSeen, lastPromptThreshold) !== null;
}

function buildAchievementLine(birdsIdentified: number, unlockedThemeNames: string[]): string | null {
  const earnedBadgeNames = milestones
    .filter((milestone) => milestone.value <= birdsIdentified)
    .map((milestone) => milestone.badge);
  const earnedThemeNames = unlockedThemeNames.filter((themeName) => themeName !== 'Finch');

  if (earnedBadgeNames.length === 0 && earnedThemeNames.length === 0) {
    return null;
  }

  const recentBadges = earnedBadgeNames.slice(-2);
  const recentThemes = earnedThemeNames.slice(-2);

  if (recentBadges.length > 0 && recentThemes.length > 0) {
    return `You've already earned ${formatList(recentBadges)} and unlocked ${formatList(recentThemes)}. Keep them tied to an account instead of one browser.`;
  }

  if (recentBadges.length > 0) {
    return `You've already earned ${formatList(recentBadges)}. Create an account so those badges stay attached to you.`;
  }

  return `You've already unlocked ${formatList(recentThemes)}. Create an account so those themes follow you across devices.`;
}

function buildNextRewardLine(birdsIdentified: number): string | null {
  const nextMilestone = milestones.find((milestone) => milestone.value > birdsIdentified);

  if (!nextMilestone) {
    return 'You already have a deep collection. Create an account so it survives browser resets and device swaps.';
  }

  const remainingBirds = nextMilestone.value - birdsIdentified;
  const nextThemeUnlock = getThemeUnlockByMilestoneValue(nextMilestone.value);

  if (nextThemeUnlock && !nextThemeUnlock.comingSoon) {
    return `${formatNumber(remainingBirds)} more correct ${remainingBirds === 1 ? 'bird' : 'birds'} to unlock the ${nextMilestone.badge} badge and ${nextThemeUnlock.themeName} theme.`;
  }

  return `${formatNumber(remainingBirds)} more correct ${remainingBirds === 1 ? 'bird' : 'birds'} to unlock the ${nextMilestone.badge} badge.`;
}

function buildLeaderboardLine(leaderboard: GetLeaderboardResponse['leaderboard'] | null): string | null {
  if (!leaderboard) {
    return null;
  }

  const cutoffEntry = leaderboard.entries[9] ?? leaderboard.entries[leaderboard.entries.length - 1];

  if (!cutoffEntry) {
    return leaderboard.challenge.qualificationText
      ? `${leaderboard.challenge.name} is live right now. ${leaderboard.challenge.qualificationText}`
      : null;
  }

  const placementLabel = cutoffEntry.rank >= 10 ? '10th place' : `${toOrdinal(cutoffEntry.rank)} place`;
  const tieBreakerText = cutoffEntry.tiebreakerDisplayValue
    ? `, with ${cutoffEntry.tiebreakerDisplayValue} breaking ties`
    : '';

  return `This week's ${placementLabel} in ${leaderboard.challenge.name} sits at ${cutoffEntry.primaryDisplayValue}${tieBreakerText}. Create an account now so your future rounds can count toward it.`;
}

function buildChallengeSpecificLeaderboardLine(
  leaderboard: GetLeaderboardResponse['leaderboard'] | null,
  birdsSeen: number
): string | null {
  if (!leaderboard) {
    return null;
  }

  const cutoffEntry = leaderboard.entries[9] ?? leaderboard.entries[leaderboard.entries.length - 1] ?? null;
  const qualificationLine = leaderboard.challenge.qualificationText;

  switch (leaderboard.challenge.id) {
    case 'plumage-precision': {
      if (birdsSeen < (leaderboard.challenge.minimumBirdsSeen ?? 50)) {
        return qualificationLine
          ? `${qualificationLine} Create an account before that qualifying run is trapped on one device.`
          : 'This week rewards sharp accuracy over a real sample size. Create an account before that qualifying run is trapped on one device.';
      }

      if (!cutoffEntry) {
        return 'You already cleared this week\'s qualification line. Create an account so your accuracy can actually compete.';
      }

      return `You already cleared the ${leaderboard.challenge.minimumBirdsSeen ?? 50}-bird qualification line for ${leaderboard.challenge.name}. Top 10 is sitting at ${cutoffEntry.primaryDisplayValue}, with ${cutoffEntry.tiebreakerDisplayValue} deciding ties.`;
    }
    case 'seed-collector':
      return cutoffEntry
        ? `This week is all about stockpiling seeds. Top 10 in ${leaderboard.challenge.name} is at ${cutoffEntry.primaryDisplayValue}. Without an account, your seed haul cannot join the chase.`
        : 'This week is all about stockpiling seeds. Create an account so every seed you earn can count.';
    case 'on-fire':
      return cutoffEntry
        ? `This week rewards streaks. A top-10 run in ${leaderboard.challenge.name} currently needs ${cutoffEntry.primaryDisplayValue}. Your hottest streak should not live and die in one browser.`
        : 'This week rewards streaks. Create an account so your hottest run does not live and die in one browser.';
    case 'explorer':
      return cutoffEntry
        ? `This week rewards new discoveries. Top 10 in ${leaderboard.challenge.name} is at ${cutoffEntry.primaryDisplayValue}. An account keeps those fresh journal finds attached to you.`
        : 'This week rewards new discoveries. An account keeps those fresh journal finds attached to you.';
    case 'fake-spotter':
      return cutoffEntry
        ? `This week rewards catching impostors. Top 10 in ${leaderboard.challenge.name} is at ${cutoffEntry.primaryDisplayValue}. Create an account so your best fake-bird reads actually count.`
        : 'This week rewards catching impostors. Create an account so your best fake-bird reads actually count.';
    case 'real-recognizer':
      return cutoffEntry
        ? `This week rewards naming genuine birds. Top 10 in ${leaderboard.challenge.name} is at ${cutoffEntry.primaryDisplayValue}. Create an account so those real-bird wins are not stranded locally.`
        : 'This week rewards naming genuine birds. Create an account so those real-bird wins are not stranded locally.';
    case 'completionist':
      return cutoffEntry
        ? `This week rewards range and variety. Top 10 in ${leaderboard.challenge.name} is at ${cutoffEntry.primaryDisplayValue}. An account keeps your broader collection working for you.`
        : 'This week rewards range and variety. An account keeps your broader collection working for you.';
    case 'birdwatcher':
      return cutoffEntry
        ? `This week rewards sheer volume. Top 10 in ${leaderboard.challenge.name} is at ${cutoffEntry.primaryDisplayValue}. Create an account so your sightings tally can keep climbing.`
        : 'This week rewards sheer volume. Create an account so your sightings tally can keep climbing.';
    default:
      return buildLeaderboardLine(leaderboard);
  }
}

export function buildSignUpPromptContent(options: {
  birdsSeen: number;
  birdsIdentified: number;
  seeds: number;
  unlockedThemeNames: string[];
  leaderboard: GetLeaderboardResponse['leaderboard'] | null;
}): SignUpPromptContent {
  const { birdsSeen, birdsIdentified, seeds, unlockedThemeNames, leaderboard } = options;

  let eyebrow = 'Protect your progress';
  let title = 'Don\'t lose your flock.';
  let body = 'Save your birds, streaks, seeds, badges, and themes so they show up everywhere you play.';
  let summary = `${formatNumber(birdsSeen)} seen • ${formatNumber(birdsIdentified)} correct • ${formatNumber(seeds)} seeds`;

  if (birdsSeen >= 50) {
    eyebrow = 'This is real progress now';
    title = 'Guest mode is starting to leave real progress on the table.';
    body = leaderboard
      ? `This week\'s ${leaderboard.challenge.name} is live. Create an account so this run can turn into something that survives and competes.`
      : 'At this point you are building a real collection. An account keeps your unlocks safe, lets future rounds count toward the leaderboard, and makes this save portable.';
  } else if (birdsSeen >= 25) {
    eyebrow = 'Your collection is taking shape';
    title = 'Keep the streak, unlocks, and journal entries attached to you.';
    body = 'You are past the dabbling stage. An account means your progress follows you instead of living in one local browser store.';
  }

  return {
    eyebrow,
    title,
    body,
    summary,
    achievementLine: buildAchievementLine(birdsIdentified, unlockedThemeNames),
    nextRewardLine: buildNextRewardLine(birdsIdentified),
    leaderboardLine: birdsSeen >= 50 ? buildChallengeSpecificLeaderboardLine(leaderboard, birdsSeen) : null,
  };
}