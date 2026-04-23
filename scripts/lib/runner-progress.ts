/**
 * Progress event generation and application for house account bots.
 *
 * Self-contained module: no Next.js or @/ path alias dependencies.
 * Mirrors the logic in src/app/api/auth/route.ts apply-progress-events
 * handler, simplified for bot use.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { createSeededRandom, randomBool, randomInt, randomPick } from './seeded-random.js';
import type { HouseAccountPersona } from './house-accounts.js';
import { SAMPLE_FAKE_BIRD_KEYS, SAMPLE_REAL_BIRD_KEYS } from './house-accounts.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BotProgressEvent {
  eventId: string;
  eventType: 'round-resolved';
  occurredAt: string;
  payload: {
    mode: 'classic';
    isCorrect: boolean;
    streakProtected: boolean;
    birdKey?: string;
    isRealBird?: boolean;
    isNewBirdEncounter?: boolean;
    currentStreak?: number;
    seedsEarned?: number;
  };
}

interface ExistingLeaderboardRow {
  currentWeekStart: string | null;
  weeklyBirdsSeen: number;
  weeklyBirdsIdentified: number;
  weeklySeedsEarned: number;
  weeklyBestStreak: number;
  weeklyNewBirdsDiscovered: number;
  weeklyFakeBirdsIdentified: number;
  weeklyRealBirdsIdentified: number;
  weeklyUniqueBirdsSeen: number;
  weeklySeenBirdKeys: string[];
  usernameCanonical: string | null;
}

// ---------------------------------------------------------------------------
// Streak milestone seed rewards (mirrors src/lib/constants/streaks.ts)
// ---------------------------------------------------------------------------

const STREAK_CHECKPOINTS: ReadonlyArray<{ value: number; reward: number }> = [
  { value: 5, reward: 6 },
  { value: 10, reward: 12 },
  { value: 15, reward: 5 },
  { value: 20, reward: 6 },
  { value: 25, reward: 20 },
  { value: 30, reward: 7 },
  { value: 35, reward: 8 },
  { value: 40, reward: 9 },
  { value: 45, reward: 10 },
  { value: 50, reward: 30 },
  { value: 75, reward: 35 },
  { value: 100, reward: 45 },
];

function getStreakMilestoneReward(streak: number): number {
  return STREAK_CHECKPOINTS.find((cp) => cp.value === streak)?.reward ?? 0;
}

const BASE_CORRECT_SEED_REWARD = 1;

// ---------------------------------------------------------------------------
// Week start calculation (mirrors src/lib/utils/weekly-leaderboard.ts)
// ---------------------------------------------------------------------------

const WEEKDAY_INDEX: Record<string, number> = {
  Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6,
};

const CENTRAL_DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Chicago',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  weekday: 'short',
});

function getCentralParts(date: Date): { year: number; month: number; day: number; weekday: number } {
  const parts = CENTRAL_DATE_FORMATTER.formatToParts(date);
  const year = Number.parseInt(parts.find((p) => p.type === 'year')?.value ?? '0', 10);
  const month = Number.parseInt(parts.find((p) => p.type === 'month')?.value ?? '1', 10);
  const day = Number.parseInt(parts.find((p) => p.type === 'day')?.value ?? '1', 10);
  const weekdayToken = parts.find((p) => p.type === 'weekday')?.value ?? 'Mon';
  return { year, month, day, weekday: WEEKDAY_INDEX[weekdayToken] ?? 0 };
}

export function getCurrentWeekStart(date = new Date()): string {
  const parts = getCentralParts(date);
  const localDate = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 12));
  localDate.setUTCDate(localDate.getUTCDate() - parts.weekday);
  return localDate.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Event generation
// ---------------------------------------------------------------------------

/**
 * Generates a batch of round-resolved events for a single bot on a given date.
 * Uses a seeded RNG so the same (date + slug) always produces identical events.
 */
