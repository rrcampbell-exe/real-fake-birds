import { NextRequest, NextResponse } from 'next/server';
import { hasSupabaseEnv } from '@/lib/supabase/env';
import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase/server';
import { consumeRateLimit, getRateLimitKey } from '@/lib/server/rate-limiter';
import { resolveProfileRelationshipAndCapabilities } from '@/lib/server/profile-visibility';
import { formatJoinedMonthYear } from '@/lib/utils/profile-helpers';
import { getCdnImageUrl, isCdnEnabled } from '@/lib/server/cdn';
import type {
  FollowRow,
  OwnProfilePayload,
  ProfileProgressSummary,
  ProfileReadResponse,
  PublicProfilePayload,
  RestrictedProfilePayload,
} from '@/types/profile';

const PROFILE_READ_WINDOW_MS = 60_000;
const PROFILE_READ_MAX_REQUESTS = 60;

type TargetProfileRow = {
  user_id: string;
  username: string | null;
  username_canonical: string | null;
  avatar_palette: string | null;
  avatar_fake_bird_key?: string | null;
  privacy_mode?: 'public' | 'private' | null;
  created_at: string;
};

function readAvatarFakeBirdKeyFromUserMetadata(userMetadata: unknown): string | null {
  if (!userMetadata || typeof userMetadata !== 'object') {
    return null;
  }

  const candidate = (userMetadata as Record<string, unknown>).avatar_fake_bird_key;
  return typeof candidate === 'string' ? candidate : null;
}

function toCdnFakeBirdKey(avatarFakeBirdKey: string): string {
  return avatarFakeBirdKey.startsWith('fake:')
    ? avatarFakeBirdKey.slice('fake:'.length)
    : avatarFakeBirdKey;
}

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

function getClientIp(request: NextRequest): string | null {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim() ?? null;
  }

  return request.headers.get('x-real-ip');
}

function blockedResponse(): NextResponse<ProfileReadResponse> {
  return NextResponse.json({
    visibility: { reason: 'blocked', canViewFull: false, canFollow: false },
    relationship: 'blocked',
    capabilities: {
      canFollow: false,
      canUnfollow: false,
      canChallengeBirdBlitz: false,
    },
    profile: null,
  });
}

