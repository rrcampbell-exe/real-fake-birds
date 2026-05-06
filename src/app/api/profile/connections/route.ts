import { NextRequest, NextResponse } from 'next/server';
import { buildSocialEntries } from '@/lib/server/social-entries';
import { hasSupabaseEnv } from '@/lib/supabase/env';
import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase/server';
import { consumeRateLimit, getRateLimitKey } from '@/lib/server/rate-limiter';
import { resolveProfileRelationshipAndCapabilities } from '@/lib/server/profile-visibility';
import type { SocialConnectionsListResponse } from '@/types/social';
import type { FollowRow } from '@/types/profile';

const PROFILE_CONNECTIONS_WINDOW_MS = 60_000;
const PROFILE_CONNECTIONS_MAX_REQUESTS = 30;

function getClientIp(request: NextRequest): string | null {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim() ?? null;
  }

  return request.headers.get('x-real-ip');
}

type TargetProfileRow = {
  user_id: string;
  username: string | null;
  privacy_mode?: 'public' | 'private' | null;
};

function isMissingSupabaseColumnError(error: unknown, columnName: string): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const candidate = error as {
    code?: unknown;
    message?: unknown;
    details?: unknown;
    hint?: unknown;
  };
  const code = typeof candidate.code === 'string' ? candidate.code : '';
  const text = [candidate.message, candidate.details, candidate.hint]
    .filter((part): part is string => typeof part === 'string')
    .join(' ')
    .toLowerCase();

  if (!text.includes(columnName.toLowerCase())) {
    return false;
  }

  return code === '42703' || code === 'PGRST204' || code === '';
}

async function fetchTargetProfile(admin: ReturnType<typeof createSupabaseAdminClient>, username: string) {
  const { data, error } = await admin
    .from('profiles')
    .select('user_id, username, privacy_mode')
    .eq('username_canonical', username)
    .maybeSingle<TargetProfileRow>();

  if (data?.user_id) {
    return { data, error: null };
  }

  if (isMissingSupabaseColumnError(error, 'privacy_mode')) {
    const fallback = await admin
      .from('profiles')
      .select('user_id, username')
      .eq('username_canonical', username)
      .maybeSingle<Omit<TargetProfileRow, 'privacy_mode'>>();

    return {
      data: fallback.data ? { ...fallback.data, privacy_mode: 'public' as const } : null,
      error: fallback.error,
    };
  }

  return { data, error };
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!hasSupabaseEnv()) {
    return NextResponse.json({ error: 'service_unavailable' }, { status: 503 });
  }

  const rateLimit = await consumeRateLimit(
    getRateLimitKey(getClientIp(request), 'profile-connections'),
    PROFILE_CONNECTIONS_MAX_REQUESTS,
    PROFILE_CONNECTIONS_WINDOW_MS,
  );

  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const username = searchParams.get('username')?.trim().toLowerCase();
  const list = searchParams.get('list');

  if (!username || (list !== 'followers' && list !== 'following')) {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  }

  let viewerId: string | null = null;
  try {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.auth.getUser();
    viewerId = data.user?.id ?? null;
  } catch {
    viewerId = null;
  }

  const admin = createSupabaseAdminClient();
  const { data: targetProfile, error: targetProfileError } = await fetchTargetProfile(admin, username);

  if (targetProfileError) {
    return NextResponse.json({ error: 'profile_fetch_failed' }, { status: 500 });
  }

  if (!targetProfile?.user_id) {
    return NextResponse.json({ error: 'target_not_found' }, { status: 404 });
  }

  const privacyMode = targetProfile.privacy_mode === 'private' ? 'private' : 'public';

  let followsRows: FollowRow[] = [];
  if (viewerId) {
    const { data: follows } = await admin
      .from('follows')
      .select('user_id, related_user_id, relationship_type, status')
      .or(
        `and(user_id.eq.${viewerId},related_user_id.eq.${targetProfile.user_id}),` +
          `and(user_id.eq.${targetProfile.user_id},related_user_id.eq.${viewerId})`,
      );

    followsRows = (follows ?? []).map((row) => ({
      userId: row.user_id as string,
      relatedUserId: row.related_user_id as string,
      relationshipType: row.relationship_type as 'follow' | 'block',
      status: row.status as 'pending' | 'approved',
    }));
  }

  const { visibility } = resolveProfileRelationshipAndCapabilities(
    viewerId,
    { userId: targetProfile.user_id, privacyMode },
    followsRows,
  );

  if (!visibility.canViewFull) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const { data: followRows, error: followRowsError } = await admin
    .from('follows')
    .select('user_id, related_user_id')
    .eq('relationship_type', 'follow')
    .eq('status', 'approved')
    .or(`user_id.eq.${targetProfile.user_id},related_user_id.eq.${targetProfile.user_id}`);

  if (followRowsError) {
    return NextResponse.json({ error: 'fetch_failed' }, { status: 500 });
  }

  const ids = (followRows ?? [])
    .filter((row) => (list === 'followers' ? row.related_user_id === targetProfile.user_id : row.user_id === targetProfile.user_id))
    .map((row) => (list === 'followers' ? row.user_id as string : row.related_user_id as string));

  try {
    const entries = await buildSocialEntries(admin, ids, viewerId);
    return NextResponse.json({ entries } satisfies SocialConnectionsListResponse);
  } catch {
    return NextResponse.json({ error: 'fetch_failed' }, { status: 500 });
  }
}