export function generateBotEvents(options: {
  persona: HouseAccountPersona;
  date: string; // YYYY-MM-DD
  currentStreak: number;
  weeklySeenBirdKeys: Set<string>;
}): BotProgressEvent[] {
  const { persona, date, currentStreak } = options;
  const seedKey = `${date}:${persona.slug}`;
  const rng = createSeededRandom(seedKey);

  // Decide whether the bot plays today
  if (!randomBool(rng, persona.participationRate)) {
    return [];
  }

  const roundCount = randomInt(rng, persona.roundsPerDayRange[0], persona.roundsPerDayRange[1]);
  const events: BotProgressEvent[] = [];
  let streak = currentStreak;

  // Spread play window: bots "play" between 09:00–22:00 local (UTC-5/6)
  // We store occurredAt as UTC. Use 14:00–03:00 UTC as the window.
  const windowStartHour = 14; // 14:00 UTC ≈ 09:00 CDT
  const windowEndHour = 27;   // 03:00 UTC next day ≈ 22:00 CDT

  const dayMs = Date.parse(`${date}T00:00:00Z`);

  for (let i = 0; i < roundCount; i++) {
    const isRealBird = randomBool(rng, persona.realBirdRate);
    const accuracy = persona.accuracyBand[0] + rng() * (persona.accuracyBand[1] - persona.accuracyBand[0]);
    const isCorrect = randomBool(rng, accuracy);
    const birdKey = isRealBird
      ? randomPick(rng, SAMPLE_REAL_BIRD_KEYS)
      : randomPick(rng, SAMPLE_FAKE_BIRD_KEYS);

    const isNewBirdEncounter = isRealBird && !options.weeklySeenBirdKeys.has(birdKey);
    if (isNewBirdEncounter) {
      options.weeklySeenBirdKeys.add(birdKey);
    }

    if (isCorrect) {
      streak++;
    } else {
      streak = 0;
    }

    const seedsEarned = isCorrect
      ? BASE_CORRECT_SEED_REWARD + getStreakMilestoneReward(streak)
      : 0;

    // Distribute timestamps evenly across the play window
    const hoursOffset = windowStartHour + (i / Math.max(roundCount - 1, 1)) * (windowEndHour - windowStartHour);
    const occurredAt = new Date(dayMs + hoursOffset * 3_600_000).toISOString();

    events.push({
      eventId: `bot:${persona.slug}:${date}:${i}`,
      eventType: 'round-resolved',
      occurredAt,
      payload: {
        mode: 'classic',
        isCorrect,
        streakProtected: false,
        birdKey,
        isRealBird,
        isNewBirdEncounter,
        currentStreak: streak,
        seedsEarned,
      },
    });
  }

  return events;
}

// ---------------------------------------------------------------------------
// Weekly stats computation (mirrors createWeeklyStatsUpdate in route.ts)
// ---------------------------------------------------------------------------

