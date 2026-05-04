import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { finalizeExpiredWeeklyLeaderboards } from '@/lib/server/weekly-leaderboard-finalization';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const admin = createSupabaseAdminClient();
    const result = await finalizeExpiredWeeklyLeaderboards(admin);

    console.log('[cron/weekly-leaderboard-turnover] completed', result);

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error('[cron/weekly-leaderboard-turnover] unexpected error', error);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
