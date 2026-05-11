import { NextRequest, NextResponse } from 'next/server';
import { hasSupabaseEnv } from '@/lib/supabase/env';
import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase/server';
import {
  parseProfileReportInput,
  type ProfileReportReason,
} from '@/lib/server/profile-reports';
import { consumeRateLimit, getRateLimitKey } from '@/lib/server/rate-limiter';

const PROFILE_REPORT_WINDOW_MS = 60_000;
const PROFILE_REPORT_MAX_REQUESTS = 10;

type ReportProfileRequest = {
  targetUserId?: string;
  targetUsername?: string;
  reason?: ProfileReportReason;
  note?: string | null;
};

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

async function fetchTargetUserId(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  body: ReportProfileRequest,
): Promise<string | null> {
  if (typeof body.targetUserId === 'string' && body.targetUserId.trim()) {
    const { data } = await admin
      .from('profiles')
      .select('user_id')
      .eq('user_id', body.targetUserId)
      .maybeSingle<{ user_id: string }>();

    return data?.user_id ?? null;
  }

  if (typeof body.targetUsername !== 'string' || !body.targetUsername.trim()) {
    return null;
  }

  const normalizedUsername = body.targetUsername.trim().replace(/^@+/, '').toLowerCase();
  const { data, error } = await admin
    .from('profiles')
    .select('user_id')
    .eq('username_canonical', normalizedUsername)
    .maybeSingle<{ user_id: string }>();

  if (data?.user_id) {
    return data.user_id;
  }

  if (error && !isMissingSupabaseColumnError(error, 'username_canonical')) {
    return null;
  }

  const { data: fallback } = await admin
    .from('profiles')
    .select('user_id')
    .ilike('username', normalizedUsername)
    .maybeSingle<{ user_id: string }>();

  return fallback?.user_id ?? null;
}

function hasTargetIdentifier(body: ReportProfileRequest): boolean {
  return (
    (typeof body.targetUserId === 'string' && body.targetUserId.trim().length > 0)
    || (typeof body.targetUsername === 'string' && body.targetUsername.trim().length > 0)
  );
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!hasSupabaseEnv()) {
    return NextResponse.json({ error: 'service_unavailable' }, { status: 503 });
  }

  try {
    return await handleReportPost(request);
  } catch (error) {
    console.error('[report-profile] unhandled exception:', error);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}

async function handleReportPost(request: NextRequest): Promise<NextResponse> {
  const rateLimit = await consumeRateLimit(
    getRateLimitKey(getClientIp(request), 'profile-report'),
    PROFILE_REPORT_MAX_REQUESTS,
    PROFILE_REPORT_WINDOW_MS,
  );

  if (!rateLimit.allowed) {
    console.warn('[report-profile] rate limited request');
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_request_body' }, { status: 400 });
  }

  const parsedInput = parseProfileReportInput(body);
  if (!parsedInput) {
    return NextResponse.json({ error: 'invalid_request_body' }, { status: 400 });
  }

  const context = await getAuthenticatedRequestContext();
  if (!context) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();
  if (!hasTargetIdentifier(body as ReportProfileRequest)) {
    return NextResponse.json({ error: 'invalid_request_body' }, { status: 400 });
  }

  const targetUserId = await fetchTargetUserId(admin, body as ReportProfileRequest);
  if (!targetUserId) {
    return NextResponse.json({ error: 'target_not_found' }, { status: 404 });
  }

  if (context.userId === targetUserId) {
    return NextResponse.json({ error: 'cannot_self_action' }, { status: 400 });
  }

  const { error } = await admin.from('profile_reports').insert([
    {
      reporter_user_id: context.userId,
      reported_user_id: targetUserId,
      reason: parsedInput.reason,
      note: parsedInput.note,
    },
  ]);

  if (error) {
    console.error('[report-profile] database error:', error);
    return NextResponse.json({ error: 'database_error' }, { status: 500 });
  }

  console.info('[report-profile] submitted', {
    reporterUserId: context.userId,
    reportedUserId: targetUserId,
    reason: parsedInput.reason,
    hasNote: Boolean(parsedInput.note),
  });

  return NextResponse.json({ ok: true }, { status: 202 });
}
