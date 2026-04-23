import { NextRequest, NextResponse } from 'next/server';
import { hasSupabaseEnv } from '@/lib/supabase/env';
import { createSupabaseAdminClient, createSupabaseAuthClient, createSupabaseServerClient } from '@/lib/supabase/server';
import { consumeRateLimit, getRateLimitKey } from '@/lib/server/rate-limiter';

const DELETE_ACCOUNT_MAX_REQUESTS = 3;
const DELETE_ACCOUNT_WINDOW_MS = 86_400_000; // 24 hours

function getClientIp(request: NextRequest): string | null {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim() ?? null;
  }

  return request.headers.get('x-real-ip');
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  if (!hasSupabaseEnv()) {
    return NextResponse.json({ error: 'service_unavailable' }, { status: 503 });
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return NextResponse.json({ error: 'not_authenticated' }, { status: 401 });
  }

  const userId = data.user.id;
  const userEmail = data.user.email;

  if (!userEmail) {
    return NextResponse.json({ error: 'no_password_auth' }, { status: 400 });
  }

  let password: string | undefined;
  try {
    const body = await request.json() as { password?: unknown };
    password = typeof body.password === 'string' ? body.password : undefined;
  } catch {
    // body is empty or not JSON
  }

  if (!password) {
    return NextResponse.json({ error: 'password_required' }, { status: 400 });
  }

  const authClient = createSupabaseAuthClient();
  const { error: signInError } = await authClient.auth.signInWithPassword({
    email: userEmail,
    password,
  });

  if (signInError) {
    return NextResponse.json({ error: 'wrong_password' }, { status: 401 });
  }

  const rateLimitResult = await consumeRateLimit(
    getRateLimitKey(getClientIp(request), 'delete-account'),
    DELETE_ACCOUNT_MAX_REQUESTS,
    DELETE_ACCOUNT_WINDOW_MS,
  );

  if (!rateLimitResult.allowed) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }

  try {
    const admin = createSupabaseAdminClient();
    const { error: deleteError } = await admin.auth.admin.deleteUser(userId);

    if (deleteError) {
      return NextResponse.json({ error: 'deletion_failed', message: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'deletion_failed' }, { status: 500 });
  }
}
