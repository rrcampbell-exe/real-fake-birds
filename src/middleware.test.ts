import { vi, describe, it, expect, afterEach, beforeEach } from 'vitest';

// Prevent Next.js server-only modules from being evaluated in jsdom.
vi.mock('@/lib/supabase/middleware', () => ({
  updateSession: vi.fn(),
}));

import { NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import { buildCsp, middleware } from '../middleware';

const mockedUpdateSession = vi.mocked(updateSession);

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

describe('middleware API CORS', () => {
  beforeEach(() => {
    mockedUpdateSession.mockImplementation(async () => NextResponse.next());
  });

  it('allows only the configured Capacitor origin on API routes', async () => {
    const response = await middleware(
      new NextRequest('https://www.realfakebirds.app/api/profile', {
        headers: { Origin: 'capacitor://localhost' },
      }),
    );
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('capacitor://localhost');
    expect(response.headers.get('Access-Control-Allow-Methods')).toBe('GET, POST, DELETE, OPTIONS');
    expect(response.headers.get('Access-Control-Allow-Headers')).toBe('Authorization, Content-Type');
    expect(response.headers.get('Vary')).toContain('Origin');
  });

  it('omits CORS headers for unknown origins and non-API routes', async () => {
    const denied = await middleware(
      new NextRequest('https://www.realfakebirds.app/api/profile', {
        headers: { Origin: 'https://untrusted.example' },
      }),
    );
    const web = await middleware(
      new NextRequest('https://www.realfakebirds.app/profile', {
        headers: { Origin: 'capacitor://localhost' },
      }),
    );

    expect([...denied.headers.keys()].some((key) => key.toLowerCase().startsWith('access-control-'))).toBe(false);
    expect([...web.headers.keys()].some((key) => key.toLowerCase().startsWith('access-control-'))).toBe(false);
  });

  it('answers valid API preflights and rejects disallowed preflight headers', async () => {
    const allowed = await middleware(
      new NextRequest('https://www.realfakebirds.app/api/profile', {
        method: 'OPTIONS',
        headers: {
          Origin: 'http://localhost',
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'authorization, content-type',
        },
      }),
    );
    const rejected = await middleware(
      new NextRequest('https://www.realfakebirds.app/api/profile', {
        method: 'OPTIONS',
        headers: {
          Origin: 'http://localhost',
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'x-unapproved',
        },
      }),
    );

    expect(allowed.status).toBe(204);
    expect(allowed.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost');
    expect(allowed.headers.get('Access-Control-Allow-Headers')).toBe('Authorization, Content-Type');
    expect(rejected.headers.has('Access-Control-Allow-Origin')).toBe(false);
  });
});
