#!/usr/bin/env npx tsx

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { slugifyBirdName } from '../src/lib/utils/slugify';

type AssetName = 'fact.json' | 'thumb.webp' | 'image-thumb.webp';

interface RecoverResultLine {
  birdKey?: string;
  asset?: string;
  ok?: boolean;
}

interface SeedResult {
  birdKey?: string;
  factJson?: unknown;
}

interface UploadAttempt {
  birdKey: string;
  asset: AssetName;
  bytes: number;
  uploaded: boolean;
  error?: string;
  timestamp: string;
}

const __dirname = dirname(fileURLToPath(import.meta.url));

const THUMB_WIDTH = 240;
const WEBP_QUALITY = 82;
const FACT_CACHE_CONTROL = 'public, max-age=86400';
const IMAGE_CACHE_CONTROL = 'public, max-age=31536000, immutable';

const DEFAULT_BIRDS_INPUT = join(__dirname, 'data', 'fake-birds.json');
const DEFAULT_RECOVERED_DIR = join(__dirname, '.tmp', 'recovered-fake-assets');
const DEFAULT_REPORTS_DIR = join(__dirname, '.tmp', 'seed-cdn-runs');
const DEFAULT_OUTPUT_DIR = join(__dirname, '.tmp', 'backfill-fake-facts-and-thumbs');

function getArgValue(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  if (idx === -1) return undefined;
  const value = process.argv[idx + 1];
  if (!value || value.startsWith('--')) {
    throw new Error(`Missing value for ${flag}`);
  }
  return value;
}

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

