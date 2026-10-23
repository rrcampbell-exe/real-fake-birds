import { NextRequest, NextResponse } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { ensureAccountProfileFromUserMetadata } from '@/lib/auth/account-profile';
import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase/server';

function getSafeNextPath(candidate: string | null): string {
  if (!candidate || !candidate.startsWith('/') || candidate.startsWith('//')) {
    return '/settings';
  }

  return candidate;
}

function buildRedirectUrl(request: NextRequest, nextPath: string, authError?: string): URL {
  const redirectUrl = new URL(nextPath, request.url);

  if (authError) {
    redirectUrl.searchParams.set('authError', authError);
  }

  return redirectUrl;
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const requestedNextPath = requestUrl.searchParams.get('type') === 'recovery'
    ? '/auth/reset-password'
    : requestUrl.searchParams.get('next');
  const nextPath = getSafeNextPath(requestedNextPath);
  const oauthError = requestUrl.searchParams.get('error_description');
  const code = requestUrl.searchParams.get('code');
  const tokenHash = requestUrl.searchParams.get('token_hash');
  const otpType = requestUrl.searchParams.get('type') as EmailOtpType | null;

  if (oauthError) {
    return NextResponse.redirect(buildRedirectUrl(request, nextPath, oauthError));
  }

  if (!code && !(tokenHash && otpType)) {
    return NextResponse.redirect(buildRedirectUrl(request, nextPath, 'missing_code'));
  }

  try {
    const supabase = await createSupabaseServerClient();
    const authResult = tokenHash && otpType
      ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type: otpType })
      : code
        ? await supabase.auth.exchangeCodeForSession(code)
        : { error: new Error('missing_code') };

    if (authResult.error) {
      return NextResponse.redirect(buildRedirectUrl(request, nextPath, 'exchange_failed'));
    }

    const { data } = await supabase.auth.getUser();
    if (data.user) {
      const admin = createSupabaseAdminClient();
      await ensureAccountProfileFromUserMetadata({ admin, user: data.user });
    }

    return NextResponse.redirect(buildRedirectUrl(request, nextPath));
  } catch {
    return NextResponse.redirect(buildRedirectUrl(request, nextPath, 'exchange_failed'));
  }
}