#!/usr/bin/env npx tsx
/**
 * Backfill Catbird Auto-Follow
 *
 * Ensures every existing prod user follows the catbird house account.
 * Safe to re-run: uses ON CONFLICT DO NOTHING so existing follows are untouched.
 *
 * Required env vars:
 *   NEXT_PUBLIC_SUPABASE_URL      – Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY     – Service role secret key
 *
 * Usage:
 *   npx tsx scripts/backfill-catbird-follow.ts             # live run
 *   npx tsx scripts/backfill-catbird-follow.ts --dry-run  # preview only
 */

import { createClient } from '@supabase/supabase-js';

const DRY_RUN = process.argv.includes('--dry-run') || process.env.DRY_RUN === 'true';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const BATCH_SIZE = 100;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function main() {
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);

  // Find catbird account
  const { data: catbirdProfile, error: catbirdError } = await admin
    .from('profiles')
    .select('user_id, username')
    .eq('username_canonical', 'catbird')
    .maybeSingle<{ user_id: string; username: string }>();

  if (catbirdError) {
    console.error('Error looking up catbird profile:', catbirdError.message);
    process.exit(1);
  }

  if (!catbirdProfile?.user_id) {
    console.error('catbird profile not found — is this a prod environment?');
    process.exit(1);
  }

  console.log(`Found catbird account: ${catbirdProfile.username} (${catbirdProfile.user_id})`);

  // Fetch all non-catbird user IDs from profiles
  let allUserIds: string[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await admin
      .from('profiles')
      .select('user_id')
      .neq('user_id', catbirdProfile.user_id)
      .range(from, from + BATCH_SIZE - 1);

    if (error) {
      console.error('Error fetching profiles:', error.message);
      process.exit(1);
    }

    if (!data || data.length === 0) break;

    allUserIds = allUserIds.concat((data as { user_id: string }[]).map((r) => r.user_id));
    from += BATCH_SIZE;

    if (data.length < BATCH_SIZE) break;
  }

  console.log(`Total users to process: ${allUserIds.length}`);

  if (DRY_RUN) {
    console.log('DRY RUN — no rows will be written.');
    return;
  }

  // Upsert follow rows in batches
  let inserted = 0;
  let failed = 0;

  for (let i = 0; i < allUserIds.length; i += BATCH_SIZE) {
    const batch = allUserIds.slice(i, i + BATCH_SIZE);
    const rows = batch.map((userId) => ({
      user_id: userId,
      related_user_id: catbirdProfile.user_id,
      relationship_type: 'follow',
      status: 'approved',
    }));

    const { error: upsertError } = await admin
      .from('follows')
      .upsert(rows, { onConflict: 'user_id,related_user_id,relationship_type' });

    if (upsertError) {
      console.error(`Batch ${i / BATCH_SIZE + 1} error:`, upsertError.message);
      failed += batch.length;
    } else {
      inserted += batch.length;
    }
  }

  console.log(`Done. Processed: ${inserted} succeeded, ${failed} failed.`);
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