function parseNumberArg(flag: string, fallback: number): number {
  const raw = getArgValue(flag);
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Invalid value for ${flag}: ${raw}`);
  }
  return parsed;
}

function parseOptionalBooleanArg(flag: string): boolean | undefined {
  const raw = getArgValue(flag);
  if (raw === undefined) return undefined;
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  throw new Error(`Invalid value for ${flag}: ${raw}. Use true or false.`);
}

function ensureDir(path: string): void {
  mkdirSync(path, { recursive: true });
}

function log(message: string): void {
  console.log(`[backfill:fake-assets] ${message}`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getAssetContentType(asset: AssetName): string {
  return asset === 'fact.json' ? 'application/json' : 'image/webp';
}

function getAssetCacheControl(asset: AssetName): string {
  return asset === 'fact.json' ? FACT_CACHE_CONTROL : IMAGE_CACHE_CONTROL;
}

function loadBirdKeys(path: string, limit: number): string[] {
  if (!existsSync(path)) {
    throw new Error(`Bird list not found: ${path}`);
  }

  const parsed = JSON.parse(readFileSync(path, 'utf-8'));
  if (!Array.isArray(parsed)) {
    throw new Error(`Bird list must be a JSON array: ${path}`);
  }

  return parsed
    .filter((entry): entry is string => typeof entry === 'string')
    .map((name) => slugifyBirdName(name.trim()))
    .filter(Boolean)
    .slice(0, limit);
}

function loadRecoveredAssetMap(resultsPath: string): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  if (!existsSync(resultsPath)) {
    throw new Error(`Recovered results not found: ${resultsPath}`);
  }

  const lines = readFileSync(resultsPath, 'utf-8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    let parsed: RecoverResultLine;
    try {
      parsed = JSON.parse(trimmed) as RecoverResultLine;
    } catch {
      continue;
    }

    if (!parsed.ok || !parsed.birdKey || !parsed.asset) continue;

    const set = map.get(parsed.birdKey) ?? new Set<string>();
    set.add(parsed.asset);
    map.set(parsed.birdKey, set);
  }

  return map;
}

function loadFactMap(reportsDir: string): Map<string, unknown> {
  const map = new Map<string, unknown>();
  if (!existsSync(reportsDir)) {
    throw new Error(`Seed reports directory not found: ${reportsDir}`);
  }

  const entries = readdirSync(reportsDir).filter((name) => name.endsWith('.json')).sort();

  for (const filename of entries) {
    const full = join(reportsDir, filename);
    let parsed: { results?: SeedResult[] };
    try {
      parsed = JSON.parse(readFileSync(full, 'utf-8')) as { results?: SeedResult[] };
    } catch {
      continue;
    }

    for (const result of parsed.results ?? []) {
      if (!result?.birdKey || !result.factJson) continue;
      map.set(result.birdKey, result.factJson);
    }
  }

  return map;
}

async function appendResult(path: string, result: UploadAttempt): Promise<void> {
  await writeFile(path, `${JSON.stringify(result)}\n`, { encoding: 'utf-8', flag: 'a' });
}

async function uploadToR2WithRetries(
  client: S3Client,
  bucket: string,
  key: string,
  body: Uint8Array,
  contentType: string,
  cacheControl: string,
  retries: number,
): Promise<void> {
  let attempt = 0;
  let lastError: unknown;

  while (attempt <= retries) {
    try {
      await client.send(new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        CacheControl: cacheControl,
      }));
      return;
    } catch (error) {
      lastError = error;
      if (attempt >= retries) {
        throw error;
      }
      await sleep(500 * (2 ** attempt));
      attempt += 1;
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Unknown upload error');
}

async function main(): Promise<void> {
  if (hasFlag('--help')) {
    console.log(`\nUsage: npx tsx scripts/backfill-fake-facts-and-thumbs.ts [options]\n\nOptions:\n  --birds <path>             Path to fake-birds.json\n  --recovered-dir <path>     Directory from recover-fake-assets output\n  --recovered-results <path> Path to recover results.ndjson\n  --reports-dir <path>       Directory of seed run reports\n  --output <path>            Output directory for generated artifacts and logs\n  --concurrency <n>          Parallel bird processing count (default: 6)\n  --retries <n>              R2 upload retry count (default: 3)\n  --limit <n>                Process first N birds from list\n  --restore-r2 <bool>        Upload generated assets to R2 (default: true if creds exist)\n  --r2-bucket <name>         R2 bucket name\n  --r2-endpoint <url>        R2 endpoint URL\n  --dry-run                  Build artifacts and report only, skip uploads\n  --help                     Show this help\n`);
    return;
  }

  const birdsPath = getArgValue('--birds') ?? DEFAULT_BIRDS_INPUT;
  const recoveredDir = getArgValue('--recovered-dir') ?? DEFAULT_RECOVERED_DIR;
  const recoveredResultsPath = getArgValue('--recovered-results') ?? join(recoveredDir, 'results.ndjson');
  const reportsDir = getArgValue('--reports-dir') ?? DEFAULT_REPORTS_DIR;
  const outputDir = getArgValue('--output') ?? DEFAULT_OUTPUT_DIR;
  const concurrency = parseNumberArg('--concurrency', 6);
  const retries = parseNumberArg('--retries', 3);
  const limit = parseNumberArg('--limit', Number.MAX_SAFE_INTEGER);
  const dryRun = hasFlag('--dry-run');

  const r2AccountId = process.env.R2_ACCOUNT_ID ?? '';
  const r2AccessKeyId = process.env.R2_ACCESS_KEY_ID ?? '';
  const r2SecretAccessKey = process.env.R2_SECRET_ACCESS_KEY ?? '';
  const r2Bucket = getArgValue('--r2-bucket') ?? process.env.R2_BUCKET_NAME ?? 'realfakebirds-cdn';
  const r2Endpoint = getArgValue('--r2-endpoint') ?? process.env.R2_ENDPOINT ?? (r2AccountId ? `https://${r2AccountId}.r2.cloudflarestorage.com` : '');
  const hasR2Creds = Boolean(r2AccessKeyId && r2SecretAccessKey && r2Endpoint);
  const restoreArg = parseOptionalBooleanArg('--restore-r2');
  const shouldRestoreToR2 = dryRun ? false : (restoreArg ?? hasR2Creds);

  if (shouldRestoreToR2 && !hasR2Creds) {
    throw new Error('R2 restore requested, but R2 credentials/endpoint are missing. Set R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_ACCOUNT_ID or R2_ENDPOINT.');
  }

  const r2Client = shouldRestoreToR2 ? new S3Client({
    region: 'auto',
    endpoint: r2Endpoint,
    credentials: {
      accessKeyId: r2AccessKeyId,
      secretAccessKey: r2SecretAccessKey,
    },
  }) : null;

  ensureDir(outputDir);
  const resultsPath = join(outputDir, 'results.ndjson');
  const summaryPath = join(outputDir, 'summary.json');

  const birdKeys = loadBirdKeys(birdsPath, limit);
  const recoveredAssets = loadRecoveredAssetMap(recoveredResultsPath);
  const reportFacts = loadFactMap(reportsDir);

  const candidates = birdKeys.filter((birdKey) => {
    const assets = recoveredAssets.get(birdKey);
    return Boolean(assets?.has('image.webp') && reportFacts.has(birdKey));
  });

  log(`Birds considered: ${birdKeys.length}`);
  log(`Recovered image candidates with report facts: ${candidates.length}`);
  log(`Recovered dir: ${recoveredDir}`);
  log(`Reports dir: ${reportsDir}`);
  log(`Restore to R2: ${shouldRestoreToR2 ? `enabled (bucket=${r2Bucket})` : 'disabled'}`);

  const stats = {
    startedAt: new Date().toISOString(),
    birdsConsidered: birdKeys.length,
    candidates: candidates.length,
    birdsProcessed: 0,
    birdsSkippedMissingImage: 0,
    birdsSkippedMissingFact: 0,
    birdsCompleted: 0,
    assetsUploaded: 0,
    uploadFailures: 0,
    bytesPrepared: 0,
    finishedAt: null as string | null,
  };

  let nextIndex = 0;

  const worker = async (): Promise<void> => {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= candidates.length) return;

      const birdKey = candidates[index];
      stats.birdsProcessed += 1;

      const imagePath = join(recoveredDir, 'birds', 'fake', birdKey, 'image.webp');
      if (!existsSync(imagePath)) {
        stats.birdsSkippedMissingImage += 1;
        continue;
      }

      const factJson = reportFacts.get(birdKey);
      if (!factJson) {
        stats.birdsSkippedMissingFact += 1;
        continue;
      }

      const imageBytes = readFileSync(imagePath);
      const generatedThumb = await sharp(imageBytes)
        .resize({ width: THUMB_WIDTH, withoutEnlargement: true })
        .webp({ quality: WEBP_QUALITY })
        .toBuffer();

      const factBytes = Buffer.from(`${JSON.stringify(factJson, null, 2)}\n`, 'utf-8');
      const thumbBytes = generatedThumb;
      const imageThumbBytes = generatedThumb;

      const localBirdDir = join(outputDir, 'birds', 'fake', birdKey);
      ensureDir(localBirdDir);

      writeFileSync(join(localBirdDir, 'fact.json'), factBytes);
      writeFileSync(join(localBirdDir, 'thumb.webp'), thumbBytes);
      writeFileSync(join(localBirdDir, 'image-thumb.webp'), imageThumbBytes);

      stats.bytesPrepared += factBytes.byteLength + thumbBytes.byteLength + imageThumbBytes.byteLength;

      if (shouldRestoreToR2 && r2Client) {
        const uploads: Array<{ asset: AssetName; body: Uint8Array }> = [
          { asset: 'fact.json', body: factBytes },
          { asset: 'thumb.webp', body: thumbBytes },
          { asset: 'image-thumb.webp', body: imageThumbBytes },
        ];

        for (const item of uploads) {
          const key = `birds/fake/${birdKey}/${item.asset}`;
          try {
            await uploadToR2WithRetries(
              r2Client,
              r2Bucket,
              key,
              item.body,
              getAssetContentType(item.asset),
              getAssetCacheControl(item.asset),
              retries,
            );

            stats.assetsUploaded += 1;
            await appendResult(resultsPath, {
              birdKey,
              asset: item.asset,
              bytes: item.body.byteLength,
              uploaded: true,
              timestamp: new Date().toISOString(),
            });
          } catch (error) {
            stats.uploadFailures += 1;
            await appendResult(resultsPath, {
              birdKey,
              asset: item.asset,
              bytes: item.body.byteLength,
              uploaded: false,
              error: error instanceof Error ? error.message : String(error),
              timestamp: new Date().toISOString(),
            });
          }
        }
      }

      stats.birdsCompleted += 1;
    }
  };

  const workers = Array.from({ length: Math.max(1, concurrency) }, () => worker());
  await Promise.all(workers);

  stats.finishedAt = new Date().toISOString();
  writeFileSync(summaryPath, `${JSON.stringify(stats, null, 2)}\n`, 'utf-8');

  log(`Done. Completed birds: ${stats.birdsCompleted}/${stats.candidates}`);
  log(`Assets uploaded: ${stats.assetsUploaded}, upload failures: ${stats.uploadFailures}`);
  log(`Summary: ${summaryPath}`);
  if (shouldRestoreToR2) {
    log(`Upload log: ${resultsPath}`);
  }
}

main().catch((error) => {
  console.error(`[backfill:fake-assets] ERROR: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
