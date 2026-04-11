import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getAnalyticsConsent, hasAnalyticsConsent, requiresAnalyticsConsent, setAnalyticsConsent } from './consent';

describe('analytics consent helpers', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('getAnalyticsConsent', () => {
    it('returns null when no consent has been stored', () => {
      expect(getAnalyticsConsent()).toBeNull();
    });

    it('returns "accepted" after accepting', () => {
      localStorage.setItem('analytics_consent', 'accepted');
      expect(getAnalyticsConsent()).toBe('accepted');
    });

    it('returns "declined" after declining', () => {
      localStorage.setItem('analytics_consent', 'declined');
      expect(getAnalyticsConsent()).toBe('declined');
    });

    it('returns null for an unrecognised stored value', () => {
      localStorage.setItem('analytics_consent', 'unknown-value');
      expect(getAnalyticsConsent()).toBeNull();
    });
  });

  describe('setAnalyticsConsent', () => {
    it('persists "accepted" to localStorage', () => {
      setAnalyticsConsent('accepted');
      expect(localStorage.getItem('analytics_consent')).toBe('accepted');
    });

    it('persists "declined" to localStorage', () => {
      setAnalyticsConsent('declined');
      expect(localStorage.getItem('analytics_consent')).toBe('declined');
    });

    it('overwrites a previous choice', () => {
      setAnalyticsConsent('accepted');
      setAnalyticsConsent('declined');
      expect(localStorage.getItem('analytics_consent')).toBe('declined');
    });
  });

  describe('hasAnalyticsConsent', () => {
    it('returns false when no consent has been stored', () => {
      expect(hasAnalyticsConsent()).toBe(false);
    });

    it('returns true when consent is "accepted"', () => {
      setAnalyticsConsent('accepted');
      expect(hasAnalyticsConsent()).toBe(true);
    });

    it('returns true when consent is "declined"', () => {
      setAnalyticsConsent('declined');
      expect(hasAnalyticsConsent()).toBe(true);
    });
  });

  describe('requiresAnalyticsConsent', () => {
    afterEach(() => {
      // Reset document.cookie between tests
      document.cookie = 'rfb-region=; max-age=0';
    });

    it('returns true when the rfb-region cookie is absent (fail-open)', () => {
      expect(requiresAnalyticsConsent()).toBe(true);
    });

    it('returns true when rfb-region=EU', () => {
      document.cookie = 'rfb-region=EU';
      expect(requiresAnalyticsConsent()).toBe(true);
    });

    it('returns false when rfb-region=OTHER', () => {
      document.cookie = 'rfb-region=OTHER';
      expect(requiresAnalyticsConsent()).toBe(false);
    });
  });
});
