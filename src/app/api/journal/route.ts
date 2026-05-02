import { NextRequest, NextResponse } from 'next/server';
import { hasSupabaseEnv } from '@/lib/supabase/env';
import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase/server';
import type { BirdJournalMetadata } from '@/types';

const PAGE_SIZE = 50;
const MAX_SEARCH_QUERY_LENGTH = 120;

function configErrorResponse() {
  return NextResponse.json({ error: 'supabase_not_configured' }, { status: 503 });
}

async function getAuthenticatedUserId(): Promise<string | null> {
  if (!hasSupabaseEnv()) {
    return null;
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      return null;
    }

    return data.user.id;
  } catch {
    return null;
  }
}

function normalizeBirdJournalMetadata(metadata: BirdJournalMetadata | null | undefined): BirdJournalMetadata {
  if (!metadata) {
    return {};
  }

  return {
    regionLabel: typeof metadata.regionLabel === 'string' ? metadata.regionLabel : undefined,
    sciName: typeof metadata.sciName === 'string' ? metadata.sciName : undefined,
    fact: typeof metadata.fact === 'string' ? metadata.fact : undefined,
    summary: typeof metadata.summary === 'string' ? metadata.summary : undefined,
    url: typeof metadata.url === 'string' ? metadata.url : undefined,
    articleUrl: typeof metadata.articleUrl === 'string' ? metadata.articleUrl : undefined,
    imageUrl: typeof metadata.imageUrl === 'string' ? metadata.imageUrl : undefined,
    description: typeof metadata.description === 'string' ? metadata.description : undefined,
    classificationRevealed: typeof metadata.classificationRevealed === 'boolean'
      ? metadata.classificationRevealed
      : undefined,
    imageRevealed: typeof metadata.imageRevealed === 'boolean'
      ? metadata.imageRevealed
      : undefined,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: Record<string, any>) {
  return {
    birdKey: row.bird_key as string,
    birdName: row.bird_name as string,
    isReal: row.is_real as boolean,
    seenCount: row.seen_count as number,
    correctCount: row.correct_count as number,
    incorrectCount: row.incorrect_count as number,
    lastSeenAt: row.last_seen_at as string,
    metadata: normalizeBirdJournalMetadata(row.metadata as BirdJournalMetadata),
  };
}

export async function GET(req: NextRequest) {
  if (!hasSupabaseEnv()) {
    return configErrorResponse();
  }

  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json({ error: 'not_authenticated' }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const action = searchParams.get('action');

  if (action === 'search') {
    const rawQuery = searchParams.get('q') ?? '';
    const query = rawQuery.slice(0, MAX_SEARCH_QUERY_LENGTH).trim();
    if (!query) {
      return NextResponse.json({ entries: [] });
    }

    try {
      const admin = createSupabaseAdminClient();
      const { data, error } = await admin
        .from('bird_journal')
        .select('bird_key, bird_name, is_real, seen_count, correct_count, incorrect_count, last_seen_at, metadata')
        .eq('user_id', userId)
        .ilike('bird_name', `%${query}%`)
        .order('last_seen_at', { ascending: false })
        .limit(PAGE_SIZE);

      if (error) {
        return NextResponse.json({ error: 'search_failed' }, { status: 500 });
      }

      return NextResponse.json({ entries: (data ?? []).map(mapRow) });
    } catch {
      return NextResponse.json({ error: 'search_failed' }, { status: 500 });
    }
  }

  if (action === 'browse') {
    const cursor = searchParams.get('cursor');
    const filter = searchParams.get('filter') as 'real' | 'fake' | null;

    try {
      const admin = createSupabaseAdminClient();
      let queryBuilder = admin
        .from('bird_journal')
        .select('bird_key, bird_name, is_real, seen_count, correct_count, incorrect_count, last_seen_at, metadata')
        .eq('user_id', userId);

      if (filter === 'real') {
        queryBuilder = queryBuilder.eq('is_real', true);
      } else if (filter === 'fake') {
        queryBuilder = queryBuilder.eq('is_real', false);
      }

      if (cursor) {
        queryBuilder = queryBuilder.lt('last_seen_at', cursor);
      }

      const { data, error } = await queryBuilder
        .order('last_seen_at', { ascending: false })
        .limit(PAGE_SIZE);

      if (error) {
        return NextResponse.json({ error: 'browse_failed' }, { status: 500 });
      }

      const entries = (data ?? []).map(mapRow);
      const nextCursor = entries.length === PAGE_SIZE ? entries[entries.length - 1].lastSeenAt : null;

      return NextResponse.json({ entries, nextCursor });
    } catch {
      return NextResponse.json({ error: 'browse_failed' }, { status: 500 });
    }
  }

  return NextResponse.json({ error: 'unknown_action' }, { status: 400 });
}
