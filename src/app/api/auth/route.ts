import { NextRequest, NextResponse } from 'next/server';
import { DAILY_CHALLENGE_CONFIG } from '@/lib/constants/daily-challenge';
import { milestones } from '@/lib/constants/milestones';
import { missionDefinitions } from '@/lib/constants/missions';
import { getWeeklyChallengeForWeek } from '@/lib/constants/weekly-challenges';
import { getThemeUnlockByThemeName } from '@/lib/constants/theme-unlocks';
import { finch } from '@/lib/themes';
import { applyProgressEvents as reduceProgressEvents, createProgressSnapshot, type ProgressEvent } from '@/lib/progress/progress-events';
import {
  buildPlacementSummary,
  buildWeeklyOverview,
  getWeeklyRewardSeeds,
  normalizeWeeklySeenBirdKeys,
  qualifiesForWeeklyChallenge,
  rankWeeklyLeaderboardRows,
  type WeeklyLeaderboardStatsRow,
} from '@/lib/server/weekly-leaderboard';
import { normalizeBirdScore } from '@/lib/utils/player-progress';
import { validateUsername } from '@/lib/auth/username';
import { deriveBirdKey } from '@/lib/utils/bird-journal';
import { getDailyMissionStreaks } from '@/lib/utils/daily-mission-history';
import { getCurrentWeekStart, getWeekEndTimestamp } from '@/lib/utils/weekly-leaderboard';
import { hasSupabaseEnv } from '@/lib/supabase/env';
import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase/server';
import type {
  BirdJournalEntry,
  BirdJournalMetadata,
  BirdScore,
  DailyChallengeHistoryEntry,
  DailyMissionHistoryEntry,
  WeeklyPlacementSummary,
} from '@/types';

type AuthAction = 'validate-username' | 'register-account' | 'get-account-state' | 'get-leaderboard' | 'resolve-sign-in-identifier' | 'save-profile' | 'save-avatar-palette' | 'sync-local-progress' | 'sync-bird-journal' | 'pull-account-progress' | 'purchase-theme' | 'apply-progress-events' | 'sync-daily-mission-completion';
type RewardAuthAction = 'claim-daily-challenge-bonuses' | 'claim-mission-reward' | 'claim-mission-set-bonus' | 'purchase-streak-insurance';

interface ValidateUsernameRequest {
  action: AuthAction;
  username: string;
}

interface GetAccountStateRequest {
  action: AuthAction;
}

interface RegisterAccountRequest {
  action: AuthAction;
  username: string;
  email: string;
  password: string;
}

interface GetLeaderboardRequest {
  action: AuthAction;
}

interface ResolveSignInIdentifierRequest {
  action: AuthAction;
  identifier: string;
}

interface PullAccountProgressRequest {
  action: AuthAction;
  missionDate: string;
}

interface PurchaseThemeRequest {
  action: AuthAction;
  themeName: string;
}

interface ApplyProgressEventsRequest {
  action: AuthAction;
  events: ProgressEvent[];
}

interface ClaimDailyChallengeBonusesRequest {
  action: RewardAuthAction;
  date: string;
  rewardSeeds: number;
  correctAnswers: number;
  roundsPlayed: number;
}

interface ClaimMissionRewardRequest {
  action: RewardAuthAction;
  claimId: string;
  rewardSeeds: number;
}

interface PurchaseStreakInsuranceRequest {
  action: RewardAuthAction;
}

interface SaveProfileRequest {
  action: AuthAction;
  username: string;
  avatarPalette?: string;
}

interface SaveAvatarPaletteRequest {
  action: AuthAction;
  avatarPalette: string;
}

interface SyncLocalProgressRequest {
  action: AuthAction;
  progress: {
    score: Partial<BirdScore> | null;
    unlockedThemes: string[];
    dailyChallengeHistory: DailyChallengeHistoryEntry[];
    dailyMissionHistory: DailyMissionHistoryEntry[];
    milestones: number[];
    journalEntries: BirdJournalEntry[];
  };
}

interface SyncBirdJournalRequest {
  action: AuthAction;
  journalEntries: BirdJournalEntry[];
}

const BIRD_JOURNAL_PULL_LIMIT = 10_000;

interface SyncDailyMissionCompletionRequest {
  action: AuthAction;
  date: string;
}

export function shouldClearServerStreakInsurance(
  isActive: boolean,
  pendingEvents: ProgressEvent[]
): boolean {
  return isActive && pendingEvents.some((event) => event.eventType === 'round-resolved');
}

interface AuthenticatedRequestContext {
  userId: string;
  email: string | null;
}

function isValidateUsernameRequest(value: unknown): value is ValidateUsernameRequest {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<ValidateUsernameRequest>;
  return candidate.action === 'validate-username' && typeof candidate.username === 'string';
}

function isGetAccountStateRequest(value: unknown): value is GetAccountStateRequest {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<GetAccountStateRequest>;
  return candidate.action === 'get-account-state';
}

function isRegisterAccountRequest(value: unknown): value is RegisterAccountRequest {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<RegisterAccountRequest>;
  return candidate.action === 'register-account'
    && typeof candidate.username === 'string'
    && typeof candidate.email === 'string'
    && typeof candidate.password === 'string';
}

function isGetLeaderboardRequest(value: unknown): value is GetLeaderboardRequest {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<GetLeaderboardRequest>;
  return candidate.action === 'get-leaderboard';
}

function isResolveSignInIdentifierRequest(value: unknown): value is ResolveSignInIdentifierRequest {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<ResolveSignInIdentifierRequest>;
  return candidate.action === 'resolve-sign-in-identifier' && typeof candidate.identifier === 'string';
}

function isPullAccountProgressRequest(value: unknown): value is PullAccountProgressRequest {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<PullAccountProgressRequest>;
  return candidate.action === 'pull-account-progress' && typeof candidate.missionDate === 'string';
}

function isSaveProfileRequest(value: unknown): value is SaveProfileRequest {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<SaveProfileRequest>;
  return candidate.action === 'save-profile' && typeof candidate.username === 'string';
}

function isSaveAvatarPaletteRequest(value: unknown): value is SaveAvatarPaletteRequest {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<SaveAvatarPaletteRequest>;
  return candidate.action === 'save-avatar-palette' && typeof candidate.avatarPalette === 'string';
}

function isPurchaseThemeRequest(value: unknown): value is PurchaseThemeRequest {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<PurchaseThemeRequest>;
  return candidate.action === 'purchase-theme' && typeof candidate.themeName === 'string';
}

function isProgressEvent(value: unknown): value is ProgressEvent {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<ProgressEvent> & { payload?: Record<string, unknown> };
  return typeof candidate.eventId === 'string'
    && typeof candidate.occurredAt === 'string'
    && (
      (candidate.eventType === 'round-resolved'
        && typeof candidate.payload?.mode === 'string'
        && typeof candidate.payload?.isCorrect === 'boolean'
        && typeof candidate.payload?.streakProtected === 'boolean'
        && (candidate.payload?.birdKey === undefined || typeof candidate.payload.birdKey === 'string')
        && (candidate.payload?.isRealBird === undefined || typeof candidate.payload.isRealBird === 'boolean')
        && (candidate.payload?.isNewBirdEncounter === undefined || typeof candidate.payload.isNewBirdEncounter === 'boolean')
        && (candidate.payload?.currentStreak === undefined || typeof candidate.payload.currentStreak === 'number')
        && (candidate.payload?.seedsEarned === undefined || typeof candidate.payload.seedsEarned === 'number'))
      || (candidate.eventType === 'mission-reward-granted'
        && typeof candidate.payload?.missionDate === 'string'
        && typeof candidate.payload?.missionId === 'string'
        && typeof candidate.payload?.rewardSeeds === 'number')
      || ((candidate.eventType === 'hint-spent' || candidate.eventType === 'hint-refunded')
        && typeof candidate.payload?.mode === 'string'
        && typeof candidate.payload?.cost === 'number')
    );
}

function isApplyProgressEventsRequest(value: unknown): value is ApplyProgressEventsRequest {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<ApplyProgressEventsRequest>;
  return candidate.action === 'apply-progress-events'
    && Array.isArray(candidate.events)
    && candidate.events.every(isProgressEvent);
}

function isClaimDailyChallengeBonusesRequest(value: unknown): value is ClaimDailyChallengeBonusesRequest {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<ClaimDailyChallengeBonusesRequest>;
  return candidate.action === 'claim-daily-challenge-bonuses'
    && typeof candidate.date === 'string'
    && typeof candidate.rewardSeeds === 'number'
    && typeof candidate.correctAnswers === 'number'
    && typeof candidate.roundsPlayed === 'number';
}

function isClaimMissionRewardRequest(value: unknown): value is ClaimMissionRewardRequest {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<ClaimMissionRewardRequest>;
  return (candidate.action === 'claim-mission-reward' || candidate.action === 'claim-mission-set-bonus')
    && typeof candidate.claimId === 'string'
    && typeof candidate.rewardSeeds === 'number';
}

