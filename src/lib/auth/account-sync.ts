import type {
  BirdhouseStore,
  BirdJournalEntry,
  BirdScore,
  DailyMissionHistoryEntry,
  WeeklyLeaderboardEntry,
  WeeklyOverview,
} from '@/types';
import { apiFetch } from '@/lib/api/client';
import type { ProgressEvent } from '@/lib/progress/progress-events';
import { AccountActionError } from '@/lib/auth/error';

export interface AccountStateResponse {
  action: 'get-account-state';
  email: string | null;
  profile: {
    username: string | null;
    usernameCanonical: string | null;
    avatarPalette: string | null;
    isHouseAccount?: boolean;
    joinedMonthYear?: string | null;
    avatarFakeBirdKey?: string | null;
    avatarFakeBirdImageUrl?: string | null;
    privacyMode?: 'public' | 'private' | null;
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
    email: string | null;
    username: string;
    usernameCanonical: string;
  };
  requiresEmailVerification: boolean;
  session: {
    accessToken: string;
    refreshToken: string;
  };
}

export interface SyncLocalProgressResponse {
  action: 'sync-local-progress';
  syncedAt: string;
  themeCount: number;
  milestoneCount: number;
  journalCount: number;
}

export interface SyncBirdJournalResponse {
  action: 'sync-bird-journal';
  syncedAt: string;
  journalCount: number;
}

export interface SyncBirdhouseResponse {
  action: 'sync-birdhouse';
  syncedAt: string;
  birdhouse: BirdhouseStore;
}

export interface PullAccountProgressResponse {
  action: 'pull-account-progress';
  progress: LocalProgressPayload;
  journalSummary: {
    uniqueBirdCount: number;
    realBirdCount: number;
    fakeBirdCount: number;
    totalSeen: number;
    totalCorrect: number;
  };
  lastLocalSyncAt: string | null;
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

export interface SaveAvatarFakeBirdResponse {
  action: 'save-avatar-fake-bird';
  avatarFakeBirdKey: string | null;
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

export interface ClaimMissionRewardResponse extends DirectProgressMutationResponse {
  action: 'claim-mission-reward' | 'claim-mission-set-bonus';
  claimId: string;
  rewardSeeds: number;
}

export interface SyncDailyMissionCompletionResponse extends DirectProgressMutationResponse {
  action: 'sync-daily-mission-completion';
  date: string;
}

export interface SignInWithUsernameResponse {
  action: 'sign-in-with-username';
  session: {
    accessToken: string;
    refreshToken: string;
  };
}

export interface LocalProgressPayload {
  score: BirdScore;
  unlockedThemes: string[];
  dailyMissionHistory: DailyMissionHistoryEntry[];
  milestones: number[];
  journalEntries: BirdJournalEntry[];
  birdhouse: BirdhouseStore;
}

interface PostAuthActionOptions {
  signal?: AbortSignal;
  keepalive?: boolean;
}

async function postAuthAction<T>(body: object, options?: PostAuthActionOptions): Promise<T> {
  const response = await apiFetch('/api/auth', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal: options?.signal,
    keepalive: options?.keepalive,
  });

