import { NextRequest, NextResponse } from 'next/server';
import { hasSupabaseEnv } from '@/lib/supabase/env';
import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase/server';
import { consumeRateLimit, getRateLimitKey } from '@/lib/server/rate-limiter';
import { resolveProfileRelationshipAndCapabilities } from '@/lib/server/profile-visibility';
import type { FollowRow } from '@/types/profile';

const FOLLOW_ACTION_WINDOW_MS = 60_000;
const FOLLOW_ACTION_MAX_REQUESTS = 30;

type FollowRequest = {
  action: 'request' | 'approve' | 'deny' | 'unfollow';
  targetUserId?: string;
  targetUsername?: string;
};

function isFollowRequest(body: unknown): body is FollowRequest {
  if (typeof body !== 'object' || body === null) {
    return false;
  }

  const candidate = body as Record<string, unknown>;
  return (
    ['request', 'approve', 'deny', 'unfollow'].includes(candidate.action as string) &&
    (typeof candidate.targetUserId === 'string' || typeof candidate.targetUsername === 'string')
  );
}

function getClientIp(request: NextRequest): string | null {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim() ?? null;
  }

  return request.headers.get('x-real-ip');
}

async function getAuthenticatedRequestContext() {
  if (!hasSupabaseEnv()) {
    return null;
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user) {
      return null;
    }

    return {
      userId: data.user.id,
    };
  } catch {
    return null;
  }
}

async function fetchFollowsForUsers(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  userId: string,
  targetUserId: string,
): Promise<FollowRow[]> {
  const { data: follows } = await admin
    .from('follows')
    .select('user_id, related_user_id, relationship_type, status')
    .or(
      `and(user_id.eq.${userId},related_user_id.eq.${targetUserId}),` +
        `and(user_id.eq.${targetUserId},related_user_id.eq.${userId})`,
    );

  return (follows ?? []).map((row) => ({
    userId: row.user_id as string,
    relatedUserId: row.related_user_id as string,
    relationshipType: row.relationship_type as 'follow' | 'block',
    status: row.status as 'pending' | 'approved',
  }));
}

async function fetchTargetProfile(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  targetUserId: string,
) {
  const { data } = await admin
    .from('profiles')
    .select('user_id, privacy_mode')
    .eq('user_id', targetUserId)
    .maybeSingle<{ user_id: string; privacy_mode: 'public' | 'private' }>();

  return data;
}

async function fetchTargetProfileByUsername(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  targetUsername: string,
) {
  const { data } = await admin
    .from('profiles')
    .select('user_id, privacy_mode')
    .eq('username_canonical', targetUsername.toLowerCase())
    .maybeSingle<{ user_id: string; privacy_mode: 'public' | 'private' }>();

  return data;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!hasSupabaseEnv()) {
    return NextResponse.json({ error: 'service_unavailable' }, { status: 503 });
  }

  const rateLimit = await consumeRateLimit(
    getRateLimitKey(getClientIp(request), 'follow-action'),
    FOLLOW_ACTION_MAX_REQUESTS,
    FOLLOW_ACTION_WINDOW_MS,
  );

  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_request_body' }, { status: 400 });
  }

  if (!isFollowRequest(body)) {
    return NextResponse.json({ error: 'invalid_request_body' }, { status: 400 });
  }

  const context = await getAuthenticatedRequestContext();
  if (!context) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();
  const { action, targetUserId: inputTargetUserId, targetUsername } = body;
  const { userId } = context;

  // Resolve targetUserId from either ID or username
  let targetUserId = inputTargetUserId;
  if (!targetUserId && targetUsername) {
    const targetProfile = await fetchTargetProfileByUsername(admin, targetUsername);
    if (!targetProfile) {
      return NextResponse.json({ error: 'target_not_found' }, { status: 404 });
    }
    targetUserId = targetProfile.user_id;
  }

  if (!targetUserId) {
    return NextResponse.json({ error: 'invalid_request_body' }, { status: 400 });
  }

  // Prevent self-actions
  if (userId === targetUserId) {
    return NextResponse.json({ error: 'cannot_self_action' }, { status: 400 });
  }

  // Fetch target profile to check privacy mode
  const targetProfile = await fetchTargetProfile(admin, targetUserId);
  if (!targetProfile) {
    return NextResponse.json({ error: 'target_not_found' }, { status: 404 });
  }

  const privacyMode = targetProfile.privacy_mode;

  // Fetch existing follows/blocks
  const followsRows = await fetchFollowsForUsers(admin, userId, targetUserId);

  // Check for blocks (prevents any action)
  const isBlocked = followsRows.some(
    (row) =>
      row.relationshipType === 'block' &&
      (row.userId === userId || row.relatedUserId === userId),
  );

  if (isBlocked) {
    return NextResponse.json({ error: 'blocked' }, { status: 403 });
  }

  // Route to appropriate handler based on action
  if (action === 'request') {
    return handleFollowRequest(admin, userId, targetUserId, privacyMode, followsRows);
  } else if (action === 'approve') {
    return handleApproveFollow(admin, userId, targetUserId, followsRows);
  } else if (action === 'deny') {
    return handleDenyFollow(admin, userId, targetUserId, followsRows);
  } else if (action === 'unfollow') {
    return handleUnfollow(admin, userId, targetUserId, followsRows);
  }

  return NextResponse.json({ error: 'invalid_action' }, { status: 400 });
}