function isPurchaseStreakInsuranceRequest(value: unknown): value is PurchaseStreakInsuranceRequest {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<PurchaseStreakInsuranceRequest>;
  return candidate.action === 'purchase-streak-insurance';
}

async function eventAlreadyRecorded(admin: ReturnType<typeof createSupabaseAdminClient>, userId: string, eventId: string): Promise<boolean> {
  const { data } = await admin
    .from('progress_event_log')
    .select('event_id')
    .eq('user_id', userId)
    .eq('event_id', eventId)
    .maybeSingle();

  return Boolean(data);
}

async function recordProgressEvent(admin: ReturnType<typeof createSupabaseAdminClient>, userId: string, eventId: string, eventType: string): Promise<void> {
  await admin
    .from('progress_event_log')
    .insert({
      user_id: userId,
      event_id: eventId,
      event_type: eventType,
      occurred_at: new Date().toISOString(),
    });
}

async function readProgressSummary(admin: ReturnType<typeof createSupabaseAdminClient>, userId: string) {
  const { data } = await admin
    .from('player_progress')
    .select('birds_seen, birds_identified, seeds, current_streak, best_streak, current_daily_streak, best_daily_streak')
    .eq('user_id', userId)
    .maybeSingle();

  return {
    birdsSeen: data?.birds_seen ?? 0,
    birdsIdentified: data?.birds_identified ?? 0,
    seeds: data?.seeds ?? 0,
    currentStreak: data?.current_streak ?? 0,
    bestStreak: data?.best_streak ?? 0,
    currentDailyStreak: data?.current_daily_streak ?? 0,
    bestDailyStreak: data?.best_daily_streak ?? 0,
  };
}

function calculateAccuracy(birdsSeen: number, birdsIdentified: number): number {
  return birdsSeen > 0 ? Number(((birdsIdentified / birdsSeen) * 100).toFixed(2)) : 0;
}

