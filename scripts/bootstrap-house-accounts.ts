#!/usr/bin/env npx tsx
/**
 * House Account Bootstrap Script
 *
 * Creates (or repairs) the transparent bot profiles in Supabase.
 * Safe to re-run: existing accounts are skipped or patched in place.
 *
 * Required env vars:
 *   NEXT_PUBLIC_SUPABASE_URL      – Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY     – Service role secret key
 *
 * Usage:
 *   npx tsx scripts/bootstrap-house-accounts.ts
 *   npx tsx scripts/bootstrap-house-accounts.ts --dry-run
 */

import { createClient } from '@supabase/supabase-js';
import { houseAccountPersonas } from './lib/house-accounts.js';

const DRY_RUN = process.argv.includes('--dry-run') || process.env.DRY_RUN === 'true';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const PLACEHOLDER_EMAIL_DOMAIN = 'accounts.realfakebirds.invalid';

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

function buildPlaceholderEmail(slug: string): string {
  return `bot_${slug}@${PLACEHOLDER_EMAIL_DOMAIN}`;
}

async function main() {
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const results: Array<{ slug: string; status: 'created' | 'repaired' | 'skipped' | 'error'; detail?: string }> = [];

  for (const persona of houseAccountPersonas) {
    if (!persona.enabled) {
      results.push({ slug: persona.slug, status: 'skipped', detail: 'disabled' });
      continue;
    }

    try {
      // Check if profile already exists by username_canonical
      const { data: existingProfile } = await admin
        .from('profiles')
        .select('user_id, is_house_account')
        .eq('username_canonical', persona.slug)
        .maybeSingle();

      if (existingProfile) {
        // Account exists — patch is_house_account if needed
        if (existingProfile.is_house_account === true) {
          results.push({ slug: persona.slug, status: 'skipped', detail: 'already house account' });
          continue;
        }

        if (!DRY_RUN) {
          await admin
            .from('profiles')
            .update({ is_house_account: true })
            .eq('user_id', existingProfile.user_id);
        }

        results.push({ slug: persona.slug, status: 'repaired', detail: 'patched is_house_account=true' });
        continue;
      }

      // Create new account
      if (!DRY_RUN) {
        const email = buildPlaceholderEmail(persona.slug);

        const { data: authData, error: authError } = await admin.auth.admin.createUser({
          email,
          email_confirm: true,
          user_metadata: {
            requested_username: persona.slug,
            is_house_account: true,
          },
        });

        if (authError || !authData.user) {
          results.push({ slug: persona.slug, status: 'error', detail: authError?.message ?? 'no user returned' });
          continue;
        }

        const userId = authData.user.id;

        // Upsert profile with username and house account flag
        const { error: profileError } = await admin.from('profiles').upsert(
          {
            user_id: userId,
            username: persona.slug,
            username_canonical: persona.slug,
            avatar_palette: persona.avatarPalette,
            is_house_account: true,
          },
          { onConflict: 'user_id' }
        );

        if (profileError) {
          results.push({ slug: persona.slug, status: 'error', detail: profileError.message });
          continue;
        }

        // Ensure leaderboard_stats has username_canonical set
        await admin.from('leaderboard_stats').upsert(
          {
            user_id: userId,
            username_canonical: persona.slug,
          },
          { onConflict: 'user_id' }
        );
      }

      results.push({ slug: persona.slug, status: 'created' });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      results.push({ slug: persona.slug, status: 'error', detail: message });
    }
  }

  // Summary
  const label = DRY_RUN ? '[DRY RUN] ' : '';
  console.log(`\n${label}House Account Bootstrap Results\n${'─'.repeat(50)}`);
  const maxSlugLen = Math.max(...results.map((r) => r.slug.length));

  for (const result of results) {
    const icon = result.status === 'created' ? '✓' : result.status === 'repaired' ? '~' : result.status === 'skipped' ? '·' : '✗';
    const detail = result.detail ? `  (${result.detail})` : '';
    console.log(`  ${icon} ${result.slug.padEnd(maxSlugLen)}  ${result.status}${detail}`);
  }

  const created = results.filter((r) => r.status === 'created').length;
  const repaired = results.filter((r) => r.status === 'repaired').length;
  const errors = results.filter((r) => r.status === 'error').length;
  console.log(`\n  ${created} created, ${repaired} repaired, ${errors} errors\n`);

  if (errors > 0) {
    process.exit(1);
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
