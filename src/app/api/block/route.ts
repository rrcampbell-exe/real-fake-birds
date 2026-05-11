import { NextRequest, NextResponse } from 'next/server';
import { hasSupabaseEnv } from '@/lib/supabase/env';
import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase/server';
import { consumeRateLimit, getRateLimitKey } from '@/lib/server/rate-limiter';
import { createBlockRelationship, removeBlockRelationship } from '@/lib/server/social-relationships';

const BLOCK_ACTION_WINDOW_MS = 60_000;
const BLOCK_ACTION_MAX_REQUESTS = 20;

type BlockRequest = {
  action: 'block' | 'unblock';
  targetUserId?: string;
  targetUsername?: string;
};

function isBlockRequest(body: unknown): body is BlockRequest {
  if (!body || typeof body !== 'object') {
    return false;
  }

  const candidate = body as Record<string, unknown>;
  return (
    ['block', 'unblock'].includes(candidate.action as string)
    && (typeof candidate.targetUserId === 'string' || typeof candidate.targetUsername === 'string')
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

    return { userId: data.user.id };
  } catch {
    return null;
  }
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

async function fetchTargetProfileByUsername(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  targetUsername: string,
) {
  const normalizedUsername = targetUsername.trim().replace(/^@+/, '').toLowerCase();

  const { data, error } = await admin
    .from('profiles')
    .select('user_id')
    .eq('username_canonical', normalizedUsername)
    .maybeSingle<{ user_id: string }>();

  if (data?.user_id) {
    return data;
  }

  if (error && !isMissingSupabaseColumnError(error, 'username_canonical')) {
    return null;
  }

  const { data: fallback } = await admin
    .from('profiles')
    .select('user_id')
    .ilike('username', normalizedUsername)
    .maybeSingle<{ user_id: string }>();

  return fallback ?? null;
}

async function fetchTargetProfileByUserId(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  targetUserId: string,
) {
  const { data } = await admin
    .from('profiles')
    .select('user_id')
    .eq('user_id', targetUserId)
    .maybeSingle<{ user_id: string }>();

  return data ?? null;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!hasSupabaseEnv()) {
    return NextResponse.json({ error: 'service_unavailable' }, { status: 503 });
  }

  try {
    return await handleBlockPost(request);
  } catch (err) {
    console.error('[block] unhandled exception:', err);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}

async function handleBlockPost(request: NextRequest): Promise<NextResponse> {
  const rateLimit = await consumeRateLimit(
    getRateLimitKey(getClientIp(request), 'block-action'),
    BLOCK_ACTION_MAX_REQUESTS,
    BLOCK_ACTION_WINDOW_MS,
  );

  if (!rateLimit.allowed) {
    console.warn('[block] rate limited request');
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_request_body' }, { status: 400 });
  }

  if (!isBlockRequest(body)) {
    return NextResponse.json({ error: 'invalid_request_body' }, { status: 400 });
  }

  const context = await getAuthenticatedRequestContext();
  if (!context) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();
  const { action, targetUserId: inputTargetUserId, targetUsername } = body;
  const { userId } = context;

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

  if (userId === targetUserId) {
    return NextResponse.json({ error: 'cannot_self_action' }, { status: 400 });
  }

  const targetProfile = await fetchTargetProfileByUserId(admin, targetUserId);
  if (!targetProfile) {
    return NextResponse.json({ error: 'target_not_found' }, { status: 404 });
  }

  try {
    if (action === 'block') {
      await createBlockRelationship(admin, userId, targetUserId);
      return NextResponse.json({ ok: true, relationship: 'blocked' });
    }

    await removeBlockRelationship(admin, userId, targetUserId);
    return NextResponse.json({ ok: true, relationship: 'none' });
  } catch (error) {
    console.error('[block] database error:', error);
    return NextResponse.json({ error: 'database_error' }, { status: 500 });
  }
}