async function fetchTargetProfile(admin: ReturnType<typeof createSupabaseAdminClient>, username: string) {
  const profileQuery = admin
    .from('profiles')
    .select('user_id, username, username_canonical, avatar_palette, avatar_fake_bird_key, privacy_mode, created_at')
    .eq('username_canonical', username)
    .maybeSingle<TargetProfileRow>();

  const { data, error } = await profileQuery;

  if (isMissingSupabaseColumnError(error, 'privacy_mode') || isMissingSupabaseColumnError(error, 'avatar_fake_bird_key')) {
    const fallbackResult = await admin
      .from('profiles')
      .select('user_id, username, username_canonical, avatar_palette, created_at')
      .eq('username_canonical', username)
      .maybeSingle<Omit<TargetProfileRow, 'privacy_mode' | 'avatar_fake_bird_key'>>();

    return {
      ...fallbackResult,
      avatarColumnUnavailable: isMissingSupabaseColumnError(error, 'avatar_fake_bird_key'),
    };
  }

  return { data, error, avatarColumnUnavailable: false };
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!hasSupabaseEnv()) {
    return NextResponse.json({ error: 'service_unavailable' }, { status: 503 });
  }

  const rateLimit = await consumeRateLimit(
    getRateLimitKey(getClientIp(request), 'profile-read'),
    PROFILE_READ_MAX_REQUESTS,
    PROFILE_READ_WINDOW_MS,
  );

  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const username = searchParams.get('username')?.trim().toLowerCase();

  if (!username) {
    return NextResponse.json({ error: 'missing_username' }, { status: 400 });
  }

  // Try to identify the viewer (optional — guests are allowed)
  let viewerId: string | null = null;
  try {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.auth.getUser();
    viewerId = data.user?.id ?? null;
  } catch {
    // Guest viewer — continue without auth
  }

  const admin = createSupabaseAdminClient();

  // Fetch the target profile
  const {
    data: targetProfile,
    error: profileError,
    avatarColumnUnavailable,
  } = await fetchTargetProfile(admin, username);

  if (profileError) {
    return NextResponse.json({ error: 'profile_fetch_failed' }, { status: 500 });
  }

  if (!targetProfile?.user_id || !targetProfile.username) {
    return NextResponse.json({
      visibility: { reason: 'private_unapproved', canViewFull: false, canFollow: false },
      relationship: 'none',
      capabilities: {
        canFollow: false,
        canUnfollow: false,
        canChallengeBirdBlitz: false,
      },
      profile: null,
    } satisfies ProfileReadResponse);
  }

  // Fetch follow/block rows involving either party
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

  const privacyMode =
    ('privacy_mode' in targetProfile && targetProfile.privacy_mode === 'private')
      ? 'private'
      : 'public';

  const { visibility, relationship, capabilities } = resolveProfileRelationshipAndCapabilities(
    viewerId,
    { userId: targetProfile.user_id, privacyMode },
    followsRows,
  );

  if (!visibility.canViewFull) {
    if (visibility.reason === 'blocked') {
      return blockedResponse();
    }

    // Private, unapproved — return restricted payload
    const restricted: RestrictedProfilePayload = {
      kind: 'restricted',
      username: targetProfile.username,
      joinedMonthYear: formatJoinedMonthYear(targetProfile.created_at as string),
    };

    return NextResponse.json({
      visibility,
      relationship,
      capabilities,
      profile: restricted,
    } satisfies ProfileReadResponse);
  }

  // Full access — fetch progress summary
  const { data: progressRow } = await admin
    .from('player_progress')
    .select('birds_identified, seeds, best_streak, best_daily_streak, best_weekly_placement')
    .eq('user_id', targetProfile.user_id)
    .maybeSingle();

  const progress: ProfileProgressSummary = {
    birdsIdentified: progressRow?.birds_identified ?? 0,
    seeds: progressRow?.seeds ?? 0,
    bestStreak: progressRow?.best_streak ?? 0,
    bestDailyStreak: progressRow?.best_daily_streak ?? 0,
    bestWeeklyPlacement: progressRow?.best_weekly_placement ?? null,
  };

  const joinedMonthYear = formatJoinedMonthYear(targetProfile.created_at as string);
  const avatarPalette = targetProfile.avatar_palette ?? 'finch';
  let avatarFakeBirdKey = 'avatar_fake_bird_key' in targetProfile && typeof targetProfile.avatar_fake_bird_key === 'string'
    ? targetProfile.avatar_fake_bird_key
    : null;

  if (!avatarFakeBirdKey && avatarColumnUnavailable) {
    const { data: userResult, error: userError } = await admin.auth.admin.getUserById(targetProfile.user_id);
    if (!userError) {
      avatarFakeBirdKey = readAvatarFakeBirdKeyFromUserMetadata(userResult.user?.user_metadata);
    }
  }
  const avatarFakeBirdImageUrl = avatarFakeBirdKey && isCdnEnabled()
    ? getCdnImageUrl(toCdnFakeBirdKey(avatarFakeBirdKey), 'thumb', 'fake')
    : null;

  if (visibility.reason === 'owner') {
    const payload: OwnProfilePayload = {
      kind: 'own',
      username: targetProfile.username,
      avatarPalette,
      avatarFakeBirdImageUrl,
      joinedMonthYear,
      privacyMode,
      progress,
    };

    return NextResponse.json({
      visibility,
      relationship,
      capabilities,
      profile: payload,
    } satisfies ProfileReadResponse);
  }

  const payload: PublicProfilePayload = {
    kind: 'public',
    username: targetProfile.username,
    avatarPalette,
    avatarFakeBirdImageUrl,
    joinedMonthYear,
    progress,
  };

  return NextResponse.json({
    visibility,
    relationship,
    capabilities,
    profile: payload,
  } satisfies ProfileReadResponse);
}
