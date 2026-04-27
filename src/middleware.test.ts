import { vi, describe, it, expect, afterEach } from 'vitest';

// Prevent Next.js server-only modules from being evaluated in jsdom.
vi.mock('@/lib/supabase/middleware', () => ({
  updateSession: vi.fn(),
}));

import { buildCsp } from '../middleware';

describe('buildCsp', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('includes the default PostHog ingest host in connect-src', () => {
    const csp = buildCsp('test-nonce');
    expect(csp).toContain('https://us.i.posthog.com');
  });

  it('includes a custom NEXT_PUBLIC_POSTHOG_HOST when configured', () => {
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_HOST', 'https://eu.i.posthog.com');
    const csp = buildCsp('test-nonce');
    expect(csp).toContain('https://eu.i.posthog.com');
    expect(csp).not.toContain('https://us.i.posthog.com');
  });

  it('includes supabase and vercel vitals in connect-src', () => {
    const csp = buildCsp('test-nonce');
    expect(csp).toContain('https://*.supabase.co');
    expect(csp).toContain('https://vitals.vercel-insights.com');
  });

  it('embeds the nonce in script-src', () => {
    const csp = buildCsp('abc123');
    expect(csp).toContain("'nonce-abc123'");
  });

  it('blocks object-src and base-uri to self', () => {
    const csp = buildCsp('nonce');
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'self'");
  });
});
