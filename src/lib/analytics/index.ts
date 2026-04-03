import posthog from 'posthog-js';

type Primitive = string | number | boolean | null | undefined;

type AnalyticsEventProperties = Record<string, Primitive>;

export type AnalyticsEventName =
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
  | 'streak_achieved'
  | 'streak_insurance_consumed'
  | 'streak_insurance_purchased'
  | 'theme_purchased'
  | 'theme_unlocked';

const SESSION_STORAGE_PREFIX = 'analytics-session:';

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

export function track(
  eventName: AnalyticsEventName,
  properties?: AnalyticsEventProperties
): void {
  if (typeof window === 'undefined' || !hasPostHogKey()) {
    return;
  }

  posthog.capture(eventName, sanitizeProperties(properties));
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