async function handleFollowRequest(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  userId: string,
  targetUserId: string,
  privacyMode: 'public' | 'private',
  existingFollows: FollowRow[],
) {
  // Check if already following or have pending request
  const existingFollow = existingFollows.find(
    (row) => row.relationshipType === 'follow' && row.userId === userId,
  );

  if (existingFollow) {
    if (existingFollow.status === 'approved') {
      return NextResponse.json({ error: 'already_following' }, { status: 409 });
    }
    if (existingFollow.status === 'pending') {
      return NextResponse.json({ error: 'request_already_sent' }, { status: 409 });
    }
  }

  // For public profiles, immediately approve. For private profiles, create pending request.
  const status = privacyMode === 'public' ? 'approved' : 'pending';

  const { error } = await admin.from('follows').insert([
    {
      user_id: userId,
      related_user_id: targetUserId,
      relationship_type: 'follow',
      status,
    },
  ]);

  if (error) {
    if (error.code === '23505') {
      // Unique constraint violation — likely duplicate; return success
      return NextResponse.json({
        ok: true,
        relationship: privacyMode === 'public' ? 'following' : 'requested',
      });
    }
    return NextResponse.json({ error: 'database_error' }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    relationship: privacyMode === 'public' ? 'following' : 'requested',
  });
}

async function handleApproveFollow(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  userId: string,
  targetUserId: string,
  existingFollows: FollowRow[],
) {
  // Find pending follow where userId is the target
  const pendingFollow = existingFollows.find(
    (row) =>
      row.relationshipType === 'follow' &&
      row.status === 'pending' &&
      row.userId === targetUserId &&
      row.relatedUserId === userId,
  );

  if (!pendingFollow) {
    return NextResponse.json({ error: 'no_pending_request' }, { status: 404 });
  }

  const { error } = await admin
    .from('follows')
    .update({ status: 'approved' })
    .eq('user_id', targetUserId)
    .eq('related_user_id', userId)
    .eq('relationship_type', 'follow');

  if (error) {
    return NextResponse.json({ error: 'database_error' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

async function handleDenyFollow(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  userId: string,
  targetUserId: string,
  existingFollows: FollowRow[],
) {
  // Find pending follow where userId is the target
  const pendingFollow = existingFollows.find(
    (row) =>
      row.relationshipType === 'follow' &&
      row.status === 'pending' &&
      row.userId === targetUserId &&
      row.relatedUserId === userId,
  );

  if (!pendingFollow) {
    return NextResponse.json({ error: 'no_pending_request' }, { status: 404 });
  }

  const { error } = await admin
    .from('follows')
    .delete()
    .eq('user_id', targetUserId)
    .eq('related_user_id', userId)
    .eq('relationship_type', 'follow');

  if (error) {
    return NextResponse.json({ error: 'database_error' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

async function handleUnfollow(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  userId: string,
  targetUserId: string,
  existingFollows: FollowRow[],
) {
  // Find approved follow where userId is the follower
  const approvedFollow = existingFollows.find(
    (row) =>
      row.relationshipType === 'follow' &&
      row.status === 'approved' &&
      row.userId === userId &&
      row.relatedUserId === targetUserId,
  );

  if (!approvedFollow) {
    return NextResponse.json({ error: 'not_following' }, { status: 404 });
  }

  const { error } = await admin
    .from('follows')
    .delete()
    .eq('user_id', userId)
    .eq('related_user_id', targetUserId)
    .eq('relationship_type', 'follow');

  if (error) {
    return NextResponse.json({ error: 'database_error' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
