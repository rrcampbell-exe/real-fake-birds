import posthog from 'posthog-js';

type Primitive = string | number | boolean | null | undefined;

type AnalyticsEventProperties = Record<string, Primitive>;

export type AnalyticsEventName =
  | 'account_sync_started'
  | 'daily_challenge_completed'
  | 'daily_reward_claimed'
  | 'daily_challenge_started'
  | 'game_round_complete'
  | 'hint_used'
  | 'milestone_reached'
  | 'mission_claimed'
  | 'mission_completed'
  | 'session_start'
  | 'share_created'
  | 'signup_prompt_authenticated'
  | 'signup_prompt_dismissed'
  | 'signup_prompt_viewed'
  | 'streak_achieved'
  | 'streak_insurance_consumed'
  | 'streak_insurance_purchased'
  | 'theme_purchased'
  | 'theme_unlocked';

const SESSION_STORAGE_PREFIX = 'analytics-session:';
const ANALYTICS_USERNAME_STORAGE_KEY = 'analyticsUsername';

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

  const sessionKey = `${SESSION_STORAGE_PREFIX}${mode}`;
  if (window.sessionStorage.getItem(sessionKey)) {
    return;
  }

  window.sessionStorage.setItem(sessionKey, 'true');
  track('session_start', { mode });
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