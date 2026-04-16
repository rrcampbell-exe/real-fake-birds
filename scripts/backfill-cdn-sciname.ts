#!/usr/bin/env npx tsx

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchBirdTaxonomyLookup, resolveSciName, type BirdTaxonomyLookup } from './lib/ebird-taxonomy';

const __dirname = dirname(fileURLToPath(import.meta.url));

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID ?? '';
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID ?? '';
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY ?? '';
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME ?? 'realfakebirds-cdn';
const R2_ENDPOINT = process.env.R2_ENDPOINT ?? `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
const EBIRD_API_KEY = process.env.EBIRD_API_KEY ?? '';
const DRY_RUN = process.argv.includes('--dry-run') || process.env.DRY_RUN === 'true';
const LAST_RUN_REPORT_PATH = join(__dirname, '.tmp', 'seed-cdn-last-run.json');
const REPORTS_DIR = join(__dirname, '.tmp', 'backfill-cdn-sciname-runs');
const FACT_CACHE_CONTROL = 'public, max-age=86400';

interface SeedRunReport {
  results?: Array<{
    birdName: string;
    status: 'seeded' | 'skipped' | 'failed';
  }>;
}

interface CdnFactRecord {
  birdName?: string;
  sciName?: string;
  [key: string]: unknown;
}

interface BackfillResult {
  birdName: string;
  birdKey: string;
  status: 'updated' | 'skipped' | 'failed';
  sciName?: string;
  skipReason?: string;
  error?: string;
}

interface BackfillRunReport {
  generatedAt: string;
  dryRun: boolean;
  reportPath?: string;
  birdsRequested: string[];
  summary: {
    updated: number;
    skipped: number;
    failed: number;
  };
  results: BackfillResult[];
}

function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function log(message: string): void {
  console.log(`[backfill-sciname] ${message}`);
}

function warn(message: string): void {
  console.warn(`[backfill-sciname] ⚠ ${message}`);
}

function getFlagValue(flagName: string): string | undefined {
  const index = process.argv.indexOf(flagName);
  if (index === -1) {
    return undefined;
  }

  return process.argv[index + 1];
}

function readJsonFile<T>(filePath: string, fallback: T): T {
  if (!existsSync(filePath)) {
    return fallback;
  }

  return JSON.parse(readFileSync(filePath, 'utf-8')) as T;
}

function buildRunReportFileName(generatedAt: string): string {
  return `backfill-cdn-sciname-run-${generatedAt.replace(/[:.]/g, '-')}.json`;
}

function writeRunReport(report: BackfillRunReport): string {
  const reportPath = join(REPORTS_DIR, buildRunReportFileName(report.generatedAt));
  writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');
  return reportPath;
}

function loadBirdsFromReport(reportPath: string): string[] {
  const report = readJsonFile<SeedRunReport | null>(reportPath, null);
  if (!report?.results?.length) {
    throw new Error(`No seed results found in ${reportPath}`);
  }

  const targetStatuses = new Set(['seeded', 'skipped']);
  const birds = report.results
    .filter((result) => targetStatuses.has(result.status))
    .map((result) => result.birdName);

  return [...new Set(birds)];
}

type R2ClientLike = {
  send: (command: unknown) => Promise<unknown>;
};

let r2ClientPromise: Promise<R2ClientLike> | null = null;

async function getR2Client(): Promise<R2ClientLike> {
  if (!r2ClientPromise) {
    r2ClientPromise = (async () => {
      const { S3Client } = await import('@aws-sdk/client-s3');
      return new S3Client({
        region: 'auto',
        endpoint: R2_ENDPOINT,
        credentials: {
          accessKeyId: R2_ACCESS_KEY_ID,
          secretAccessKey: R2_SECRET_ACCESS_KEY,
        },
      }) as R2ClientLike;
    })();
  }

  return r2ClientPromise;
}

async function bodyToString(body: unknown): Promise<string> {
  if (typeof body === 'string') {
    return body;
  }

  if (body instanceof Uint8Array) {
    return Buffer.from(body).toString('utf-8');
  }

  const transformable = body as { transformToString?: () => Promise<string> };
  if (typeof transformable?.transformToString === 'function') {
    return transformable.transformToString();
  }

  const iterable = body as AsyncIterable<Uint8Array | string>;
  if (iterable && typeof iterable[Symbol.asyncIterator] === 'function') {
    const chunks: Buffer[] = [];
    for await (const chunk of iterable) {
      chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : Buffer.from(chunk));
    }
    return Buffer.concat(chunks).toString('utf-8');
  }

  throw new Error('Unsupported R2 response body type');
}

async function readFactJson(key: string): Promise<CdnFactRecord> {
  const client = await getR2Client();
  const { GetObjectCommand } = await import('@aws-sdk/client-s3');
  const response = await client.send(
    new GetObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    }),
  ) as { Body?: unknown };

  if (!response.Body) {
    throw new Error('Missing fact.json body');
  }

  return JSON.parse(await bodyToString(response.Body)) as CdnFactRecord;
}

async function uploadFactJson(key: string, record: CdnFactRecord): Promise<void> {
  if (DRY_RUN) {
    log(`  [dry-run] Would update ${key}`);
    return;
  }

  const client = await getR2Client();
  const { PutObjectCommand } = await import('@aws-sdk/client-s3');
  await client.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: Buffer.from(JSON.stringify(record, null, 2)),
      ContentType: 'application/json',
      CacheControl: FACT_CACHE_CONTROL,
    }),
  );
}

async function backfillBird(birdName: string, lookup: BirdTaxonomyLookup): Promise<BackfillResult> {
  const birdKey = slugify(birdName);
  const factKey = `birds/real/${birdKey}/fact.json`;

  try {
    const existingRecord = await readFactJson(factKey);
    const sciName = resolveSciName(birdName, lookup);

    if (!sciName) {
      return {
        birdName,
        birdKey,
        status: 'failed',
        error: 'Scientific name not found in eBird taxonomy',
      };
    }

    if (existingRecord.sciName === sciName) {
      return {
        birdName,
        birdKey,
        status: 'skipped',
        sciName,
        skipReason: 'fact.json already contains matching sciName',
      };
    }

    await uploadFactJson(factKey, {
      ...existingRecord,
      sciName,
    });

    return {
      birdName,
      birdKey,
      status: 'updated',
      sciName,
    };
  } catch (error) {
    return {
      birdName,
      birdKey,
      status: 'failed',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function main(): Promise<void> {
  const singleBird = getFlagValue('--bird');
  const reportPath = getFlagValue('--report') ?? LAST_RUN_REPORT_PATH;

  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
    throw new Error('Missing R2 credentials. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY.');
  }

  if (!EBIRD_API_KEY) {
    throw new Error('Missing EBIRD_API_KEY.');
  }

  const birds = singleBird
    ? [singleBird]
    : loadBirdsFromReport(reportPath);

  log(`Preparing scientific-name backfill for ${birds.length} bird(s)${DRY_RUN ? ' (dry run)' : ''}...`);
  log('Fetching eBird taxonomy lookup...');
  const lookup = await fetchBirdTaxonomyLookup(EBIRD_API_KEY);

  const results: BackfillResult[] = [];

  for (const birdName of birds) {
    log(`Processing: ${birdName}`);
    const result = await backfillBird(birdName, lookup);
    results.push(result);

    if (result.status === 'updated') {
      log(`  ✓ ${result.sciName}`);
    } else if (result.status === 'skipped') {
      log(`  ↷ ${result.skipReason}`);
    } else {
      warn(`  ✗ Failed: ${result.error}`);
    }
  }

  const updated = results.filter((result) => result.status === 'updated').length;
  const skipped = results.filter((result) => result.status === 'skipped').length;
  const failed = results.filter((result) => result.status === 'failed').length;

  const runReportPath = writeRunReport({
    generatedAt: new Date().toISOString(),
    dryRun: DRY_RUN,
    reportPath: singleBird ? undefined : reportPath,
    birdsRequested: birds,
    summary: { updated, skipped, failed },
    results,
  });

  log('='.repeat(50));
  log(`Done! ${updated} updated, ${skipped} skipped, ${failed} failed.`);
  log(`Wrote run report to ${runReportPath}`);

  if (failed > 0) {
    process.exit(1);
  }
}

mkdirSync(REPORTS_DIR, { recursive: true });

main().catch((error) => {
  console.error(error);
  process.exit(1);
});