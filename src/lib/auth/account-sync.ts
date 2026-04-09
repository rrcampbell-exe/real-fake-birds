import type {
  BirdJournalEntry,
  BirdScore,
  DailyChallengeHistoryEntry,
  DailyMissionHistoryEntry,
  WeeklyLeaderboardEntry,
  WeeklyOverview,
} from '@/types';
import type { ProgressEvent } from '@/lib/progress/progress-events';

export interface AccountStateResponse {
  action: 'get-account-state';
  email: string | null;
  profile: {
    username: string | null;
    usernameCanonical: string | null;
    avatarPalette: string | null;
  } | null;
  lastLocalSyncAt: string | null;
  progressSummary: {
    birdsIdentified: number;
    seeds: number;
    bestStreak: number;
    bestDailyStreak: number;
    bestWeeklyPlacement: number | null;
    firstPlaceCount: number;
    secondPlaceCount: number;
    thirdPlaceCount: number;
  } | null;
  unlockedThemes: string[];
  weeklyOverview: WeeklyOverview | null;
}

export interface GetLeaderboardResponse {
  action: 'get-leaderboard';
  leaderboard: {
    weekStart: string;
    endsAt: string;
    challenge: WeeklyOverview['challenge'];
    entries: WeeklyLeaderboardEntry[];
    currentUserEntry: WeeklyLeaderboardEntry | null;
  };
}

export interface SaveProfileResponse {
  action: 'save-profile';
  profile: {
    username: string;
    usernameCanonical: string;
    avatarPalette: string;
  };
}

export interface RegisterAccountResponse {
  action: 'register-account';
  account: {
    email: string;
    username: string;
    usernameCanonical: string;
    avatarPalette: string;
  };
}

export interface SyncLocalProgressResponse {
  action: 'sync-local-progress';
  syncedAt: string;
  themeCount: number;
  dailyHistoryCount: number;
  milestoneCount: number;
  journalCount: number;
}

export interface PullAccountProgressResponse {
  action: 'pull-account-progress';
  progress: LocalProgressPayload;
  lastLocalSyncAt: string | null;
  todayDailyChallenge: {
    date: string;
    roundsPlayed: number;
    correctAnswers: number;
    bonusSeedsAwarded: number;
    claimed: boolean;
  } | null;
  todayMissionClaims: {
    date: string;
    claimedMissionIds: string[];
    bonusClaimed: boolean;
  } | null;
}

export interface SaveAvatarPaletteResponse {
  action: 'save-avatar-palette';
  avatarPalette: string;
}

export interface PurchaseThemeResponse {
  action: 'purchase-theme';
  unlockedThemes: string[];
  progressSummary: {
    birdsIdentified: number;
    seeds: number;
    bestStreak: number;
    bestDailyStreak: number;
  };
  purchaseApplied: boolean;
}

export interface ApplyProgressEventsResponse {
  action: 'apply-progress-events';
  appliedEventIds: string[];
  ignoredEventIds: string[];
  snapshot: LocalProgressPayload;
}

export interface DirectProgressMutationResponse {
  progressSummary: {
    birdsSeen: number;
    birdsIdentified: number;
    seeds: number;
    currentStreak: number;
    bestStreak: number;
    currentDailyStreak: number;
    bestDailyStreak: number;
  };
}

export interface PurchaseStreakInsuranceResponse extends DirectProgressMutationResponse {
  action: 'purchase-streak-insurance';
  insuranceState: {
    active: boolean;
    protectedMissesRemaining: number;
    cost: number;
    purchasedAtStreak: number;
  };
}

export interface ClaimDailyRewardResponse extends DirectProgressMutationResponse {
  action: 'claim-daily-challenge-bonuses';
  date: string;
  rewardSeeds: number;
}

export interface ClaimMissionRewardResponse extends DirectProgressMutationResponse {
  action: 'claim-mission-reward' | 'claim-mission-set-bonus';
  claimId: string;
  rewardSeeds: number;
}

export interface SyncDailyMissionCompletionResponse extends DirectProgressMutationResponse {
  action: 'sync-daily-mission-completion';
  date: string;
}

export interface ResolveSignInIdentifierResponse {
  action: 'resolve-sign-in-identifier';
  email: string;
}

export interface LocalProgressPayload {
  score: BirdScore;
  unlockedThemes: string[];
  dailyChallengeHistory: DailyChallengeHistoryEntry[];
  dailyMissionHistory: DailyMissionHistoryEntry[];
  milestones: number[];
  journalEntries: BirdJournalEntry[];
}