function computeWeeklyStatsUpdate(options: {
  currentWeekStart: string;
  existingRow: ExistingLeaderboardRow | null;
  events: BotProgressEvent[];
}) {
  const base = options.existingRow?.currentWeekStart === options.currentWeekStart
    ? options.existingRow
    : null;

  const seenBirdKeys = new Set(base?.weeklySeenBirdKeys ?? []);
  let weeklyBirdsSeen = base?.weeklyBirdsSeen ?? 0;
  let weeklyBirdsIdentified = base?.weeklyBirdsIdentified ?? 0;
  let weeklySeedsEarned = base?.weeklySeedsEarned ?? 0;
  let weeklyBestStreak = base?.weeklyBestStreak ?? 0;
  let weeklyNewBirdsDiscovered = base?.weeklyNewBirdsDiscovered ?? 0;
  let weeklyFakeBirdsIdentified = base?.weeklyFakeBirdsIdentified ?? 0;
  let weeklyRealBirdsIdentified = base?.weeklyRealBirdsIdentified ?? 0;
  let weeklyLastPlayedAt: string | null = null;

  for (const event of options.events) {
    weeklyBirdsSeen += 1;
    weeklyLastPlayedAt = event.occurredAt;

    if (event.payload.birdKey) {
      seenBirdKeys.add(event.payload.birdKey);
    }

    if (event.payload.isNewBirdEncounter) {
      weeklyNewBirdsDiscovered += 1;
    }

    weeklyBestStreak = Math.max(weeklyBestStreak, event.payload.currentStreak ?? 0);
    weeklySeedsEarned += event.payload.seedsEarned ?? 0;

    if (event.payload.isCorrect) {
      weeklyBirdsIdentified += 1;
      if (event.payload.isRealBird === true) {
        weeklyRealBirdsIdentified += 1;
      } else if (event.payload.isRealBird === false) {
        weeklyFakeBirdsIdentified += 1;
      }
    }
  }

  return {
    current_week_start: options.currentWeekStart,
    weekly_birds_seen: weeklyBirdsSeen,
    weekly_birds_identified: weeklyBirdsIdentified,
    weekly_seeds_earned: weeklySeedsEarned,
    weekly_best_streak: weeklyBestStreak,
    weekly_new_birds_discovered: weeklyNewBirdsDiscovered,
    weekly_fake_birds_identified: weeklyFakeBirdsIdentified,
    weekly_real_birds_identified: weeklyRealBirdsIdentified,
    weekly_unique_birds_seen: seenBirdKeys.size,
    weekly_seen_bird_keys: Array.from(seenBirdKeys).sort((a, b) => a.localeCompare(b)),
    weekly_last_played_at: weeklyLastPlayedAt,
  };
}

// ---------------------------------------------------------------------------
// DB read
// ---------------------------------------------------------------------------

export async function readBotCurrentState(admin: SupabaseClient, userId: string) {
  const [{ data: progress }, { data: leaderboardRow }, { data: existingEventIds }] = await Promise.all([
    admin
      .from('player_progress')
      .select('birds_seen, birds_identified, current_streak, best_streak, seeds')
      .eq('user_id', userId)
      .maybeSingle(),
    admin
      .from('leaderboard_stats')
      .select([
        'username_canonical',
        'current_week_start',
        'weekly_birds_seen',
        'weekly_birds_identified',
        'weekly_seeds_earned',
        'weekly_best_streak',
        'weekly_new_birds_discovered',
        'weekly_fake_birds_identified',
        'weekly_real_birds_identified',
        'weekly_unique_birds_seen',
        'weekly_seen_bird_keys',
      ].join(', '))
      .eq('user_id', userId)
      .maybeSingle(),
    admin
      .from('progress_event_log')
      .select('event_id')
      .eq('user_id', userId)
      .like('event_id', 'bot:%'),
  ]);

  const seenBirdKeys: string[] = Array.isArray(leaderboardRow?.weekly_seen_bird_keys)
    ? (leaderboardRow.weekly_seen_bird_keys as string[]).filter((k): k is string => typeof k === 'string')
    : [];

  const existingRow: ExistingLeaderboardRow | null = leaderboardRow
    ? {
        currentWeekStart: typeof leaderboardRow.current_week_start === 'string' ? leaderboardRow.current_week_start : null,
        weeklyBirdsSeen: typeof leaderboardRow.weekly_birds_seen === 'number' ? leaderboardRow.weekly_birds_seen : 0,
        weeklyBirdsIdentified: typeof leaderboardRow.weekly_birds_identified === 'number' ? leaderboardRow.weekly_birds_identified : 0,
        weeklySeedsEarned: typeof leaderboardRow.weekly_seeds_earned === 'number' ? leaderboardRow.weekly_seeds_earned : 0,
        weeklyBestStreak: typeof leaderboardRow.weekly_best_streak === 'number' ? leaderboardRow.weekly_best_streak : 0,
        weeklyNewBirdsDiscovered: typeof leaderboardRow.weekly_new_birds_discovered === 'number' ? leaderboardRow.weekly_new_birds_discovered : 0,
        weeklyFakeBirdsIdentified: typeof leaderboardRow.weekly_fake_birds_identified === 'number' ? leaderboardRow.weekly_fake_birds_identified : 0,
        weeklyRealBirdsIdentified: typeof leaderboardRow.weekly_real_birds_identified === 'number' ? leaderboardRow.weekly_real_birds_identified : 0,
        weeklyUniqueBirdsSeen: typeof leaderboardRow.weekly_unique_birds_seen === 'number' ? leaderboardRow.weekly_unique_birds_seen : 0,
        weeklySeenBirdKeys: seenBirdKeys,
        usernameCanonical: typeof leaderboardRow.username_canonical === 'string' ? leaderboardRow.username_canonical : null,
      }
    : null;

  return {
    birdsSeen: progress?.birds_seen ?? 0,
    birdsIdentified: progress?.birds_identified ?? 0,
    currentStreak: typeof progress?.current_streak === 'number' ? progress.current_streak : 0,
    bestStreak: typeof progress?.best_streak === 'number' ? progress.best_streak : 0,
    seeds: typeof progress?.seeds === 'number' ? progress.seeds : 0,
    existingRow,
    alreadySeenEventIds: new Set((existingEventIds ?? []).map((r) => r.event_id as string)),
    weeklySeenBirdKeys: new Set(seenBirdKeys),
  };
}

