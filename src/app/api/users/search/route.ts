import { NextRequest, NextResponse } from 'next/server';
import { buildSocialEntries } from '@/lib/server/social-entries';
import { hasSupabaseEnv } from '@/lib/supabase/env';
import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase/server';
import { consumeRateLimit, getRateLimitKey } from '@/lib/server/rate-limiter';
import type { UserSearchResponse, SocialUserEntry } from '@/types/social';

export type UserSearchEntry = SocialUserEntry;

const SEARCH_WINDOW_MS = 60_000;
const SEARCH_MAX_REQUESTS = 30;
const SEARCH_RESULTS_LIMIT = 20;

function getClientIp(request: NextRequest): string | null {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim() ?? null;
  }
  return request.headers.get('x-real-ip');
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!hasSupabaseEnv()) {
    return NextResponse.json({ error: 'service_unavailable' }, { status: 503 });
  }

  const rateLimit = await consumeRateLimit(
    getRateLimitKey(getClientIp(request), 'users-search'),
    SEARCH_MAX_REQUESTS,
    SEARCH_WINDOW_MS,
  );

  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }

  // Require authentication
  let viewerId: string | null = null;
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.getUser();
    if (!error && data.user) {
      viewerId = data.user.id;
    }
  } catch {
    // fall through
  }

  if (!viewerId) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') ?? '').trim();

  if (q.length < 1) {
    return NextResponse.json({ users: [] } satisfies UserSearchResponse);
  }

  // Normalize query: strip leading @, lowercase
  const normalized = q.replace(/^@+/, '').toLowerCase();

  if (normalized.length < 1) {
    return NextResponse.json({ users: [] } satisfies UserSearchResponse);
  }

  const admin = createSupabaseAdminClient();

  const { data, error } = await admin
    .from('profiles')
    .select('user_id')
    .ilike('username_canonical', `%${normalized}%`)
    .neq('user_id', viewerId)
    .limit(SEARCH_RESULTS_LIMIT);

  if (error) {
    const fallbackResult = await admin
      .from('profiles')
      .select('user_id')
      .ilike('username_canonical', `%${normalized}%`)
      .neq('user_id', viewerId)
      .limit(SEARCH_RESULTS_LIMIT);

    if (fallbackResult.error) {
      return NextResponse.json({ error: 'fetch_failed' }, { status: 500 });
    }

    try {
      const userIds = (fallbackResult.data ?? []).map((row) => row.user_id as string);
      const users = await buildSocialEntries(admin, userIds, viewerId);
      return NextResponse.json({ users } satisfies UserSearchResponse);
    } catch {
      return NextResponse.json({ error: 'fetch_failed' }, { status: 500 });
    }
  }

  try {
    const userIds = (data ?? []).map((row) => row.user_id as string);
    const users: SocialUserEntry[] = await buildSocialEntries(admin, userIds, viewerId);
    return NextResponse.json({ users } satisfies UserSearchResponse);
  } catch {
    return NextResponse.json({ error: 'fetch_failed' }, { status: 500 });
  }
}
