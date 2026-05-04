import { NextRequest, NextResponse } from 'next/server';
import { hasSupabaseEnv } from '@/lib/supabase/env';
import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase/server';
import { consumeRateLimit, getRateLimitKey } from '@/lib/server/rate-limiter';
import { resolveProfileVisibility } from '@/lib/server/profile-visibility';
import { getCdnImageUrl, isCdnEnabled } from '@/lib/server/cdn';
import type { FollowRow } from '@/types/profile';

const BIRDHOUSE_READ_WINDOW_MS = 60_000;
const BIRDHOUSE_READ_MAX_REQUESTS = 60;

export interface PublicBirdhouseEntry {
  birdKey: string;
  imageUrl: string | null;
  thumbUrl: string | null;
}

export interface PublicBirdhousePayload {
  kind: 'public-birdhouse';
  username: string;
  real: PublicBirdhouseEntry[];
  fake: PublicBirdhouseEntry[];
}

function getClientIp(request: NextRequest): string | null {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim() ?? null;
  }
  return request.headers.get('x-real-ip');
}

function toEntry(birdKey: string, birdType: 'real' | 'fake'): PublicBirdhouseEntry {
  if (!isCdnEnabled()) {
    return { birdKey, imageUrl: null, thumbUrl: null };
  }
  return {
    birdKey,
    imageUrl: getCdnImageUrl(birdKey, 'full', birdType),
    thumbUrl: getCdnImageUrl(birdKey, 'thumb', birdType),
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> },
): Promise<NextResponse> {
  if (!hasSupabaseEnv()) {
    return NextResponse.json({ error: 'service_unavailable' }, { status: 503 });
  }

  const { username } = await params;
  const normalizedUsername = username?.trim().toLowerCase();

  if (!normalizedUsername) {
    return NextResponse.json({ error: 'missing_username' }, { status: 400 });
  }

  const rateLimit = await consumeRateLimit(
    getRateLimitKey(getClientIp(request), 'birdhouse-read'),
    BIRDHOUSE_READ_MAX_REQUESTS,
    BIRDHOUSE_READ_WINDOW_MS,
  );

  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }

  // Optionally identify the viewer (guests allowed)
  let viewerId: string | null = null;
  try {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.auth.getUser();
    viewerId = data.user?.id ?? null;
  } catch {
    // Guest — continue without auth
  }

  const admin = createSupabaseAdminClient();

  // Fetch target profile
  const { data: targetProfile, error: profileError } = await admin
    .from('profiles')
    .select('user_id, username, privacy_mode')
    .eq('username_canonical', normalizedUsername)
    .maybeSingle<{ user_id: string; username: string; privacy_mode: string | null }>();

  if (profileError) {
    return NextResponse.json({ error: 'profile_fetch_failed' }, { status: 500 });
  }

  if (!targetProfile?.user_id || !targetProfile.username) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  // Fetch follow/block rows for visibility resolution
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

  const privacyMode = targetProfile.privacy_mode === 'private' ? 'private' : 'public';

  const visibility = resolveProfileVisibility(
    viewerId,
    { userId: targetProfile.user_id, privacyMode },
    followsRows,
  );

  if (!visibility.canViewFull) {
    if (visibility.reason === 'blocked') {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'private_profile' }, { status: 403 });
  }

  // Fetch birdhouse data
  const { data: birdhouseRow, error: birdhouseError } = await admin
    .from('birdhouse')
    .select('real_birds, fake_birds')
    .eq('user_id', targetProfile.user_id)
    .maybeSingle<{ real_birds: string[]; fake_birds: string[] }>();

  if (birdhouseError) {
    return NextResponse.json({ error: 'birdhouse_fetch_failed' }, { status: 500 });
  }

  const realKeys: string[] = Array.isArray(birdhouseRow?.real_birds)
    ? birdhouseRow.real_birds.filter((k): k is string => typeof k === 'string').slice(0, 10)
    : [];

  const fakeKeys: string[] = Array.isArray(birdhouseRow?.fake_birds)
    ? birdhouseRow.fake_birds.filter((k): k is string => typeof k === 'string').slice(0, 10)
    : [];

  const payload: PublicBirdhousePayload = {
    kind: 'public-birdhouse',
    username: targetProfile.username,
    real: realKeys.map((key) => toEntry(key, 'real')),
    fake: fakeKeys.map((key) => toEntry(key, 'fake')),
  };

  return NextResponse.json(payload);
}
