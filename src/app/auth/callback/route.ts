import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

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
  const nextPath = getSafeNextPath(requestUrl.searchParams.get('next'));
  const oauthError = requestUrl.searchParams.get('error_description');
  const code = requestUrl.searchParams.get('code');

  if (oauthError) {
    return NextResponse.redirect(buildRedirectUrl(request, nextPath, oauthError));
  }

  if (!code) {
    return NextResponse.redirect(buildRedirectUrl(request, nextPath, 'missing_code'));
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      return NextResponse.redirect(buildRedirectUrl(request, nextPath, 'exchange_failed'));
    }

    return NextResponse.redirect(buildRedirectUrl(request, nextPath));
  } catch {
    return NextResponse.redirect(buildRedirectUrl(request, nextPath, 'exchange_failed'));
  }
}