async function postAuthAction<T>(body: object, signal?: AbortSignal): Promise<T> {
  const response = await fetch('/api/auth', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok) {
    let message = 'Unable to complete account action.';

    try {
      const payload = await response.json() as { error?: string; message?: string; issues?: string[] };
      if (payload.message) {
        message = payload.message;
      } else if (payload.error === 'username_unavailable') {
        message = 'That username is no longer available.';
      } else if (payload.error === 'invalid_username') {
        message = payload.issues?.length
          ? `Username issue: ${payload.issues.join(', ')}`
          : 'That username is invalid.';
      } else if (payload.error === 'not_authenticated') {
        message = 'Sign in first to manage account sync.';
      } else if (payload.error === 'invalid_email') {
        message = 'Enter a valid email address.';
      } else if (payload.error === 'invalid_password') {
        message = 'Choose a password with at least 8 characters.';
      } else if (payload.error === 'account_creation_failed') {
        message = payload.message ?? 'Unable to create the account.';
      } else if (payload.error === 'insurance_already_active') {
        message = payload.message ?? 'Streak insurance is already armed for your next guess.';
      } else if (payload.error === 'insurance_streak_too_low') {
        message = payload.message ?? 'Build a 5-bird streak before buying streak insurance.';
      } else if (payload.error === 'insufficient_seeds') {
        message = payload.message ?? 'You do not have enough seeds for streak insurance.';
      } else if (payload.error === 'insurance_purchase_failed') {
        message = 'Unable to buy streak insurance right now.';
      }
    } catch {
      // Fall back to the generic message.
    }

    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

export function fetchAccountState(signal?: AbortSignal): Promise<AccountStateResponse> {
  return postAuthAction<AccountStateResponse>({ action: 'get-account-state' }, signal);
}

export function registerAccount(options: {
  username: string;
  email: string;
  password: string;
}): Promise<RegisterAccountResponse> {
  return postAuthAction<RegisterAccountResponse>({
    action: 'register-account',
    ...options,
  });
}

export function fetchWeeklyLeaderboard(signal?: AbortSignal): Promise<GetLeaderboardResponse> {
  return postAuthAction<GetLeaderboardResponse>({ action: 'get-leaderboard' }, signal);
}

export function resolveSignInIdentifier(identifier: string): Promise<ResolveSignInIdentifierResponse> {
  return postAuthAction<ResolveSignInIdentifierResponse>({
    action: 'resolve-sign-in-identifier',
    identifier,
  });
}

export function saveProfile(username: string, avatarPalette = 'finch'): Promise<SaveProfileResponse> {
  return postAuthAction<SaveProfileResponse>({
    action: 'save-profile',
    username,
    avatarPalette,
  });
}

export function saveAvatarPalette(avatarPalette: string): Promise<SaveAvatarPaletteResponse> {
  return postAuthAction<SaveAvatarPaletteResponse>({
    action: 'save-avatar-palette',
    avatarPalette,
  });
}

export function syncLocalProgress(progress: LocalProgressPayload): Promise<SyncLocalProgressResponse> {
  return postAuthAction<SyncLocalProgressResponse>({
    action: 'sync-local-progress',
    progress,
  });
}

export function syncDailyMissionCompletion(date: string): Promise<SyncDailyMissionCompletionResponse> {
  return postAuthAction<SyncDailyMissionCompletionResponse>({
    action: 'sync-daily-mission-completion',
    date,
  });
}

export function pullAccountProgress(missionDate: string): Promise<PullAccountProgressResponse> {
  return postAuthAction<PullAccountProgressResponse>({
    action: 'pull-account-progress',
    missionDate,
  });
}

export function purchaseTheme(themeName: string): Promise<PurchaseThemeResponse> {
  return postAuthAction<PurchaseThemeResponse>({
    action: 'purchase-theme',
    themeName,
  });
}

export function applyProgressEvents(events: ProgressEvent[]): Promise<ApplyProgressEventsResponse> {
  return postAuthAction<ApplyProgressEventsResponse>({
    action: 'apply-progress-events',
    events,
  });
}

export function purchaseStreakInsuranceDirect(): Promise<PurchaseStreakInsuranceResponse> {
  return postAuthAction<PurchaseStreakInsuranceResponse>({
    action: 'purchase-streak-insurance',
  });
}

export function claimDailyChallengeBonusesDirect(options: {
  date: string;
  rewardSeeds: number;
  correctAnswers: number;
  roundsPlayed: number;
}): Promise<ClaimDailyRewardResponse> {
  return postAuthAction<ClaimDailyRewardResponse>({
    action: 'claim-daily-challenge-bonuses',
    ...options,
  });
}

export function claimMissionRewardDirect(options: {
  claimId: string;
  rewardSeeds: number;
}): Promise<ClaimMissionRewardResponse> {
  return postAuthAction<ClaimMissionRewardResponse>({
    action: 'claim-mission-reward',
    ...options,
  });
}

export function claimMissionSetBonusDirect(options: {
  claimId: string;
  rewardSeeds: number;
}): Promise<ClaimMissionRewardResponse> {
  return postAuthAction<ClaimMissionRewardResponse>({
    action: 'claim-mission-set-bonus',
    ...options,
  });
}