  if (!response.ok) {
    let message = 'Unable to complete account action.';
    let errorCode: string | undefined;

    try {
      const payload = await response.json() as { error?: string; message?: string; issues?: string[] };
      errorCode = payload.error;
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
      } else if (payload.error === 'captcha_required') {
        message = 'Complete the quick human check before creating your account.';
      } else if (payload.error === 'captcha_verification_failed') {
        message = 'The human check expired or failed. Try it again.';
      } else if (payload.error === 'account_creation_failed') {
        message = payload.message ?? 'Unable to create the account.';
      } else if (payload.error === 'email_already_registered') {
        message = 'An account with that email address already exists. Try signing in instead, or check your inbox for a confirmation link.';
      } else if (payload.error === 'email_confirmation_required') {
        message = 'Check your email to confirm your account before signing in.';
      } else if (payload.error === 'sign_in_identifier_not_found') {
        message = 'We could not find an account for that username. If you recently signed up, check your email for a confirmation link before signing in.';
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

    throw new AccountActionError(message, response.status, errorCode);
  }

  return response.json() as Promise<T>;
}

export function fetchAccountState(signal?: AbortSignal): Promise<AccountStateResponse> {
  return postAuthAction<AccountStateResponse>({ action: 'get-account-state' }, { signal });
}

export function registerAccount(options: {
  username: string;
  password: string;
  captchaToken?: string;
}): Promise<RegisterAccountResponse> {
  return postAuthAction<RegisterAccountResponse>({
    action: 'register-account',
    ...options,
  });
}

export function fetchWeeklyLeaderboard(signal?: AbortSignal): Promise<GetLeaderboardResponse> {
  return postAuthAction<GetLeaderboardResponse>({ action: 'get-leaderboard' }, { signal });
}

export function signInWithUsername(username: string, password: string): Promise<SignInWithUsernameResponse> {
  return postAuthAction<SignInWithUsernameResponse>({
    action: 'sign-in-with-username',
    username,
    password,
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

export function saveAvatarFakeBird(fakeBirdKey: string | null): Promise<SaveAvatarFakeBirdResponse> {
  return postAuthAction<SaveAvatarFakeBirdResponse>({
    action: 'save-avatar-fake-bird',
    fakeBirdKey,
  });
}

export interface SavePrivacyModeResponse {
  action: 'save-privacy-mode';
  privacyMode: 'public' | 'private';
}

export function savePrivacyMode(privacyMode: 'public' | 'private'): Promise<SavePrivacyModeResponse> {
  return postAuthAction<SavePrivacyModeResponse>({
    action: 'save-privacy-mode',
    privacyMode,
  });
}

export function syncLocalProgress(progress: LocalProgressPayload, missionDate?: string): Promise<SyncLocalProgressResponse> {
  return postAuthAction<SyncLocalProgressResponse>({
    action: 'sync-local-progress',
    progress,
    missionDate,
  });
}

export function syncBirdJournal(journalEntries: BirdJournalEntry[]): Promise<SyncBirdJournalResponse> {
  return postAuthAction<SyncBirdJournalResponse>({
    action: 'sync-bird-journal',
    journalEntries,
  });
}

export function syncBirdhouse(birdhouse: BirdhouseStore): Promise<SyncBirdhouseResponse> {
  return postAuthAction<SyncBirdhouseResponse>({
    action: 'sync-birdhouse',
    birdhouse,
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

export function applyProgressEvents(
  events: ProgressEvent[],
  options?: { signal?: AbortSignal; keepalive?: boolean },
): Promise<ApplyProgressEventsResponse> {
  return postAuthAction<ApplyProgressEventsResponse>({
    action: 'apply-progress-events',
    events,
  }, options);
}

export function purchaseStreakInsuranceDirect(): Promise<PurchaseStreakInsuranceResponse> {
  return postAuthAction<PurchaseStreakInsuranceResponse>({
    action: 'purchase-streak-insurance',
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

export async function deleteAccount(password: string): Promise<{ success: true }> {
  const response = await apiFetch('/api/auth/account', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });

  if (!response.ok) {
    let message = 'Unable to delete account.';
    let errorCode: string | undefined;

    try {
      const payload = await response.json() as { error?: string; message?: string };
      errorCode = payload.error;

      if (payload.error === 'rate_limited') {
        message = 'Too many requests. Please try again later.';
      } else if (payload.error === 'not_authenticated') {
        message = 'Sign in first to delete your account.';
      } else if (payload.error === 'wrong_password') {
        message = 'Incorrect password. Please try again.';
      } else if (payload.error === 'password_required') {
        message = 'Enter your password to confirm deletion.';
      } else if (payload.message) {
        message = payload.message;
      }
    } catch {
      // Fall back to the generic message.
    }

    throw new AccountActionError(message, response.status, errorCode);
  }

  return response.json() as Promise<{ success: true }>;
}