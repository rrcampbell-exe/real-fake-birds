import type { NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

// ISO 3166-1 alpha-2 codes for EU member states + EEA/UK where GDPR applies.
const GDPR_COUNTRY_CODES = new Set([
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR',
  'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL',
  'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE',
  // EEA non-EU
  'IS', 'LI', 'NO',
  // UK (retained GDPR)
  'GB',
  // Switzerland (nFADP, broadly aligned)
  'CH',
]);

const REGION_COOKIE = 'rfb-region';

export function buildCsp(nonce: string): string {
  // Keep this host in sync with NEXT_PUBLIC_POSTHOG_HOST used by AnalyticsProvider.
  const postHogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com';
  const directives = [
    `default-src 'self'`,
    // 'strict-dynamic' lets scripts loaded by a nonced script load further scripts.
    // Host allowlists serve as fallback for older browsers that ignore 'strict-dynamic'.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://challenges.cloudflare.com https://va.vercel-scripts.com`,
    // Tailwind and Next.js inject some inline styles; 'unsafe-inline' is acceptable
    // for styles because CSS injection cannot exfiltrate data the way script injection can.
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: https://upload.wikimedia.org https://cdn.realfakebirds.app`,
    `font-src 'self'`,
    `media-src 'self'`,
    `connect-src 'self' https://*.supabase.co wss://*.supabase.co https://challenges.cloudflare.com https://vitals.vercel-insights.com ${postHogHost}`,
    `frame-src https://challenges.cloudflare.com`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `upgrade-insecure-requests`,
  ];
  return directives.join('; ');
}

export async function middleware(request: NextRequest) {
  // Generate a fresh nonce for every request.
  const nonce = btoa(crypto.randomUUID());

  // Forward the nonce to the layout via a request header so the theme bootstrap
  // <Script> can carry it. Next.js also reads x-nonce to nonce its own inline scripts.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);

  const response = await updateSession(request, requestHeaders);

  response.headers.set('Content-Security-Policy', buildCsp(nonce));

  // Only set the cookie once; skip if already present.
  if (!request.cookies.has(REGION_COOKIE)) {
    const country = request.headers.get('x-vercel-ip-country')?.trim();

    // Treat missing/empty geo headers as unknown so consent is still required.
    if (country) {
      const region = GDPR_COUNTRY_CODES.has(country.toUpperCase()) ? 'EU' : 'OTHER';
      response.cookies.set(REGION_COOKIE, region, {
        path: '/',
        maxAge: 60 * 60 * 24 * 365, // 1 year
        sameSite: 'lax',
        secure: true,
      });
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp3|wav|ico)$).*)',
  ],
};