function getTodayChallengeDate(now = new Date()): string {
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, '0');
  const day = `${now.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function hashValue(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function getDailyMissionIdsForDate(date: string): string[] {
  return [...missionDefinitions]
    .sort((left, right) => hashValue(`${date}:${left.id}`) - hashValue(`${date}:${right.id}`))
    .slice(0, 3)
    .map((mission) => mission.id);
}

function isDailyChallengeHistoryEntryArray(value: unknown): value is DailyChallengeHistoryEntry[] {
  return Array.isArray(value) && value.every((entry) => (
    Boolean(entry)
      && typeof entry === 'object'
      && typeof entry.date === 'string'
      && typeof entry.correctAnswers === 'number'
      && typeof entry.roundsPlayed === 'number'
      && typeof entry.completed === 'boolean'
  ));
}

function isBirdJournalEntryArray(value: unknown): value is BirdJournalEntry[] {
  return Array.isArray(value) && value.every((entry) => (
    Boolean(entry)
      && typeof entry === 'object'
      && typeof entry.birdKey === 'string'
      && typeof entry.birdName === 'string'
      && typeof entry.isReal === 'boolean'
      && typeof entry.seenCount === 'number'
      && typeof entry.correctCount === 'number'
      && typeof entry.incorrectCount === 'number'
      && typeof entry.lastSeenAt === 'string'
      && Boolean(entry.metadata)
      && typeof entry.metadata === 'object'
  ));
}

function isSyncLocalProgressRequest(value: unknown): value is SyncLocalProgressRequest {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<SyncLocalProgressRequest>;

  return candidate.action === 'sync-local-progress'
    && Boolean(candidate.progress)
    && typeof candidate.progress === 'object'
    && Array.isArray(candidate.progress.unlockedThemes)
    && Array.isArray(candidate.progress.milestones)
    && isDailyChallengeHistoryEntryArray(candidate.progress.dailyChallengeHistory)
    && (candidate.progress.dailyMissionHistory === undefined || Array.isArray(candidate.progress.dailyMissionHistory))
    && isBirdJournalEntryArray(candidate.progress.journalEntries);
}

function isSyncBirdJournalRequest(value: unknown): value is SyncBirdJournalRequest {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<SyncBirdJournalRequest>;
  return candidate.action === 'sync-bird-journal'
    && isBirdJournalEntryArray(candidate.journalEntries);
}

function isSyncDailyMissionCompletionRequest(value: unknown): value is SyncDailyMissionCompletionRequest {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<SyncDailyMissionCompletionRequest>;
  return candidate.action === 'sync-daily-mission-completion' && typeof candidate.date === 'string';
}

function normalizeBirdJournalMetadata(metadata: BirdJournalMetadata | null | undefined): BirdJournalMetadata {
  if (!metadata) {
    return {};
  }

  return {
    regionLabel: typeof metadata.regionLabel === 'string' ? metadata.regionLabel : undefined,
    sciName: typeof metadata.sciName === 'string' ? metadata.sciName : undefined,
    fact: typeof metadata.fact === 'string' ? metadata.fact : undefined,
    summary: typeof metadata.summary === 'string' ? metadata.summary : undefined,
    url: typeof metadata.url === 'string' ? metadata.url : undefined,
    articleUrl: typeof metadata.articleUrl === 'string' ? metadata.articleUrl : undefined,
    imageUrl: typeof metadata.imageUrl === 'string' ? metadata.imageUrl : undefined,
    description: typeof metadata.description === 'string' ? metadata.description : undefined,
    classificationRevealed: typeof metadata.classificationRevealed === 'boolean'
      ? metadata.classificationRevealed
      : undefined,
  };
}

function normalizeBirdJournalEntries(entries: BirdJournalEntry[]): BirdJournalEntry[] {
  const entriesByKey = new Map<string, BirdJournalEntry>();

  for (const entry of entries) {
    const birdName = entry.birdName.trim();
    if (!birdName) {
      continue;
    }

    const birdKey = deriveBirdKey(birdName, entry.isReal);
    const existing = entriesByKey.get(birdKey);
    const normalizedEntry: BirdJournalEntry = {
      birdKey,
      birdName,
      isReal: entry.isReal,
      seenCount: Math.max(existing?.seenCount ?? 0, Math.max(0, Math.floor(entry.seenCount))),
      correctCount: Math.max(existing?.correctCount ?? 0, Math.max(0, Math.floor(entry.correctCount))),
      incorrectCount: Math.max(existing?.incorrectCount ?? 0, Math.max(0, Math.floor(entry.incorrectCount))),
      lastSeenAt: typeof entry.lastSeenAt === 'string' ? entry.lastSeenAt : new Date(0).toISOString(),
      metadata: {
        ...normalizeBirdJournalMetadata(entry.metadata),
        classificationRevealed: Boolean(existing?.metadata.classificationRevealed) || Boolean(entry.metadata?.classificationRevealed),
      },
    };

    if (!existing || normalizedEntry.lastSeenAt >= existing.lastSeenAt) {
      entriesByKey.set(birdKey, normalizedEntry);
    }
  }

  return Array.from(entriesByKey.values()).sort((left, right) => right.lastSeenAt.localeCompare(left.lastSeenAt));
}

async function upsertBirdJournalEntries(options: {
  admin: ReturnType<typeof createSupabaseAdminClient>;
  userId: string;
  journalEntries: BirdJournalEntry[];
}): Promise<{ ok: true } | { ok: false }> {
  const { admin, userId, journalEntries } = options;

  if (journalEntries.length === 0) {
    return { ok: true };
  }

  const journalKeys = journalEntries.map((entry) => entry.birdKey);
  const { data: existingJournalRows, error: existingJournalError } = await admin
    .from('bird_journal')
    .select('bird_key, bird_name, is_real, seen_count, correct_count, incorrect_count, last_seen_at, metadata')
    .eq('user_id', userId)
    .in('bird_key', journalKeys);

  if (existingJournalError) {
    return { ok: false };
  }

  const existingJournalMap = new Map(
    (existingJournalRows ?? []).map((entry) => [
      entry.bird_key,
      {
        birdKey: entry.bird_key,
        birdName: entry.bird_name,
        isReal: entry.is_real,
        seenCount: entry.seen_count,
        correctCount: entry.correct_count,
        incorrectCount: entry.incorrect_count,
        lastSeenAt: entry.last_seen_at,
        metadata: normalizeBirdJournalMetadata(entry.metadata as BirdJournalMetadata),
      },
    ])
  );

  const { error: journalError } = await admin
    .from('bird_journal')
    .upsert(
      journalEntries.map((entry) => {
        const existingEntry = existingJournalMap.get(entry.birdKey);
        const useIncomingMetadata = !existingEntry || entry.lastSeenAt >= existingEntry.lastSeenAt;

        return {
          user_id: userId,
          bird_key: entry.birdKey,
          bird_name: existingEntry?.birdName ?? entry.birdName,
          is_real: existingEntry?.isReal ?? entry.isReal,
          seen_count: Math.max(existingEntry?.seenCount ?? 0, entry.seenCount),
          correct_count: Math.max(existingEntry?.correctCount ?? 0, entry.correctCount),
          incorrect_count: Math.max(existingEntry?.incorrectCount ?? 0, entry.incorrectCount),
          last_seen_at: existingEntry && existingEntry.lastSeenAt > entry.lastSeenAt
            ? existingEntry.lastSeenAt
            : entry.lastSeenAt,
          metadata: {
            ...(useIncomingMetadata ? entry.metadata : existingEntry?.metadata),
            classificationRevealed: Boolean(existingEntry?.metadata.classificationRevealed) || Boolean(entry.metadata.classificationRevealed),
          },
        };
      }),
      { onConflict: 'user_id,bird_key' }
    );

  return journalError ? { ok: false } : { ok: true };
}

function configErrorResponse() {
  return NextResponse.json({ error: 'supabase_not_configured' }, { status: 503 });
}

async function getAuthenticatedRequestContext(): Promise<AuthenticatedRequestContext | null> {
  if (!hasSupabaseEnv()) {
    return null;
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user) {
      return null;
    }

    return {
      userId: data.user.id,
      email: data.user.email ?? null,
    };
  } catch {
    return null;
  }
}

async function lookupUsernameAvailability(username: string, excludeUserId?: string): Promise<boolean | null> {
  if (!hasSupabaseEnv()) {
    return null;
  }

  try {
    const supabase = createSupabaseAdminClient();
    let query = supabase
      .from('profiles')
      .select('user_id', { count: 'exact', head: true })
      .eq('username_canonical', username)
      .limit(1);

    if (excludeUserId) {
      query = query.neq('user_id', excludeUserId);
    }

    const { count, error } = await query;

    if (error) {
      return null;
    }

    return (count ?? 0) === 0;
  } catch {
    return null;
  }
}

function normalizeThemeNames(themeNames: string[]): string[] {
  return Array.from(
    new Set(
      themeNames
        .filter((themeName): themeName is string => typeof themeName === 'string')
        .map((themeName) => themeName.trim())
        .filter(Boolean)
    )
  ).sort((left, right) => left.localeCompare(right));
}

function normalizeDailyHistory(history: DailyChallengeHistoryEntry[]): DailyChallengeHistoryEntry[] {
  const uniqueByDate = new Map<string, DailyChallengeHistoryEntry>();

  for (const entry of history) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(entry.date)) {
      continue;
    }

    uniqueByDate.set(entry.date, {
      date: entry.date,
      correctAnswers: Math.max(0, Math.floor(entry.correctAnswers)),
      roundsPlayed: Math.max(0, Math.floor(entry.roundsPlayed)),
      completed: Boolean(entry.completed),
    });
  }

  return Array.from(uniqueByDate.values()).sort((left, right) => right.date.localeCompare(left.date));
}

function normalizeDailyMissionHistory(history: DailyMissionHistoryEntry[]): DailyMissionHistoryEntry[] {
  return Array.from(
    new Map(
      history
        .filter((entry) => /^\d{4}-\d{2}-\d{2}$/.test(entry.date))
        .map((entry) => [entry.date, { date: entry.date }])
    ).values()
  ).sort((left, right) => right.date.localeCompare(left.date));
}

function normalizeMilestoneValues(values: number[]): number[] {
  return Array.from(
    new Set(
      values
        .filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
        .map((value) => Math.max(0, Math.floor(value)))
    )
  ).sort((left, right) => left - right);
}

function mapLeaderboardStatsRow(row: Record<string, unknown>): WeeklyLeaderboardStatsRow {
  return {
    userId: String(row.user_id ?? ''),
    usernameCanonical: typeof row.username_canonical === 'string' ? row.username_canonical : null,
    currentWeekStart: typeof row.current_week_start === 'string' ? row.current_week_start : null,
    weeklyBirdsSeen: typeof row.weekly_birds_seen === 'number' ? row.weekly_birds_seen : 0,
    weeklyBirdsIdentified: typeof row.weekly_birds_identified === 'number' ? row.weekly_birds_identified : 0,
    weeklySeedsEarned: typeof row.weekly_seeds_earned === 'number' ? row.weekly_seeds_earned : 0,
    weeklyBestStreak: typeof row.weekly_best_streak === 'number' ? row.weekly_best_streak : 0,
    weeklyNewBirdsDiscovered: typeof row.weekly_new_birds_discovered === 'number' ? row.weekly_new_birds_discovered : 0,
    weeklyFakeBirdsIdentified: typeof row.weekly_fake_birds_identified === 'number' ? row.weekly_fake_birds_identified : 0,
    weeklyRealBirdsIdentified: typeof row.weekly_real_birds_identified === 'number' ? row.weekly_real_birds_identified : 0,
    weeklyUniqueBirdsSeen: typeof row.weekly_unique_birds_seen === 'number' ? row.weekly_unique_birds_seen : 0,
    weeklySeenBirdKeys: normalizeWeeklySeenBirdKeys(row.weekly_seen_bird_keys),
    previousWeekStart: typeof row.previous_week_start === 'string' ? row.previous_week_start : null,
    previousWeekParticipated: Boolean(row.previous_week_participated),
    previousWeekQualified: Boolean(row.previous_week_qualified),
    previousWeekRank: typeof row.previous_week_rank === 'number' ? row.previous_week_rank : null,
    previousWeekRewardSeeds: typeof row.previous_week_reward_seeds === 'number' ? row.previous_week_reward_seeds : 0,
  };
}

function createWeeklyResetState(currentWeekStart: string) {
  return {
    current_week_start: currentWeekStart,
    weekly_birds_seen: 0,
    weekly_birds_identified: 0,
    weekly_seeds_earned: 0,
    weekly_best_streak: 0,
    weekly_new_birds_discovered: 0,
    weekly_fake_birds_identified: 0,
    weekly_real_birds_identified: 0,
    weekly_unique_birds_seen: 0,
    weekly_seen_bird_keys: [],
    weekly_last_played_at: null,
  };
}

function createWeeklyStatsUpdate(options: {
  currentWeekStart: string;
  existingRow: WeeklyLeaderboardStatsRow | null;
  pendingEvents: ProgressEvent[];
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

  for (const event of options.pendingEvents) {
    if (event.eventType === 'mission-reward-granted') {
      weeklySeedsEarned += Math.max(0, Math.floor(event.payload.rewardSeeds));
      continue;
    }

    if (event.eventType !== 'round-resolved') {
      continue;
    }

    weeklyBirdsSeen += 1;
    weeklyLastPlayedAt = event.occurredAt;

    if (event.payload.birdKey) {
      seenBirdKeys.add(event.payload.birdKey);
    }

    if (event.payload.isNewBirdEncounter) {
      weeklyNewBirdsDiscovered += 1;
    }

    weeklyBestStreak = Math.max(weeklyBestStreak, Math.max(0, Math.floor(event.payload.currentStreak ?? 0)));
    weeklySeedsEarned += Math.max(0, Math.floor(event.payload.seedsEarned ?? 0));

    if (event.payload.isCorrect) {
      weeklyBirdsIdentified += 1;

      if (event.payload.isRealBird) {
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
    weekly_seen_bird_keys: Array.from(seenBirdKeys).sort((left, right) => left.localeCompare(right)),
    weekly_last_played_at: weeklyLastPlayedAt,
  };
}

async function tryInsertProgressEvent(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  userId: string,
  eventId: string,
  eventType: string,
  occurredAt: string
): Promise<boolean> {
  const { error } = await admin
    .from('progress_event_log')
    .insert({
      user_id: userId,
      event_id: eventId,
      event_type: eventType,
      occurred_at: occurredAt,
    });

  return !error;
}

async function finalizeExpiredWeeklyLeaderboards(admin: ReturnType<typeof createSupabaseAdminClient>): Promise<string> {
  const currentWeekStart = getCurrentWeekStart();
  const { data: staleRows } = await admin
    .from('leaderboard_stats')
    .select([
      'user_id',
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
    .not('current_week_start', 'is', null)
    .lt('current_week_start', currentWeekStart);

  const expiredRows = (staleRows ?? []).map((row) => mapLeaderboardStatsRow(row as unknown as Record<string, unknown>));

  if (expiredRows.length === 0) {
    return currentWeekStart;
  }

  const progressUserIds = expiredRows.map((row) => row.userId);
  const { data: progressRows } = await admin
    .from('player_progress')
    .select('user_id, seeds, best_weekly_placement, first_place_count, second_place_count, third_place_count')
    .in('user_id', progressUserIds);

  const progressMap = new Map(
    (progressRows ?? []).map((row) => [
      row.user_id as string,
      {
        seeds: typeof row.seeds === 'number' ? row.seeds : 0,
        bestWeeklyPlacement: typeof row.best_weekly_placement === 'number' ? row.best_weekly_placement : null,
        firstPlaceCount: typeof row.first_place_count === 'number' ? row.first_place_count : 0,
        secondPlaceCount: typeof row.second_place_count === 'number' ? row.second_place_count : 0,
        thirdPlaceCount: typeof row.third_place_count === 'number' ? row.third_place_count : 0,
      },
    ])
  );

  const rowsByWeek = new Map<string, WeeklyLeaderboardStatsRow[]>();
  for (const row of expiredRows) {
    const weekStart = row.currentWeekStart;
    if (!weekStart) {
      continue;
    }

    const currentRows = rowsByWeek.get(weekStart) ?? [];
    currentRows.push(row);
    rowsByWeek.set(weekStart, currentRows);
  }

  for (const [weekStart, rows] of rowsByWeek.entries()) {
    const challenge = getWeeklyChallengeForWeek(weekStart);
    const ranked = rankWeeklyLeaderboardRows(rows, challenge);
    const rankByUserId = new Map(ranked.rankedRows.map((item) => [item.userId, item.entry.rank]));
    const finalizedAt = new Date().toISOString();

    await Promise.all(rows.map(async (row) => {
      const participated = row.weeklyBirdsSeen > 0;
      const qualified = participated && qualifiesForWeeklyChallenge(row, challenge);
      const rank = qualified ? (rankByUserId.get(row.userId) ?? null) : null;
      const rewardSeeds = qualified ? getWeeklyRewardSeeds(rank) : 0;
      const rewardEventId = `weekly-leaderboard:${weekStart}:${row.userId}`;
      const progress = progressMap.get(row.userId) ?? {
        seeds: 0,
        bestWeeklyPlacement: null,
        firstPlaceCount: 0,
        secondPlaceCount: 0,
        thirdPlaceCount: 0,
      };

      const shouldCreditReward = rewardSeeds > 0
        ? await tryInsertProgressEvent(admin, row.userId, rewardEventId, 'weekly-leaderboard-finalized', finalizedAt)
        : false;

      if (shouldCreditReward) {
        const nextBestPlacement = rank
          ? (progress.bestWeeklyPlacement === null ? rank : Math.min(progress.bestWeeklyPlacement, rank))
          : progress.bestWeeklyPlacement;

        await admin
          .from('player_progress')
          .update({
            seeds: progress.seeds + rewardSeeds,
            best_weekly_placement: nextBestPlacement,
            first_place_count: progress.firstPlaceCount + (rank === 1 ? 1 : 0),
            second_place_count: progress.secondPlaceCount + (rank === 2 ? 1 : 0),
            third_place_count: progress.thirdPlaceCount + (rank === 3 ? 1 : 0),
          })
          .eq('user_id', row.userId);
      }

      await admin
        .from('leaderboard_stats')
        .update({
          ...createWeeklyResetState(currentWeekStart),
          previous_week_start: weekStart,
          previous_week_participated: participated,
          previous_week_qualified: qualified,
          previous_week_rank: rank,
          previous_week_reward_seeds: rewardSeeds,
          previous_week_finalized_at: finalizedAt,
        })
        .eq('user_id', row.userId)
        .eq('current_week_start', weekStart);
    }));
  }

  return currentWeekStart;
}

async function readLeaderboardStatsRow(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  userId: string
): Promise<WeeklyLeaderboardStatsRow | null> {
  const { data } = await admin
    .from('leaderboard_stats')
    .select([
      'user_id',
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
      'previous_week_start',
      'previous_week_participated',
      'previous_week_qualified',
      'previous_week_rank',
      'previous_week_reward_seeds',
    ].join(', '))
    .eq('user_id', userId)
    .maybeSingle();

  return data ? mapLeaderboardStatsRow(data as unknown as Record<string, unknown>) : null;
}

async function incrementWeeklySeedsEarned(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  userId: string,
  rewardSeeds: number,
  usernameCanonical: string | null = null
): Promise<void> {
  if (rewardSeeds <= 0) {
    return;
  }

  const currentWeekStart = await finalizeExpiredWeeklyLeaderboards(admin);
  const currentRow = await readLeaderboardStatsRow(admin, userId);
  const currentWeekSeeds = currentRow?.currentWeekStart === currentWeekStart ? currentRow.weeklySeedsEarned : 0;

  await admin
    .from('leaderboard_stats')
    .upsert(
      {
        user_id: userId,
        username_canonical: usernameCanonical ?? currentRow?.usernameCanonical ?? null,
        current_week_start: currentWeekStart,
        weekly_seeds_earned: currentWeekSeeds + rewardSeeds,
      },
      { onConflict: 'user_id' }
    );
}

export async function POST(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  }

  if (isValidateUsernameRequest(body)) {
    const validation = validateUsername(body.username);
    const available = validation.isValid
      ? await lookupUsernameAvailability(validation.normalizedUsername)
      : false;

    return NextResponse.json({
      action: body.action,
      isValid: validation.isValid,
      issues: validation.issues,
      normalizedUsername: validation.normalizedUsername,
      available,
    });
  }

  if (isRegisterAccountRequest(body)) {
    if (!hasSupabaseEnv()) {
      return configErrorResponse();
    }

    const username = body.username.trim();
    const email = body.email.trim().toLowerCase();
    const password = body.password;
    const validation = validateUsername(username);

    if (!validation.isValid) {
      return NextResponse.json(
        {
          error: 'invalid_username',
          issues: validation.issues,
        },
        { status: 400 }
      );
    }

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'invalid_email', message: 'Enter a valid email address.' }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'invalid_password', message: 'Choose a password with at least 8 characters.' }, { status: 400 });
    }

    const available = await lookupUsernameAvailability(validation.normalizedUsername);
    if (available === false) {
      return NextResponse.json({ error: 'username_unavailable' }, { status: 409 });
    }

    try {
      const admin = createSupabaseAdminClient();
      const currentWeekStart = await finalizeExpiredWeeklyLeaderboards(admin);
      const { data: createdUserResult, error: createUserError } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          requested_username: username,
        },
      });

      if (createUserError || !createdUserResult.user) {
        return NextResponse.json(
          {
            error: 'account_creation_failed',
            message: createUserError?.message ?? 'Unable to create the account.',
          },
          { status: 400 }
        );
      }

      const userId = createdUserResult.user.id;

      try {
        const { data: profile, error: profileError } = await admin
          .from('profiles')
          .upsert(
            {
              user_id: userId,
              username,
              username_canonical: validation.normalizedUsername,
              avatar_palette: 'finch',
            },
            { onConflict: 'user_id' }
          )
          .select('username, username_canonical, avatar_palette')
          .single();

        if (profileError || !profile) {
          throw new Error('Unable to save the username for this account.');
        }

        const { error: leaderboardError } = await admin
          .from('leaderboard_stats')
          .upsert(
            {
              user_id: userId,
              username_canonical: validation.normalizedUsername,
              current_week_start: currentWeekStart,
            },
            { onConflict: 'user_id' }
          );

        if (leaderboardError) {
          throw new Error('Unable to prepare the leaderboard profile for this account.');
        }

        return NextResponse.json({
          action: 'register-account',
          account: {
            email,
            username: profile.username,
            usernameCanonical: profile.username_canonical,
            avatarPalette: profile.avatar_palette,
          },
        });
      } catch (caughtError) {
        await admin.auth.admin.deleteUser(userId);
        return NextResponse.json(
          {
            error: 'account_creation_failed',
            message: caughtError instanceof Error ? caughtError.message : 'Unable to finish creating the account.',
          },
          { status: 500 }
        );
      }
    } catch {
      return NextResponse.json({ error: 'account_creation_failed', message: 'Unable to create the account.' }, { status: 500 });
    }
  }

  if (isGetAccountStateRequest(body)) {
    const context = await getAuthenticatedRequestContext();

    if (!context) {
      return hasSupabaseEnv()
        ? NextResponse.json({ error: 'not_authenticated' }, { status: 401 })
        : configErrorResponse();
    }

    try {
      const admin = createSupabaseAdminClient();
      const currentWeekStart = await finalizeExpiredWeeklyLeaderboards(admin);
      const [{ data: profile }, { data: progress }, { data: unlockedThemes }, leaderboardRow] = await Promise.all([
        admin
          .from('profiles')
          .select('username, username_canonical, avatar_palette')
          .eq('user_id', context.userId)
          .maybeSingle(),
        admin
          .from('player_progress')
          .select('last_local_sync_at, birds_identified, seeds, best_streak, best_daily_streak, best_weekly_placement, first_place_count, second_place_count, third_place_count')
          .eq('user_id', context.userId)
          .maybeSingle(),
        admin
          .from('unlocked_themes')
          .select('theme_name')
          .eq('user_id', context.userId),
        readLeaderboardStatsRow(admin, context.userId),
      ]);

      const placementSummary: WeeklyPlacementSummary = buildPlacementSummary({
        bestWeeklyPlacement: typeof progress?.best_weekly_placement === 'number' ? progress.best_weekly_placement : null,
        firstPlaceCount: typeof progress?.first_place_count === 'number' ? progress.first_place_count : 0,
        secondPlaceCount: typeof progress?.second_place_count === 'number' ? progress.second_place_count : 0,
        thirdPlaceCount: typeof progress?.third_place_count === 'number' ? progress.third_place_count : 0,
      });

      return NextResponse.json({
        action: 'get-account-state',
        email: context.email,
        profile: profile
          ? {
              username: profile.username,
              usernameCanonical: profile.username_canonical,
              avatarPalette: profile.avatar_palette,
            }
          : null,
        lastLocalSyncAt: progress?.last_local_sync_at ?? null,
        progressSummary: progress
          ? {
              birdsIdentified: progress.birds_identified ?? 0,
              seeds: progress.seeds ?? 0,
              bestStreak: progress.best_streak ?? 0,
              bestDailyStreak: progress.best_daily_streak ?? 0,
              bestWeeklyPlacement: placementSummary.bestWeeklyPlacement,
              firstPlaceCount: placementSummary.firstPlaceCount,
              secondPlaceCount: placementSummary.secondPlaceCount,
              thirdPlaceCount: placementSummary.thirdPlaceCount,
            }
          : null,
        unlockedThemes: (unlockedThemes ?? []).map((theme) => theme.theme_name),
        weeklyOverview: buildWeeklyOverview({
          currentWeekStart,
          row: leaderboardRow,
          placementSummary,
        }),
      });
    } catch {
      return NextResponse.json({ error: 'account_state_unavailable' }, { status: 500 });
    }
  }

  if (isGetLeaderboardRequest(body)) {
    if (!hasSupabaseEnv()) {
      return configErrorResponse();
    }

    try {
      const admin = createSupabaseAdminClient();
      const context = await getAuthenticatedRequestContext();
      const currentWeekStart = await finalizeExpiredWeeklyLeaderboards(admin);
      const challenge = getWeeklyChallengeForWeek(currentWeekStart);
      const { data: rows } = await admin
        .from('leaderboard_stats')
        .select([
          'user_id',
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
        .eq('current_week_start', currentWeekStart)
        .not('username_canonical', 'is', null);

      const ranked = rankWeeklyLeaderboardRows(
        (rows ?? []).map((row) => mapLeaderboardStatsRow(row as unknown as Record<string, unknown>)),
        challenge,
        context?.userId ?? null
      );
      const currentUserEntry = ranked.currentUserEntry;
      const avatarUserIds = Array.from(
        new Set(
          ranked.rankedRows
            .filter((row) => row.entry.rank <= 10 || row.userId === context?.userId)
            .map((row) => row.userId)
        )
      );
      const { data: avatarRows } = avatarUserIds.length > 0
        ? await admin
            .from('profiles')
            .select('user_id, avatar_palette')
            .in('user_id', avatarUserIds)
        : { data: [] };
      const avatarPaletteByUserId = new Map(
        (avatarRows ?? []).map((row) => [row.user_id as string, typeof row.avatar_palette === 'string' ? row.avatar_palette : null])
      );
      const topEntriesWithAvatars = ranked.rankedRows
        .filter((row) => row.entry.rank <= 10)
        .map((row) => ({
          ...row.entry,
          avatarPalette: avatarPaletteByUserId.get(row.userId) ?? null,
        }));
      const currentUserEntryWithAvatar = currentUserEntry
        ? {
            ...currentUserEntry,
            avatarPalette: avatarPaletteByUserId.get(context?.userId ?? '') ?? null,
          }
        : null;

      return NextResponse.json({
        action: 'get-leaderboard',
        leaderboard: {
          weekStart: currentWeekStart,
          endsAt: getWeekEndTimestamp(currentWeekStart),
          challenge,
          entries: topEntriesWithAvatars,
          currentUserEntry: currentUserEntryWithAvatar,
        },
      });
    } catch {
      return NextResponse.json({ error: 'leaderboard_unavailable' }, { status: 500 });
    }
  }

  if (isResolveSignInIdentifierRequest(body)) {
    if (!hasSupabaseEnv()) {
      return configErrorResponse();
    }

    const identifier = body.identifier.trim();
    if (!identifier) {
      return NextResponse.json({ error: 'invalid_sign_in_identifier' }, { status: 400 });
    }

    if (identifier.includes('@')) {
      return NextResponse.json({
        action: 'resolve-sign-in-identifier',
        email: identifier.toLowerCase(),
      });
    }

    const validation = validateUsername(identifier);
    if (!validation.isValid) {
      return NextResponse.json({ error: 'invalid_sign_in_identifier' }, { status: 400 });
    }

    try {
      const admin = createSupabaseAdminClient();
      const { data: profile } = await admin
        .from('profiles')
        .select('user_id')
        .eq('username_canonical', validation.normalizedUsername)
        .maybeSingle();

      if (!profile?.user_id) {
        return NextResponse.json({ error: 'sign_in_identifier_not_found' }, { status: 404 });
      }

      const { data: userResult, error } = await admin.auth.admin.getUserById(profile.user_id);
      if (error || !userResult.user?.email) {
        return NextResponse.json({ error: 'sign_in_identifier_not_found' }, { status: 404 });
      }

      return NextResponse.json({
        action: 'resolve-sign-in-identifier',
        email: userResult.user.email,
      });
    } catch {
      return NextResponse.json({ error: 'sign_in_identifier_not_found' }, { status: 404 });
    }
  }

  if (isPurchaseThemeRequest(body)) {
    const context = await getAuthenticatedRequestContext();

    if (!context) {
      return hasSupabaseEnv()
        ? NextResponse.json({ error: 'not_authenticated' }, { status: 401 })
        : configErrorResponse();
    }

    const themeUnlock = getThemeUnlockByThemeName(body.themeName.trim());
    if (!themeUnlock || themeUnlock.comingSoon || themeUnlock.themeName === finch.name) {
      return NextResponse.json({ error: 'invalid_theme_purchase' }, { status: 400 });
    }

    try {
      const admin = createSupabaseAdminClient();
      const [{ data: progress }, { data: existingUnlock }] = await Promise.all([
        admin
          .from('player_progress')
          .select('birds_identified, seeds, best_streak, best_daily_streak')
          .eq('user_id', context.userId)
          .maybeSingle(),
        admin
          .from('unlocked_themes')
          .select('theme_name')
          .eq('user_id', context.userId)
          .eq('theme_name', themeUnlock.themeName)
          .maybeSingle(),
      ]);

      const birdsIdentified = progress?.birds_identified ?? 0;
      const seeds = progress?.seeds ?? 0;
      const alreadyUnlockedByMilestone = birdsIdentified >= themeUnlock.milestoneValue;

      if (!existingUnlock && !alreadyUnlockedByMilestone && seeds < themeUnlock.seedCost) {
        return NextResponse.json({ error: 'insufficient_seeds' }, { status: 409 });
      }

      if (!existingUnlock && !alreadyUnlockedByMilestone) {
        const { error: updateError } = await admin
          .from('player_progress')
          .update({
            seeds: seeds - themeUnlock.seedCost,
          })
          .eq('user_id', context.userId);

        if (updateError) {
          return NextResponse.json({ error: 'theme_purchase_failed' }, { status: 500 });
        }

        const { error: unlockError } = await admin
          .from('unlocked_themes')
          .upsert(
            {
              user_id: context.userId,
              theme_name: themeUnlock.themeName,
              unlocked_via: 'seed-purchase',
            },
            { onConflict: 'user_id,theme_name' }
          );

        if (unlockError) {
          return NextResponse.json({ error: 'theme_purchase_failed' }, { status: 500 });
        }
      }

      const [{ data: updatedProgress }, { data: unlockedThemes }] = await Promise.all([
        admin
          .from('player_progress')
          .select('birds_identified, seeds, best_streak, best_daily_streak')
          .eq('user_id', context.userId)
          .maybeSingle(),
        admin
          .from('unlocked_themes')
          .select('theme_name')
          .eq('user_id', context.userId),
      ]);

      return NextResponse.json({
        action: 'purchase-theme',
        unlockedThemes: (unlockedThemes ?? []).map((theme) => theme.theme_name),
        progressSummary: {
          birdsIdentified: updatedProgress?.birds_identified ?? birdsIdentified,
          seeds: updatedProgress?.seeds ?? seeds,
          bestStreak: updatedProgress?.best_streak ?? 0,
          bestDailyStreak: updatedProgress?.best_daily_streak ?? 0,
        },
        purchaseApplied: !existingUnlock && !alreadyUnlockedByMilestone,
      });
    } catch {
      return NextResponse.json({ error: 'theme_purchase_failed' }, { status: 500 });
    }
  }

  if (isApplyProgressEventsRequest(body)) {
    const context = await getAuthenticatedRequestContext();

    if (!context) {
      return hasSupabaseEnv()
        ? NextResponse.json({ error: 'not_authenticated' }, { status: 401 })
        : configErrorResponse();
    }

    try {
      const admin = createSupabaseAdminClient();
      const currentWeekStart = await finalizeExpiredWeeklyLeaderboards(admin);
      const eventIds = body.events.map((event) => event.eventId);
      const [{ data: progress }, { data: unlockedThemes }, { data: dailyHistory }, { data: milestoneRows }, { data: seenEvents }, leaderboardRow] = await Promise.all([
        admin
          .from('player_progress')
          .select('birds_seen, birds_identified, current_streak, best_streak, current_daily_streak, best_daily_streak, seeds, streak_insurance_active, streak_insurance_purchased_at')
          .eq('user_id', context.userId)
          .maybeSingle(),
        admin
          .from('unlocked_themes')
          .select('theme_name')
          .eq('user_id', context.userId),
        admin
          .from('daily_challenge_history')
          .select('challenge_date, correct_answers, rounds_played, completed')
          .eq('user_id', context.userId)
          .order('challenge_date', { ascending: false }),
        admin
          .from('milestones')
          .select('milestone_value')
          .eq('user_id', context.userId)
          .order('milestone_value', { ascending: true }),
        admin
          .from('progress_event_log')
          .select('event_id')
          .eq('user_id', context.userId)
          .in('event_id', eventIds),
        readLeaderboardStatsRow(admin, context.userId),
      ]);

      const seenEventIds = new Set((seenEvents ?? []).map((event) => event.event_id as string));
      const pendingEvents = body.events.filter((event) => !seenEventIds.has(event.eventId));
      const ignoredEventIds = body.events.filter((event) => seenEventIds.has(event.eventId)).map((event) => event.eventId);
      const clearServerStreakInsurance = shouldClearServerStreakInsurance(
        Boolean(progress?.streak_insurance_active),
        pendingEvents
      );

      const nextSnapshot = reduceProgressEvents(
        createProgressSnapshot({
          score: normalizeBirdScore({
            birdsSeen: progress?.birds_seen ?? 0,
            birdsIdentified: progress?.birds_identified ?? 0,
            currentStreak: progress?.current_streak ?? 0,
            bestStreak: progress?.best_streak ?? 0,
            currentDailyStreak: progress?.current_daily_streak ?? 0,
            bestDailyStreak: progress?.best_daily_streak ?? 0,
            seeds: progress?.seeds ?? 0,
          }),
          unlockedThemes: (unlockedThemes ?? []).map((theme) => theme.theme_name),
          dailyChallengeHistory: (dailyHistory ?? []).map((entry) => ({
            date: entry.challenge_date,
            correctAnswers: entry.correct_answers,
            roundsPlayed: entry.rounds_played,
            completed: entry.completed,
          })),
          milestoneValues: (milestoneRows ?? []).map((row) => row.milestone_value),
        }),
        pendingEvents
      );
      const weeklyStatsUpdate = createWeeklyStatsUpdate({
        currentWeekStart,
        existingRow: leaderboardRow,
        pendingEvents,
      });

      const milestoneBadgeMap = new Map(milestones.map((milestone) => [milestone.value, milestone.badge]));

      await Promise.all([
        admin
          .from('player_progress')
          .upsert(
            {
              user_id: context.userId,
              birds_seen: nextSnapshot.score.birdsSeen,
              birds_identified: nextSnapshot.score.birdsIdentified,
              current_streak: nextSnapshot.score.currentStreak,
              best_streak: nextSnapshot.score.bestStreak,
              current_daily_streak: nextSnapshot.score.currentDailyStreak,
              best_daily_streak: nextSnapshot.score.bestDailyStreak,
              seeds: nextSnapshot.score.seeds,
              streak_insurance_active: clearServerStreakInsurance
                ? false
                : Boolean(progress?.streak_insurance_active),
              streak_insurance_purchased_at: clearServerStreakInsurance
                ? null
                : progress?.streak_insurance_purchased_at ?? null,
            },
            { onConflict: 'user_id' }
          ),
        nextSnapshot.unlockedThemes.length > 0
          ? admin
              .from('unlocked_themes')
              .upsert(
                nextSnapshot.unlockedThemes.map((themeName) => ({
                  user_id: context.userId,
                  theme_name: themeName,
                  unlocked_via: 'progress-event',
                })),
                { onConflict: 'user_id,theme_name' }
              )
          : Promise.resolve(),
        nextSnapshot.milestoneValues.length > 0
          ? admin
              .from('milestones')
              .upsert(
                nextSnapshot.milestoneValues.map((value) => ({
                  user_id: context.userId,
                  milestone_value: value,
                  badge_name: milestoneBadgeMap.get(value) ?? null,
                })),
                { onConflict: 'user_id,milestone_value' }
              )
          : Promise.resolve(),
        nextSnapshot.dailyChallengeHistory.length > 0
          ? admin
              .from('daily_challenge_history')
              .upsert(
                nextSnapshot.dailyChallengeHistory.map((entry) => ({
                  user_id: context.userId,
                  challenge_date: entry.date,
                  correct_answers: entry.correctAnswers,
                  rounds_played: entry.roundsPlayed,
                  completed: entry.completed,
                })),
                { onConflict: 'user_id,challenge_date' }
              )
          : Promise.resolve(),
        pendingEvents.length > 0
          ? admin
              .from('progress_event_log')
              .insert(
                pendingEvents.map((event) => ({
                  user_id: context.userId,
                  event_id: event.eventId,
                  event_type: event.eventType,
                  occurred_at: event.occurredAt,
                }))
              )
          : Promise.resolve(),
        admin
          .from('leaderboard_stats')
          .upsert(
            {
              user_id: context.userId,
              username_canonical: leaderboardRow?.usernameCanonical ?? null,
              birds_identified: nextSnapshot.score.birdsIdentified,
              best_streak: nextSnapshot.score.bestStreak,
              best_daily_streak: nextSnapshot.score.bestDailyStreak,
              accuracy: calculateAccuracy(nextSnapshot.score.birdsSeen, nextSnapshot.score.birdsIdentified),
              seeds: nextSnapshot.score.seeds,
              ...weeklyStatsUpdate,
            },
            { onConflict: 'user_id' }
          ),
      ]);

      return NextResponse.json({
        action: 'apply-progress-events',
        appliedEventIds: pendingEvents.map((event) => event.eventId),
        ignoredEventIds,
        snapshot: {
          score: nextSnapshot.score,
          unlockedThemes: nextSnapshot.unlockedThemes,
          dailyChallengeHistory: nextSnapshot.dailyChallengeHistory,
          milestones: nextSnapshot.milestoneValues,
        },
      });
    } catch {
      return NextResponse.json({ error: 'progress_event_sync_failed' }, { status: 500 });
    }
  }

  if (isPurchaseStreakInsuranceRequest(body)) {
    const context = await getAuthenticatedRequestContext();
    if (!context) {
      return hasSupabaseEnv()
        ? NextResponse.json({ error: 'not_authenticated' }, { status: 401 })
        : configErrorResponse();
    }

    try {
      const admin = createSupabaseAdminClient();
      const { data: progress } = await admin
        .from('player_progress')
        .select('current_streak, seeds, streak_insurance_active, streak_insurance_purchased_at')
        .eq('user_id', context.userId)
        .maybeSingle();

      const currentStreak = progress?.current_streak ?? 0;
      const seeds = progress?.seeds ?? 0;
      const insuranceCost = currentStreak >= 75
        ? 55
        : currentStreak >= 50
          ? 42
          : currentStreak >= 35
            ? 32
            : currentStreak >= 25
              ? 24
              : currentStreak >= 15
                ? 18
                : currentStreak >= 10
                  ? 14
                  : 10;

      if (progress?.streak_insurance_active) {
        return NextResponse.json({
          error: 'insurance_already_active',
          message: 'Streak insurance is already armed for your next guess.',
        }, { status: 409 });
      }

      if (currentStreak < 5) {
        return NextResponse.json({
          error: 'insurance_streak_too_low',
          message: 'Build a 5-bird streak before buying streak insurance.',
        }, { status: 409 });
      }

      if (seeds < insuranceCost) {
        return NextResponse.json({
          error: 'insufficient_seeds',
          message: `You need ${insuranceCost} seeds for streak insurance.`,
        }, { status: 409 });
      }

      await admin
        .from('player_progress')
        .update({
          seeds: seeds - insuranceCost,
          streak_insurance_active: true,
          streak_insurance_purchased_at: new Date().toISOString(),
        })
        .eq('user_id', context.userId);

      const progressSummary = await readProgressSummary(admin, context.userId);

      return NextResponse.json({
        action: 'purchase-streak-insurance',
        progressSummary,
        insuranceState: {
          active: true,
          protectedMissesRemaining: 1,
          cost: insuranceCost,
          purchasedAtStreak: currentStreak,
        },
      });
    } catch {
      return NextResponse.json({ error: 'insurance_purchase_failed' }, { status: 500 });
    }
  }

  if (isClaimDailyChallengeBonusesRequest(body)) {
    const context = await getAuthenticatedRequestContext();
    if (!context) {
      return hasSupabaseEnv()
        ? NextResponse.json({ error: 'not_authenticated' }, { status: 401 })
        : configErrorResponse();
    }

    try {
      const admin = createSupabaseAdminClient();
      await finalizeExpiredWeeklyLeaderboards(admin);
      const eventId = `daily-reward:${body.date}`;
      const alreadyRecorded = await eventAlreadyRecorded(admin, context.userId, eventId);

      if (!alreadyRecorded) {
        const progressSummary = await readProgressSummary(admin, context.userId);
        await admin
          .from('player_progress')
          .update({
            seeds: progressSummary.seeds + body.rewardSeeds,
          })
          .eq('user_id', context.userId);

        await admin
          .from('daily_challenge_history')
          .upsert(
            {
              user_id: context.userId,
              challenge_date: body.date,
              correct_answers: body.correctAnswers,
              rounds_played: body.roundsPlayed,
              completed: true,
              bonus_seeds_awarded: body.rewardSeeds,
              claimed_at: new Date().toISOString(),
            },
            { onConflict: 'user_id,challenge_date' }
          );

        await recordProgressEvent(admin, context.userId, eventId, 'claim-daily-challenge-bonuses');
        await incrementWeeklySeedsEarned(admin, context.userId, body.rewardSeeds);
      }

      return NextResponse.json({
        action: 'claim-daily-challenge-bonuses',
        date: body.date,
        rewardSeeds: body.rewardSeeds,
        progressSummary: await readProgressSummary(admin, context.userId),
      });
    } catch {
      return NextResponse.json({ error: 'daily_reward_claim_failed' }, { status: 500 });
    }
  }

  if (isClaimMissionRewardRequest(body)) {
    const context = await getAuthenticatedRequestContext();
    if (!context) {
      return hasSupabaseEnv()
        ? NextResponse.json({ error: 'not_authenticated' }, { status: 401 })
        : configErrorResponse();
    }

    try {
      const admin = createSupabaseAdminClient();
      await finalizeExpiredWeeklyLeaderboards(admin);
      const alreadyRecorded = await eventAlreadyRecorded(admin, context.userId, body.claimId);

      if (!alreadyRecorded) {
        const progressSummary = await readProgressSummary(admin, context.userId);
        await admin
          .from('player_progress')
          .update({
            seeds: progressSummary.seeds + body.rewardSeeds,
          })
          .eq('user_id', context.userId);

        await recordProgressEvent(admin, context.userId, body.claimId, body.action);
        await incrementWeeklySeedsEarned(admin, context.userId, body.rewardSeeds);
      }

      return NextResponse.json({
        action: body.action,
        claimId: body.claimId,
        rewardSeeds: body.rewardSeeds,
        progressSummary: await readProgressSummary(admin, context.userId),
      });
    } catch {
      return NextResponse.json({ error: 'mission_reward_claim_failed' }, { status: 500 });
    }
  }

  if (isPullAccountProgressRequest(body)) {
    const context = await getAuthenticatedRequestContext();

    if (!context) {
      return hasSupabaseEnv()
        ? NextResponse.json({ error: 'not_authenticated' }, { status: 401 })
        : configErrorResponse();
    }

    try {
      const admin = createSupabaseAdminClient();
      await finalizeExpiredWeeklyLeaderboards(admin);
      const today = getTodayChallengeDate();
      const missionDate = body.missionDate;
      const todayMissionIds = getDailyMissionIdsForDate(missionDate);
      const todayMissionClaimIds = todayMissionIds.map((missionId) => `${missionDate}:${missionId}`);
      const [{ data: progress }, { data: themes }, { data: dailyHistory }, { data: dailyMissionHistory }, { data: milestoneRows }, { data: todayMissionEvents }, { data: journalRows }] = await Promise.all([
        admin
          .from('player_progress')
          .select('birds_seen, birds_identified, current_streak, best_streak, current_daily_streak, best_daily_streak, seeds, last_local_sync_at')
          .eq('user_id', context.userId)
          .maybeSingle(),
        admin
          .from('unlocked_themes')
          .select('theme_name')
          .eq('user_id', context.userId),
        admin
          .from('daily_challenge_history')
          .select('challenge_date, correct_answers, rounds_played, completed, bonus_seeds_awarded, claimed_at')
          .eq('user_id', context.userId)
          .order('challenge_date', { ascending: false }),
        admin
          .from('daily_mission_history')
          .select('mission_date')
          .eq('user_id', context.userId)
          .order('mission_date', { ascending: false }),
        admin
          .from('milestones')
          .select('milestone_value')
          .eq('user_id', context.userId)
          .order('milestone_value', { ascending: true }),
        admin
          .from('progress_event_log')
          .select('event_id')
          .eq('user_id', context.userId)
          .in('event_id', [...todayMissionClaimIds, `${missionDate}:mission-set-bonus`]),
        admin
          .from('bird_journal')
          .select('bird_key, bird_name, is_real, seen_count, correct_count, incorrect_count, last_seen_at, metadata')
          .eq('user_id', context.userId)
          .order('last_seen_at', { ascending: false })
          .limit(BIRD_JOURNAL_PULL_LIMIT),
      ]);

      const todayDailyChallenge = (dailyHistory ?? []).find((entry) => entry.challenge_date === today) ?? null;
      const todayEventIds = new Set((todayMissionEvents ?? []).map((event) => event.event_id as string));

      return NextResponse.json({
        action: 'pull-account-progress',
        progress: {
          score: normalizeBirdScore({
            birdsSeen: progress?.birds_seen ?? 0,
            birdsIdentified: progress?.birds_identified ?? 0,
            currentStreak: progress?.current_streak ?? 0,
            bestStreak: progress?.best_streak ?? 0,
            currentDailyStreak: progress?.current_daily_streak ?? 0,
            bestDailyStreak: progress?.best_daily_streak ?? 0,
            seeds: progress?.seeds ?? 0,
          }),
          unlockedThemes: (themes ?? []).map((theme) => theme.theme_name),
          dailyChallengeHistory: (dailyHistory ?? []).map((entry) => ({
            date: entry.challenge_date,
            correctAnswers: entry.correct_answers,
            roundsPlayed: entry.rounds_played,
            completed: entry.completed,
          })),
          dailyMissionHistory: (dailyMissionHistory ?? []).map((entry) => ({
            date: entry.mission_date,
          })),
          milestones: (milestoneRows ?? []).map((row) => row.milestone_value),
          journalEntries: (journalRows ?? []).map((entry) => ({
            birdKey: entry.bird_key,
            birdName: entry.bird_name,
            isReal: entry.is_real,
            seenCount: entry.seen_count,
            correctCount: entry.correct_count,
            incorrectCount: entry.incorrect_count,
            lastSeenAt: entry.last_seen_at,
            metadata: normalizeBirdJournalMetadata(entry.metadata as BirdJournalMetadata),
          })),
        },
        lastLocalSyncAt: progress?.last_local_sync_at ?? null,
        todayDailyChallenge: todayDailyChallenge
          ? {
              date: todayDailyChallenge.challenge_date,
              roundsPlayed: todayDailyChallenge.rounds_played,
              correctAnswers: todayDailyChallenge.correct_answers,
              bonusSeedsAwarded: (todayDailyChallenge.bonus_seeds_awarded ?? 0) > 0
                ? (todayDailyChallenge.bonus_seeds_awarded ?? 0)
                : todayDailyChallenge.completed
                  ? DAILY_CHALLENGE_CONFIG.completionBonusSeeds
                    + (todayDailyChallenge.correct_answers === DAILY_CHALLENGE_CONFIG.roundCount
                      ? DAILY_CHALLENGE_CONFIG.perfectBonusSeeds
                      : 0)
                  : 0,
              claimed: Boolean(todayDailyChallenge.claimed_at),
            }
          : null,
        todayMissionClaims: {
          date: missionDate,
          claimedMissionIds: todayMissionIds.filter((missionId) => todayEventIds.has(`${missionDate}:${missionId}`)),
          bonusClaimed: todayEventIds.has(`${missionDate}:mission-set-bonus`),
        },
      });
    } catch {
      return NextResponse.json({ error: 'pull_progress_failed' }, { status: 500 });
    }
  }

  if (isSaveAvatarPaletteRequest(body)) {
    const context = await getAuthenticatedRequestContext();

    if (!context) {
      return hasSupabaseEnv()
        ? NextResponse.json({ error: 'not_authenticated' }, { status: 401 })
        : configErrorResponse();
    }

    try {
      const admin = createSupabaseAdminClient();
      const avatarPalette = body.avatarPalette.trim();

      await admin
        .from('profiles')
        .upsert(
          {
            user_id: context.userId,
            avatar_palette: avatarPalette,
          },
          { onConflict: 'user_id' }
        );

      return NextResponse.json({
        action: 'save-avatar-palette',
        avatarPalette,
      });
    } catch {
      return NextResponse.json({ error: 'avatar_palette_save_failed' }, { status: 500 });
    }
  }

  if (isSyncDailyMissionCompletionRequest(body)) {
    const context = await getAuthenticatedRequestContext();

    if (!context) {
      return hasSupabaseEnv()
        ? NextResponse.json({ error: 'not_authenticated' }, { status: 401 })
        : configErrorResponse();
    }

    try {
      const admin = createSupabaseAdminClient();
      await admin
        .from('daily_mission_history')
        .upsert(
          {
            user_id: context.userId,
            mission_date: body.date,
            completed_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,mission_date' }
        );

      const [{ data: dailyMissionHistory }, { data: progress }] = await Promise.all([
        admin
          .from('daily_mission_history')
          .select('mission_date')
          .eq('user_id', context.userId)
          .order('mission_date', { ascending: false }),
        admin
          .from('player_progress')
          .select('best_daily_streak')
          .eq('user_id', context.userId)
          .maybeSingle(),
      ]);

      const missionStreaks = getDailyMissionStreaks((dailyMissionHistory ?? []).map((entry) => ({
        date: entry.mission_date,
      })));

      await admin
        .from('player_progress')
        .upsert(
          {
            user_id: context.userId,
            current_daily_streak: missionStreaks.currentStreak,
            best_daily_streak: Math.max(progress?.best_daily_streak ?? 0, missionStreaks.bestStreak),
          },
          { onConflict: 'user_id' }
        );

      return NextResponse.json({
        action: 'sync-daily-mission-completion',
        date: body.date,
        progressSummary: await readProgressSummary(admin, context.userId),
      });
    } catch {
      return NextResponse.json({ error: 'daily_mission_completion_sync_failed' }, { status: 500 });
    }
  }

  if (isSyncBirdJournalRequest(body)) {
    const context = await getAuthenticatedRequestContext();

    if (!context) {
      return hasSupabaseEnv()
        ? NextResponse.json({ error: 'not_authenticated' }, { status: 401 })
        : configErrorResponse();
    }

    try {
      const admin = createSupabaseAdminClient();
      const journalEntries = normalizeBirdJournalEntries(body.journalEntries);
      const syncedAt = new Date().toISOString();
      const journalResult = await upsertBirdJournalEntries({
        admin,
        userId: context.userId,
        journalEntries,
      });

      if (!journalResult.ok) {
        return NextResponse.json({ error: 'progress_sync_failed' }, { status: 500 });
      }

      await admin
        .from('player_progress')
        .upsert(
          {
            user_id: context.userId,
            last_local_sync_at: syncedAt,
          },
          { onConflict: 'user_id' }
        );

      return NextResponse.json({
        action: 'sync-bird-journal',
        syncedAt,
        journalCount: journalEntries.length,
      });
    } catch {
      return NextResponse.json({ error: 'progress_sync_failed' }, { status: 500 });
    }
  }

  if (isSaveProfileRequest(body)) {
    const context = await getAuthenticatedRequestContext();

    if (!context) {
      return hasSupabaseEnv()
        ? NextResponse.json({ error: 'not_authenticated' }, { status: 401 })
        : configErrorResponse();
    }

    const validation = validateUsername(body.username);
    if (!validation.isValid) {
      return NextResponse.json(
        {
          error: 'invalid_username',
          issues: validation.issues,
        },
        { status: 400 }
      );
    }

    const available = await lookupUsernameAvailability(validation.normalizedUsername, context.userId);
    if (available === false) {
      return NextResponse.json({ error: 'username_unavailable' }, { status: 409 });
    }

    try {
      const admin = createSupabaseAdminClient();
      const currentWeekStart = await finalizeExpiredWeeklyLeaderboards(admin);
      const avatarPalette = body.avatarPalette?.trim() || 'finch';
      const { data: profile, error } = await admin
        .from('profiles')
        .upsert(
          {
            user_id: context.userId,
            username: body.username.trim(),
            username_canonical: validation.normalizedUsername,
            avatar_palette: avatarPalette,
          },
          { onConflict: 'user_id' }
        )
        .select('username, username_canonical, avatar_palette')
        .single();

      if (error || !profile) {
        return NextResponse.json({ error: 'profile_save_failed' }, { status: 500 });
      }

      await admin
        .from('leaderboard_stats')
        .upsert(
          {
            user_id: context.userId,
            username_canonical: validation.normalizedUsername,
            current_week_start: currentWeekStart,
          },
          { onConflict: 'user_id' }
        );

      return NextResponse.json({
        action: 'save-profile',
        profile: {
          username: profile.username,
          usernameCanonical: profile.username_canonical,
          avatarPalette: profile.avatar_palette,
        },
      });
    } catch {
      return NextResponse.json({ error: 'profile_save_failed' }, { status: 500 });
    }
  }

  if (isSyncLocalProgressRequest(body)) {
    const context = await getAuthenticatedRequestContext();

    if (!context) {
      return hasSupabaseEnv()
        ? NextResponse.json({ error: 'not_authenticated' }, { status: 401 })
        : configErrorResponse();
    }

    try {
      const admin = createSupabaseAdminClient();
      const currentWeekStart = await finalizeExpiredWeeklyLeaderboards(admin);
      const normalizedScore = normalizeBirdScore(body.progress.score);
      const themeNames = normalizeThemeNames(body.progress.unlockedThemes);
      const dailyHistory = normalizeDailyHistory(body.progress.dailyChallengeHistory);
      const dailyMissionHistory = normalizeDailyMissionHistory(body.progress.dailyMissionHistory ?? []);
      const milestoneValues = normalizeMilestoneValues(body.progress.milestones);
      const journalEntries = normalizeBirdJournalEntries(body.progress.journalEntries);
      const syncedAt = new Date().toISOString();
      const accuracy = normalizedScore.birdsSeen > 0
        ? Number(((normalizedScore.birdsIdentified / normalizedScore.birdsSeen) * 100).toFixed(2))
        : 0;

      const { data: profile } = await admin
        .from('profiles')
        .select('username_canonical')
        .eq('user_id', context.userId)
        .maybeSingle();

      const { error: progressError } = await admin
        .from('player_progress')
        .upsert(
          {
            user_id: context.userId,
            birds_seen: normalizedScore.birdsSeen,
            birds_identified: normalizedScore.birdsIdentified,
            current_streak: normalizedScore.currentStreak,
            best_streak: normalizedScore.bestStreak,
            current_daily_streak: normalizedScore.currentDailyStreak,
            best_daily_streak: normalizedScore.bestDailyStreak,
            seeds: normalizedScore.seeds,
            last_local_sync_at: syncedAt,
          },
          { onConflict: 'user_id' }
        );

      if (progressError) {
        return NextResponse.json({ error: 'progress_sync_failed' }, { status: 500 });
      }

      if (themeNames.length > 0) {
        const { error: themeError } = await admin
          .from('unlocked_themes')
          .upsert(
            themeNames.map((themeName) => ({
              user_id: context.userId,
              theme_name: themeName,
              unlocked_via: 'local-sync',
            })),
            { onConflict: 'user_id,theme_name' }
          );

        if (themeError) {
          return NextResponse.json({ error: 'progress_sync_failed' }, { status: 500 });
        }
      }

      if (dailyHistory.length > 0) {
        const { error: dailyError } = await admin
          .from('daily_challenge_history')
          .upsert(
            dailyHistory.map((entry) => ({
              user_id: context.userId,
              challenge_date: entry.date,
              correct_answers: entry.correctAnswers,
              rounds_played: entry.roundsPlayed,
              completed: entry.completed,
            })),
            { onConflict: 'user_id,challenge_date' }
          );

        if (dailyError) {
          return NextResponse.json({ error: 'progress_sync_failed' }, { status: 500 });
        }
      }

      if (dailyMissionHistory.length > 0) {
        const { error: dailyMissionError } = await admin
          .from('daily_mission_history')
          .upsert(
            dailyMissionHistory.map((entry) => ({
              user_id: context.userId,
              mission_date: entry.date,
              completed_at: syncedAt,
            })),
            { onConflict: 'user_id,mission_date' }
          );

        if (dailyMissionError) {
          return NextResponse.json({ error: 'progress_sync_failed' }, { status: 500 });
        }
      }

      if (milestoneValues.length > 0) {
        const milestoneBadgeMap = new Map(milestones.map((milestone) => [milestone.value, milestone.badge]));
        const { error: milestoneError } = await admin
          .from('milestones')
          .upsert(
            milestoneValues.map((value) => ({
              user_id: context.userId,
              milestone_value: value,
              badge_name: milestoneBadgeMap.get(value) ?? null,
            })),
            { onConflict: 'user_id,milestone_value' }
          );

        if (milestoneError) {
          return NextResponse.json({ error: 'progress_sync_failed' }, { status: 500 });
        }
      }

      if (journalEntries.length > 0) {
        const journalResult = await upsertBirdJournalEntries({
          admin,
          userId: context.userId,
          journalEntries,
        });

        if (!journalResult.ok) {
          return NextResponse.json({ error: 'progress_sync_failed' }, { status: 500 });
        }
      }

      await admin
        .from('leaderboard_stats')
        .upsert(
          {
            user_id: context.userId,
            username_canonical: profile?.username_canonical ?? null,
            current_week_start: currentWeekStart,
            birds_identified: normalizedScore.birdsIdentified,
            best_streak: normalizedScore.bestStreak,
            best_daily_streak: normalizedScore.bestDailyStreak,
            accuracy,
            seeds: normalizedScore.seeds,
          },
          { onConflict: 'user_id' }
        );

      return NextResponse.json({
        action: 'sync-local-progress',
        syncedAt,
        themeCount: themeNames.length,
        dailyHistoryCount: dailyHistory.length,
        milestoneCount: milestoneValues.length,
        journalCount: journalEntries.length,
      });
    } catch {
      return NextResponse.json({ error: 'progress_sync_failed' }, { status: 500 });
    }
  }

  return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
}