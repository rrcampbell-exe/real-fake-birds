export type AnalyticsConsent = 'accepted' | 'declined';

const CONSENT_STORAGE_KEY = 'analytics_consent';
const REGION_COOKIE = 'rfb-region';

export function getAnalyticsConsent(): AnalyticsConsent | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = window.localStorage.getItem(CONSENT_STORAGE_KEY);
  if (raw === 'accepted' || raw === 'declined') {
    return raw;
  }

  return null;
}

export function setAnalyticsConsent(value: AnalyticsConsent): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(CONSENT_STORAGE_KEY, value);
}

export function hasAnalyticsConsent(): boolean {
  return getAnalyticsConsent() !== null;
}

/**
 * Reads the `rfb-region` cookie set by middleware and returns whether the user
 * is in a GDPR-covered region.
 *
 * Fail-open: returns `true` (requires consent) when the cookie is absent so
 * that users in unknown environments — including local development and, in the
 * future, native app WebViews before that packaging work adds an explicit
 * non-EU signal — are always shown the modal.
 *
 * TODO: When native packaging (Capacitor/WebView) is added, inject a
 * non-Vercel-hosted signal (e.g. a Capacitor bridge flag or a bundled env var)
 * so the native app can set this cookie itself and suppress the modal for
 * non-EU users correctly.
 */
export function requiresAnalyticsConsent(): boolean {
  if (typeof document === 'undefined') {
    return true; // SSR — default to requiring consent
  }

  const match = document.cookie
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${REGION_COOKIE}=`));

  if (!match) {
    return true; // Cookie absent → fail-open
  }

  return match.split('=')[1] === 'EU';
}