// ---------------------------------------------------------------------------
// DB write
// ---------------------------------------------------------------------------

export async function applyBotProgressEvents(options: {
  admin: SupabaseClient;
  userId: string;
  events: BotProgressEvent[];
  currentWeekStart: string;
  currentState: Awaited<ReturnType<typeof readBotCurrentState>>;
  dryRun: boolean;
}): Promise<{ applied: number; skipped: number }> {
  const { admin, userId, currentWeekStart, currentState, dryRun } = options;

  // Filter out already-applied events (idempotent)
  const pendingEvents = options.events.filter((e) => !currentState.alreadySeenEventIds.has(e.eventId));
  const skipped = options.events.length - pendingEvents.length;

  if (pendingEvents.length === 0) {
    return { applied: 0, skipped };
  }

  if (dryRun) {
    return { applied: pendingEvents.length, skipped };
  }

  // Compute updated player_progress
  let streak = currentState.currentStreak;
  let bestStreak = currentState.bestStreak;
  let birdsSeen = currentState.birdsSeen;
  let birdsIdentified = currentState.birdsIdentified;
  let seeds = currentState.seeds;

  for (const event of pendingEvents) {
    birdsSeen++;
    if (event.payload.isCorrect) {
      birdsIdentified++;
      streak++;
      bestStreak = Math.max(bestStreak, streak);
    } else {
      streak = 0;
    }
    seeds += event.payload.seedsEarned ?? 0;
  }

  const weeklyStatsUpdate = computeWeeklyStatsUpdate({
    currentWeekStart,
    existingRow: currentState.existingRow,
    events: pendingEvents,
  });

  const accuracy = birdsSeen > 0 ? Number(((birdsIdentified / birdsSeen) * 100).toFixed(2)) : 0;

  await Promise.all([
    admin.from('player_progress').upsert(
      {
        user_id: userId,
        birds_seen: birdsSeen,
        birds_identified: birdsIdentified,
        current_streak: streak,
        best_streak: bestStreak,
        seeds,
      },
      { onConflict: 'user_id' }
    ),
    admin.from('leaderboard_stats').upsert(
      {
        user_id: userId,
        username_canonical: currentState.existingRow?.usernameCanonical ?? null,
        birds_identified: birdsIdentified,
        best_streak: bestStreak,
        accuracy,
        seeds,
        ...weeklyStatsUpdate,
      },
      { onConflict: 'user_id' }
    ),
    admin.from('progress_event_log').insert(
      pendingEvents.map((event) => ({
        user_id: userId,
        event_id: event.eventId,
        event_type: event.eventType,
        occurred_at: event.occurredAt,
      }))
    ),
  ]);

  return { applied: pendingEvents.length, skipped };
}
