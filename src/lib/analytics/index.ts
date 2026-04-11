import posthog from 'posthog-js';
import { getAnalyticsConsent } from './consent';

type Primitive = string | number | boolean | null | undefined;

type AnalyticsEventProperties = Record<string, Primitive>;

export type AnalyticsEventName =
  | 'account_sync_started'
  | 'daily_challenge_completed'
  | 'daily_challenge_started'
  | 'error_displayed'
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
  purchaseType: 'hint_fact' | 'hint_image' | 'theme' | 'streak_insurance'
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