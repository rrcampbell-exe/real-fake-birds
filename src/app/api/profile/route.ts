import { NextRequest, NextResponse } from 'next/server';
import { hasSupabaseEnv } from '@/lib/supabase/env';
import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase/server';
import { consumeRateLimit, getRateLimitKey } from '@/lib/server/rate-limiter';
import { resolveProfileRelationshipAndCapabilities } from '@/lib/server/profile-visibility';
import { fetchRelationshipRows } from '@/lib/server/social-relationships';
import { formatJoinedMonthYear } from '@/lib/utils/profile-helpers';
import { getCdnImageUrl, isCdnEnabled } from '@/lib/server/cdn';
import type {
  BlockedProfilePayload,
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
  is_house_account?: boolean | null;
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

function blockedResponse(profile: BlockedProfilePayload | null, blockState: ProfileReadResponse['blockState']): NextResponse<ProfileReadResponse> {
  return NextResponse.json({
    visibility: { reason: 'blocked', canViewFull: false, canFollow: false },
    relationship: 'blocked',
    blockState,
    capabilities: {
      canFollow: false,
      canUnfollow: false,
      canChallengeBirdBlitz: false,
    },
    profile,
  });
}

async function fetchTargetProfile(admin: ReturnType<typeof createSupabaseAdminClient>, username: string) {
  const profileQuery = admin
    .from('profiles')
    .select('user_id, username, username_canonical, avatar_palette, avatar_fake_bird_key, is_house_account, privacy_mode, created_at')
    .eq('username_canonical', username)
    .maybeSingle<TargetProfileRow>();

  const { data, error } = await profileQuery;

  if (isMissingSupabaseColumnError(error, 'privacy_mode') || isMissingSupabaseColumnError(error, 'avatar_fake_bird_key')) {
    const fallbackResult = await admin
      .from('profiles')
      .select('user_id, username, username_canonical, avatar_palette, is_house_account, created_at')
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
      blockState: 'none',
      capabilities: {
        canFollow: false,
        canUnfollow: false,
        canChallengeBirdBlitz: false,
      },
      profile: null,
    } satisfies ProfileReadResponse);
  }

  // Fetch follow/block rows involving either party
  const followsRows: FollowRow[] = viewerId
    ? await fetchRelationshipRows(admin, viewerId, targetProfile.user_id)
    : [];

  const privacyMode =
    ('privacy_mode' in targetProfile && targetProfile.privacy_mode === 'private')
      ? 'private'
      : 'public';

  const { visibility, relationship, blockState, capabilities } = resolveProfileRelationshipAndCapabilities(
    viewerId,
    { userId: targetProfile.user_id, privacyMode },
    followsRows,
  );

  const [{ count: followerCount }, { count: followingCount }] = await Promise.all([
    admin
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('related_user_id', targetProfile.user_id)
      .eq('relationship_type', 'follow')
      .eq('status', 'approved'),
    admin
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', targetProfile.user_id)
      .eq('relationship_type', 'follow')
      .eq('status', 'approved'),
  ]);

  if (!visibility.canViewFull) {
    if (visibility.reason === 'blocked') {
      if (blockState === 'viewer_blocked_target') {
        return blockedResponse({
          kind: 'blocked',
          username: targetProfile.username,
          isHouseAccount: targetProfile.is_house_account === true,
          joinedMonthYear: formatJoinedMonthYear(targetProfile.created_at as string),
        }, blockState);
      }

      return blockedResponse(null, blockState);
    }

    // Private, unapproved — return restricted payload
    const restricted: RestrictedProfilePayload = {
      kind: 'restricted',
      username: targetProfile.username,
      isHouseAccount: targetProfile.is_house_account === true,
      joinedMonthYear: formatJoinedMonthYear(targetProfile.created_at as string),
      followerCount: followerCount ?? 0,
      followingCount: followingCount ?? 0,
    };

    return NextResponse.json({
      visibility,
      relationship,
      blockState,
      capabilities,
      profile: restricted,
    } satisfies ProfileReadResponse);
  }

  // Full access — fetch progress summary and follower count in parallel
  const [{ data: progressRow }] = await Promise.all([
    admin
      .from('player_progress')
      .select('birds_identified, seeds, best_streak, best_daily_streak, best_weekly_placement, first_place_count, second_place_count, third_place_count')
      .eq('user_id', targetProfile.user_id)
      .maybeSingle(),
  ]);

  const progress: ProfileProgressSummary = {
    birdsIdentified: progressRow?.birds_identified ?? 0,
    seeds: progressRow?.seeds ?? 0,
    bestStreak: progressRow?.best_streak ?? 0,
    bestDailyStreak: progressRow?.best_daily_streak ?? 0,
    bestWeeklyPlacement: progressRow?.best_weekly_placement ?? null,
    firstPlaceCount: progressRow?.first_place_count ?? 0,
    secondPlaceCount: progressRow?.second_place_count ?? 0,
    thirdPlaceCount: progressRow?.third_place_count ?? 0,
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
      isHouseAccount: targetProfile.is_house_account === true,
      joinedMonthYear,
      privacyMode,
      followerCount: followerCount ?? 0,
      followingCount: followingCount ?? 0,
      progress,
    };

    return NextResponse.json({
      visibility,
      relationship,
      blockState,
      capabilities,
      profile: payload,
    } satisfies ProfileReadResponse);
  }

  const payload: PublicProfilePayload = {
    kind: 'public',
    username: targetProfile.username,
    avatarPalette,
    avatarFakeBirdImageUrl,
    isHouseAccount: targetProfile.is_house_account === true,
    joinedMonthYear,
    progress,
    followerCount: followerCount ?? 0,
    followingCount: followingCount ?? 0,
  };

  return NextResponse.json({
    visibility,
    relationship,
    blockState,
    capabilities,
    profile: payload,
  } satisfies ProfileReadResponse);
}
