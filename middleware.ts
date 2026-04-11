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

export async function middleware(request: NextRequest) {
  const response = await updateSession(request);

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