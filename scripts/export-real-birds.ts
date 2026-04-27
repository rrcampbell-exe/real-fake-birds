#!/usr/bin/env npx tsx
/**
 * Export Real Birds
 *
 * Queries one or both Supabase environments for every distinct real bird in
 * public.bird_journal and writes catalog snapshots plus a merged seed list.
 *
 * Output files
 *   scripts/data/dev-birds.json   – preview/dev catalog  [{bird_key, bird_name}]
 *   scripts/data/prod-birds.json  – production catalog   [{bird_key, bird_name}]
 *   scripts/data/seed-birds.json  – merged string list   ["Bird Name", ...]
 *
 * Required env vars (per environment)
 *   DEV_SUPABASE_URL              – Supabase preview project URL
 *   DEV_SUPABASE_SERVICE_ROLE_KEY – Preview service role key
 *   PROD_SUPABASE_URL             – Supabase production project URL
 *   PROD_SUPABASE_SERVICE_ROLE_KEY – Production service role key
 *
 * Usage
 *   npx tsx scripts/export-real-birds.ts                    # both environments
 *   npx tsx scripts/export-real-birds.ts --env dev          # preview only
 *   npx tsx scripts/export-real-birds.ts --env prod         # production only
 *   npx tsx scripts/export-real-birds.ts --dry-run          # print counts, no writes
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import { slugifyBirdName } from '../src/lib/utils/slugify.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, 'data');

// ---------------------------------------------------------------------------
// Flags
// ---------------------------------------------------------------------------

const DRY_RUN = process.argv.includes('--dry-run');
const MERGE_ONLY = process.argv.includes('--merge-only');

const ENV_FLAG = (() => {
  if (MERGE_ONLY) return 'both';
  const index = process.argv.indexOf('--env');
  if (index === -1) return 'both';
  const value = process.argv[index + 1];
  if (value === 'dev' || value === 'prod' || value === 'both') return value;
  throw new Error(`Unknown --env value: "${value}". Expected dev | prod | both`);
})();

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RealBirdRow {
  bird_key: string;
  bird_name: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function log(msg: string) {
  console.log(`[export:real] ${msg}`);
}

function validateRow(row: RealBirdRow, envLabel: string): void {
  if (!row.bird_key.startsWith('real:')) {
    throw new Error(`[${envLabel}] Unexpected bird_key prefix: "${row.bird_key}" — expected "real:" prefix. Check query or is_real filter.`);
  }

  const expectedSlug = `real:${slugifyBirdName(row.bird_name)}`;
  if (row.bird_key !== expectedSlug) {
    // Warn but don't throw — the DB may have older/irregular slugs
    console.warn(`[export:real] [${envLabel}] bird_key "${row.bird_key}" does not match expected "${expectedSlug}" for "${row.bird_name}"`);
  }
}

async function queryEnv(label: string, supabaseUrl: string, serviceRoleKey: string): Promise<RealBirdRow[]> {
  const client = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await client
    .from('bird_journal')
    .select('bird_key, bird_name')
    .eq('is_real', true)
    .order('bird_name');

  if (error) {
    throw new Error(`[${label}] Supabase query failed: ${error.message}`);
  }

  if (!data || data.length === 0) {
    throw new Error(`[${label}] Query returned zero real birds — check credentials and is_real data`);
  }

  // Deduplicate by bird_key (same bird may appear in multiple journal rows)
  const seen = new Set<string>();
  const deduped: RealBirdRow[] = [];
  for (const row of data as RealBirdRow[]) {
    validateRow(row, label);
    if (!seen.has(row.bird_key)) {
      seen.add(row.bird_key);
      deduped.push(row);
    }
  }

  // Sort deterministically by bird_name
  deduped.sort((a, b) => a.bird_name.localeCompare(b.bird_name));

  log(`[${label}] Exported ${deduped.length} distinct real birds`);
  return deduped;
}

function writeJson(filePath: string, data: unknown): void {
  writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
  log(`Wrote ${filePath}`);
}

function loadExistingCatalog(filePath: string): RealBirdRow[] {
  if (!existsSync(filePath)) return [];
  return JSON.parse(readFileSync(filePath, 'utf-8')) as RealBirdRow[];
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const devUrl = process.env.DEV_SUPABASE_URL ?? '';
  const devKey = process.env.DEV_SUPABASE_SERVICE_ROLE_KEY ?? '';
  const prodUrl = process.env.PROD_SUPABASE_URL ?? '';
  const prodKey = process.env.PROD_SUPABASE_SERVICE_ROLE_KEY ?? '';

  if (MERGE_ONLY) {
    const devPath = join(DATA_DIR, 'dev-birds.json');
    const prodPath = join(DATA_DIR, 'prod-birds.json');
    if (!existsSync(devPath) && !existsSync(prodPath)) {
      throw new Error('--merge-only requires at least one of dev-birds.json or prod-birds.json to exist in scripts/data/');
    }
    const devRows = loadExistingCatalog(devPath);
    const prodRows = loadExistingCatalog(prodPath);
    const mergedMap = new Map<string, string>();
    for (const row of [...devRows, ...prodRows]) {
      if (!mergedMap.has(row.bird_key)) mergedMap.set(row.bird_key, row.bird_name);
    }
    const mergedNames = [...mergedMap.values()].sort((a, b) => a.localeCompare(b));
    log(`Merged ${mergedNames.length} distinct real birds from existing catalog files (dev: ${devRows.length}, prod: ${prodRows.length})`);
    if (!DRY_RUN) writeJson(join(DATA_DIR, 'seed-birds.json'), mergedNames);
    else log('Dry run — not writing seed-birds.json.');
    return;
  }

  if (ENV_FLAG === 'dev' || ENV_FLAG === 'both') {
    if (!devUrl || !devKey) {
      throw new Error('DEV_SUPABASE_URL and DEV_SUPABASE_SERVICE_ROLE_KEY are required for --env dev');
    }
  }

  if (ENV_FLAG === 'prod' || ENV_FLAG === 'both') {
    if (!prodUrl || !prodKey) {
      throw new Error('PROD_SUPABASE_URL and PROD_SUPABASE_SERVICE_ROLE_KEY are required for --env prod');
    }
  }

  let devRows: RealBirdRow[] = loadExistingCatalog(join(DATA_DIR, 'dev-birds.json'));
  let prodRows: RealBirdRow[] = loadExistingCatalog(join(DATA_DIR, 'prod-birds.json'));

  if (ENV_FLAG === 'dev' || ENV_FLAG === 'both') {
    devRows = await queryEnv('dev', devUrl, devKey);
  }

  if (ENV_FLAG === 'prod' || ENV_FLAG === 'both') {
    prodRows = await queryEnv('prod', prodUrl, prodKey);
  }

  // Merge by bird_key (union of both catalogs, sorted by name)
  const mergedMap = new Map<string, string>();
  for (const row of [...devRows, ...prodRows]) {
    if (!mergedMap.has(row.bird_key)) {
      mergedMap.set(row.bird_key, row.bird_name);
    }
  }

  const mergedNames = [...mergedMap.values()].sort((a, b) => a.localeCompare(b));

  log(`Merged catalog: ${mergedNames.length} distinct real birds (dev: ${devRows.length}, prod: ${prodRows.length})`);

  if (DRY_RUN) {
    log('Dry run — not writing files.');
    return;
  }

  if (ENV_FLAG === 'dev' || ENV_FLAG === 'both') {
    writeJson(join(DATA_DIR, 'dev-birds.json'), devRows);
  }

  if (ENV_FLAG === 'prod' || ENV_FLAG === 'both') {
    writeJson(join(DATA_DIR, 'prod-birds.json'), prodRows);
  }

  writeJson(join(DATA_DIR, 'seed-birds.json'), mergedNames);
}

void main().catch((error) => {
  console.error(`[export:real] ${error instanceof Error ? error.stack ?? error.message : String(error)}`);
  process.exitCode = 1;
});
