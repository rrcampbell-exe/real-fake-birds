import posthog from 'posthog-js';
import { getAnalyticsConsent } from './consent';

type Primitive = string | number | boolean | null | undefined;

type AnalyticsEventProperties = Record<string, Primitive>;

export type AnalyticsEventName =
  | 'account_sync_started'
  | 'bird_content_loaded'
  | 'birdhouse_add_gated'
  | 'birdhouse_gate_converted'
  | 'client_error_reported'
  | 'daily_challenge_completed'
  | 'daily_challenge_started'
  | 'error_displayed'
  | 'fake_bird_image_revealed'
  | 'game_round_complete'
  | 'hint_panel_opened'
  | 'hint_used'
  | 'journal_bird_viewed'
  | 'milestone_reached'
  | 'mission_completed'
  | 'mission_reward_granted'
  | 'retry_attempted'
  | 'screen_viewed'
  | 'session_start'
  | 'share_created'
  | 'signup_prompt_authenticated'
  | 'signup_prompt_dismissed'
  | 'signup_prompt_viewed'
  | 'streak_achieved'
  | 'streak_insurance_consumed'
  | 'streak_insurance_purchased'
  | 'streak_lost'
  | 'theme_previewed'
  | 'theme_purchased'
  | 'theme_unlocked'
  | 'time_to_first_purchase';

const SESSION_STORAGE_PREFIX = 'analytics-session:';
const ANALYTICS_USERNAME_STORAGE_KEY = 'analyticsUsername';
const FIRST_SESSION_TIMESTAMP_KEY = 'analytics-first-session-ts';
const FIRST_PURCHASE_TRACKED_KEY = 'analytics-first-purchase-tracked';
const MAX_ERROR_NAME_LENGTH = 80;
const MAX_ERROR_MESSAGE_LENGTH = 160;

function hasPostHogKey(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_POSTHOG_KEY);
}

function sanitizeProperties(
  properties: AnalyticsEventProperties | undefined
): AnalyticsEventProperties | undefined {
  if (!properties) {
    return undefined;
  }

  return Object.fromEntries(
    Object.entries(properties).filter(([, value]) => value !== undefined)
  );
}

function clearEmailIdentityArtifacts(): void {
  if (typeof (posthog as { unregister?: (key: string) => void }).unregister === 'function') {
    posthog.unregister?.('email');
  }
}

function truncateValue(value: string, maxLength: number): string {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value;
}

function normalizeErrorDetails(error: unknown): { errorName: string; errorMessage?: string } {
  if (error instanceof Error) {
    return {
      errorName: truncateValue(error.name || 'Error', MAX_ERROR_NAME_LENGTH),
      errorMessage: error.message
        ? truncateValue(error.message, MAX_ERROR_MESSAGE_LENGTH)
        : undefined,
    };
  }

  if (typeof error === 'string') {
    return {
      errorName: 'UnknownError',
      errorMessage: truncateValue(error, MAX_ERROR_MESSAGE_LENGTH),
    };
  }

  return { errorName: 'UnknownError' };
}

export function track(
  eventName: AnalyticsEventName,
  properties?: AnalyticsEventProperties
): void {
  if (typeof window === 'undefined' || !hasPostHogKey()) {
    return;
  }

  if (getAnalyticsConsent() !== 'accepted') {
    return;
  }

  try {
    const username = readAnalyticsUsername();

    if (username) {
      const currentDistinctId = typeof posthog.get_distinct_id === 'function'
        ? posthog.get_distinct_id()
        : null;

      if (currentDistinctId !== username) {
        posthog.reset(true);
        clearEmailIdentityArtifacts();
        posthog.identify(username, {
          name: username,
          username,
          email: null,
        });
      }

      clearEmailIdentityArtifacts();
      posthog.register({ username });
    }

    posthog.capture(
      eventName,
      sanitizeProperties(
        username
          ? {
              ...properties,
              username,
            }
          : properties
      )
    );
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[analytics] Failed to capture event:', eventName, err);
    }
    return;
  }
}

export function trackClientError(
  errorContext: string,
  error: unknown,
  properties?: AnalyticsEventProperties
): void {
  const { errorName, errorMessage } = normalizeErrorDetails(error);

  track('client_error_reported', {
    error_context: errorContext,
    error_name: errorName,
    error_message: errorMessage,
    ...properties,
  });
}

export function trackSessionStart(mode: 'classic' | 'daily'): void {
  if (typeof window === 'undefined' || !hasPostHogKey()) {
    return;
  }

  if (getAnalyticsConsent() !== 'accepted') {
    return;
  }

  const sessionKey = `${SESSION_STORAGE_PREFIX}${mode}`;
  if (window.sessionStorage.getItem(sessionKey)) {
    return;
  }

  window.sessionStorage.setItem(sessionKey, 'true');

  if (!window.localStorage.getItem(FIRST_SESSION_TIMESTAMP_KEY)) {
    window.localStorage.setItem(FIRST_SESSION_TIMESTAMP_KEY, Date.now().toString());
  }

  let seedsBalance: number | undefined;
  try {
    const raw = window.localStorage.getItem('birdScore');
    if (raw) {
      const parsed = JSON.parse(raw) as { seeds?: number };
      if (typeof parsed?.seeds === 'number') {
        seedsBalance = parsed.seeds;
      }
    }
  } catch {
    // ignore parse errors
  }

  track('session_start', { mode, seeds_balance: seedsBalance });
}

export function trackFirstPurchase(
  purchaseType: 'hint_fact' | 'hint_image' | 'fake_reveal' | 'theme' | 'streak_insurance'
): void {
  if (typeof window === 'undefined' || !hasPostHogKey()) {
    return;
  }

  if (getAnalyticsConsent() !== 'accepted') {
    return;
  }

  if (window.localStorage.getItem(FIRST_PURCHASE_TRACKED_KEY)) {
    return;
  }

  window.localStorage.setItem(FIRST_PURCHASE_TRACKED_KEY, 'true');

  const firstTsRaw = window.localStorage.getItem(FIRST_SESSION_TIMESTAMP_KEY);
  const firstTs = firstTsRaw ? parseInt(firstTsRaw, 10) : null;
  const secondsSinceFirstSession = firstTs ? Math.floor((Date.now() - firstTs) / 1000) : null;

  track('time_to_first_purchase', {
    purchase_type: purchaseType,
    seconds_since_first_session: secondsSinceFirstSession,
  });
}

export function readAnalyticsUsername(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = window.localStorage.getItem(ANALYTICS_USERNAME_STORAGE_KEY);
  return raw?.trim() ? raw : null;
}

export function setAnalyticsUsername(username: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  const normalizedUsername = username.trim();
  if (!normalizedUsername) {
    return;
  }

  window.localStorage.setItem(ANALYTICS_USERNAME_STORAGE_KEY, normalizedUsername);
}

export function clearAnalyticsUsername(): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(ANALYTICS_USERNAME_STORAGE_KEY);
}