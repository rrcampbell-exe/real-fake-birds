#!/usr/bin/env npx tsx
/**
 * House Account Daily Runner
 *
 * Simulates game activity for each enabled house account persona.
 * Intended to run once per day via GitHub Actions cron at 14:00 UTC.
 *
 * Required env vars:
 *   NEXT_PUBLIC_SUPABASE_URL      – Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY     – Service role secret key
 *
 * Usage:
 *   npx tsx scripts/run-house-accounts.ts
 *   npx tsx scripts/run-house-accounts.ts --dry-run
 */

import { createClient } from '@supabase/supabase-js';
import { houseAccountPersonas } from './lib/house-accounts.js';
import {
  getCurrentWeekStart,
  generateBotEvents,
  readBotCurrentState,
  applyBotProgressEvents,
} from './lib/runner-progress.js';

const DRY_RUN = process.argv.includes('--dry-run') || process.env.DRY_RUN === 'true';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

async function main() {
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const today = new Date().toISOString().slice(0, 10);
  const currentWeekStart = getCurrentWeekStart();
  const label = DRY_RUN ? '[DRY RUN] ' : '';

  console.log(`\n${label}House Account Daily Runner`);
  console.log(`  Date:       ${today}`);
  console.log(`  Week start: ${currentWeekStart}`);
  console.log(`  Bots:       ${houseAccountPersonas.filter((p) => p.enabled).length} enabled\n`);

  type BotResult = {
    slug: string;
    status: 'ran' | 'skipped' | 'no_account' | 'error';
    eventsGenerated: number;
    applied: number;
    eventSkipped: number;
    detail?: string;
  };

  const results: BotResult[] = [];

  for (const persona of houseAccountPersonas) {
    if (!persona.enabled) {
      results.push({ slug: persona.slug, status: 'skipped', eventsGenerated: 0, applied: 0, eventSkipped: 0, detail: 'disabled' });
      continue;
    }

    try {
      // Look up the user_id from the profile
      const { data: profile } = await admin
        .from('profiles')
        .select('user_id')
        .eq('username_canonical', persona.slug)
        .eq('is_house_account', true)
        .maybeSingle();

      if (!profile?.user_id) {
        results.push({ slug: persona.slug, status: 'no_account', eventsGenerated: 0, applied: 0, eventSkipped: 0, detail: 'run bootstrap first' });
        continue;
      }

      const userId: string = profile.user_id;

      // Read current state from DB
      const currentState = await readBotCurrentState(admin, userId);

      // Generate events for today
      const events = generateBotEvents({
        persona,
        date: today,
        currentStreak: currentState.currentStreak,
        weeklySeenBirdKeys: new Set(currentState.weeklySeenBirdKeys),
      });

      if (events.length === 0) {
        results.push({ slug: persona.slug, status: 'skipped', eventsGenerated: 0, applied: 0, eventSkipped: 0, detail: 'not playing today' });
        continue;
      }

      // Apply events (or simulate in dry-run)
      const { applied, skipped: eventSkipped } = await applyBotProgressEvents({
        admin,
        userId,
        events,
        currentWeekStart,
        currentState,
        dryRun: DRY_RUN,
      });

      results.push({
        slug: persona.slug,
        status: 'ran',
        eventsGenerated: events.length,
        applied,
        eventSkipped,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      results.push({ slug: persona.slug, status: 'error', eventsGenerated: 0, applied: 0, eventSkipped: 0, detail: message });
    }
  }

  // Summary table
  console.log(`${label}Results\n${'─'.repeat(62)}`);
  const maxSlugLen = Math.max(...results.map((r) => r.slug.length));

  for (const result of results) {
    const icon = result.status === 'ran' ? '✓' : result.status === 'skipped' ? '·' : result.status === 'error' ? '✗' : '?';
    const countsStr = result.status === 'ran'
      ? `  ${result.applied} applied, ${result.eventSkipped} skipped`
      : result.detail ? `  (${result.detail})` : '';
    console.log(`  ${icon} ${result.slug.padEnd(maxSlugLen)}  ${result.status}${countsStr}`);
  }

  const ran = results.filter((r) => r.status === 'ran').length;
  const totalApplied = results.reduce((sum, r) => sum + r.applied, 0);
  const errors = results.filter((r) => r.status === 'error').length;
  const noAccount = results.filter((r) => r.status === 'no_account').length;

  console.log(`\n  ${ran} bots ran, ${totalApplied} total events applied, ${errors} errors`);

  if (noAccount > 0) {
    console.log(`  ⚠ ${noAccount} bot(s) have no account — run bootstrap-house-accounts.ts first`);
  }

  console.log('');

  if (errors > 0) {
    process.exit(1);
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
