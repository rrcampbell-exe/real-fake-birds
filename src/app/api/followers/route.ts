import { NextRequest, NextResponse } from 'next/server';
import { buildSocialEntries } from '@/lib/server/social-entries';
import { hasSupabaseEnv } from '@/lib/supabase/env';
import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase/server';
import { consumeRateLimit, getRateLimitKey } from '@/lib/server/rate-limiter';
import type { SocialUserEntry } from '@/types/social';

const FOLLOWERS_READ_WINDOW_MS = 60_000;
const FOLLOWERS_READ_MAX_REQUESTS = 30;

export type FollowEntry = SocialUserEntry;

export interface FollowersResponse {
  followers: FollowEntry[];
  following: FollowEntry[];
  pendingRequests: FollowEntry[];
}

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
    getRateLimitKey(getClientIp(request), 'followers-read'),
    FOLLOWERS_READ_MAX_REQUESTS,
    FOLLOWERS_READ_WINDOW_MS,
  );

  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }

  // Require authentication — only a user can view their own followers/following
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

  const admin = createSupabaseAdminClient();

  // Fetch follow rows for this user (both directions, approved only)
  const { data: followRows, error: followError } = await admin
    .from('follows')
    .select('user_id, related_user_id')
    .eq('relationship_type', 'follow')
    .eq('status', 'approved')
    .or(`user_id.eq.${viewerId},related_user_id.eq.${viewerId}`);

  if (followError) {
    return NextResponse.json({ error: 'fetch_failed' }, { status: 500 });
  }

  // Fetch incoming pending follow requests (others requesting to follow me)
  const { data: pendingRows, error: pendingError } = await admin
    .from('follows')
    .select('user_id')
    .eq('relationship_type', 'follow')
    .eq('status', 'pending')
    .eq('related_user_id', viewerId);

  if (pendingError) {
    return NextResponse.json({ error: 'fetch_failed' }, { status: 500 });
  }

  const pendingRequesterIds = (pendingRows ?? []).map((r) => r.user_id as string);

  const rows = followRows ?? [];

  // IDs of users who follow me
  const followerIds = rows
    .filter((r) => r.related_user_id === viewerId)
    .map((r) => r.user_id as string);

  // IDs of users I follow
  const followingIds = rows
    .filter((r) => r.user_id === viewerId)
    .map((r) => r.related_user_id as string);

  const allIds = [...new Set([...followerIds, ...followingIds, ...pendingRequesterIds])];

  if (allIds.length === 0) {
    return NextResponse.json({ followers: [], following: [], pendingRequests: [] } satisfies FollowersResponse);
  }

  const toEntries = async (ids: string[]): Promise<FollowEntry[]> => buildSocialEntries(admin, ids, viewerId);

  try {
    const [followers, following, pendingRequests] = await Promise.all([
      toEntries(followerIds),
      toEntries(followingIds),
      toEntries(pendingRequesterIds),
    ]);

    return NextResponse.json({
      followers,
      following,
      pendingRequests,
    } satisfies FollowersResponse);
  } catch {
    return NextResponse.json({ error: 'fetch_failed' }, { status: 500 });
  }
}
