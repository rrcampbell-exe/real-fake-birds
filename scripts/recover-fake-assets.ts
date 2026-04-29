#!/usr/bin/env npx tsx

import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { slugifyBirdName } from '../src/lib/utils/slugify';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

type AssetName = 'image.webp' | 'thumb.webp' | 'image-thumb.webp' | 'fact.json';

interface AttemptResult {
  birdName: string;
  birdKey: string;
  asset: AssetName;
  url: string;
  ok: boolean;
  status?: number;
  bytes?: number;
  cfCacheStatus?: string | null;
  age?: string | null;
  etag?: string | null;
  restoredToR2?: boolean;
  restoreError?: string;
  error?: string;
  timestamp: string;
}

const __dirname = dirname(fileURLToPath(import.meta.url));

const DEFAULT_INPUT = join(__dirname, 'data', 'fake-birds.json');
const DEFAULT_OUTPUT = join(__dirname, '.tmp', 'recovered-fake-assets');
const FACT_CACHE_CONTROL = 'public, max-age=86400';
const IMAGE_CACHE_CONTROL = 'public, max-age=31536000, immutable';

const ASSETS: AssetName[] = ['image.webp', 'thumb.webp', 'image-thumb.webp', 'fact.json'];

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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function log(message: string): void {
  console.log(`[recover:fake-assets] ${message}`);
}

async function appendResult(path: string, result: AttemptResult): Promise<void> {
  const line = `${JSON.stringify(result)}\n`;
  await writeFile(path, line, { encoding: 'utf-8', flag: 'a' });
}

function ensureDir(path: string): void {
  mkdirSync(path, { recursive: true });
}

function loadBirdNames(inputPath: string): string[] {
  if (!existsSync(inputPath)) {
    throw new Error(`Bird list not found: ${inputPath}`);
  }

  const parsed = JSON.parse(readFileSync(inputPath, 'utf-8'));
  if (!Array.isArray(parsed)) {
    throw new Error(`Bird list must be a JSON array: ${inputPath}`);
  }

  const names = parsed.filter((entry): entry is string => typeof entry === 'string').map((name) => name.trim()).filter(Boolean);
  if (names.length === 0) {
    throw new Error(`Bird list is empty: ${inputPath}`);
  }

  return names;
}

function loadCompletedUrls(resultsPath: string): Set<string> {
  const completed = new Set<string>();
  if (!existsSync(resultsPath)) return completed;

  const contents = readFileSync(resultsPath, 'utf-8');
  if (!contents.trim()) return completed;

  for (const line of contents.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const parsed = JSON.parse(trimmed) as Partial<AttemptResult>;
      if (typeof parsed.url === 'string' && parsed.url.length > 0) {
        completed.add(parsed.url);
      }
    } catch {
      // Ignore malformed historical lines.
    }
  }

  return completed;
}

function writeProgress(path: string, progress: Record<string, unknown>): void {
  writeFileSync(path, `${JSON.stringify(progress, null, 2)}\n`, 'utf-8');
}

async function fetchWithRetries(url: string, retries: number, timeoutMs: number): Promise<Response> {
  let attempt = 0;
  let lastError: unknown;

  while (attempt <= retries) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if ((response.status === 429 || response.status >= 500) && attempt < retries) {
        const backoffMs = 500 * (2 ** attempt);
        await sleep(backoffMs);
        attempt += 1;
        continue;
      }

      return response;
    } catch (error) {
      clearTimeout(timeout);
      lastError = error;
      if (attempt >= retries) {
        throw error;
      }

      const backoffMs = 500 * (2 ** attempt);
      await sleep(backoffMs);
      attempt += 1;
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Unknown request failure');
}

function getAssetContentType(asset: AssetName): string {
  return asset === 'fact.json' ? 'application/json' : 'image/webp';
}

function getAssetCacheControl(asset: AssetName): string {
  return asset === 'fact.json' ? FACT_CACHE_CONTROL : IMAGE_CACHE_CONTROL;
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

      const backoffMs = 500 * (2 ** attempt);
      await sleep(backoffMs);
      attempt += 1;
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Unknown R2 upload failure');
}

async function main(): Promise<void> {
  if (hasFlag('--help')) {
    console.log(`\nUsage: npx tsx scripts/recover-fake-assets.ts [options]\n\nOptions:\n  --base-url <url>      CDN base URL. Defaults to CDN_BASE_URL env var.\n  --input <path>        Path to fake-birds.json. Default: scripts/data/fake-birds.json\n  --output <path>       Output directory for recovered files. Default: scripts/.tmp/recovered-fake-assets\n  --concurrency <n>     Parallel requests. Default: 8\n  --retries <n>         Retry count per URL on network/429/5xx and R2 upload errors. Default: 3\n  --timeout-ms <n>      Per-request timeout in milliseconds. Default: 12000\n  --retry-misses        Re-attempt URLs already recorded in results.ndjson\n  --limit <n>           Process only first N birds (for testing)\n  --restore-r2 <bool>   Restore recovered assets back to R2. Defaults to true when R2 creds exist.\n  --r2-bucket <name>    R2 bucket name (default from R2_BUCKET_NAME env or realfakebirds-cdn).\n  --r2-endpoint <url>   R2 endpoint (default from R2_ENDPOINT env or account-based endpoint).\n  --help                Show this help\n`);
    return;
  }

  const baseUrlRaw = getArgValue('--base-url') ?? process.env.CDN_BASE_URL;
  if (!baseUrlRaw) {
    throw new Error('Missing CDN base URL. Pass --base-url or set CDN_BASE_URL.');
  }

  const baseUrl = baseUrlRaw.replace(/\/$/, '');
  const inputPath = getArgValue('--input') ?? DEFAULT_INPUT;
  const outputDir = getArgValue('--output') ?? DEFAULT_OUTPUT;
  const concurrency = parseNumberArg('--concurrency', 8);
  const retries = parseNumberArg('--retries', 3);
  const timeoutMs = parseNumberArg('--timeout-ms', 12000);
  const limit = parseNumberArg('--limit', Number.MAX_SAFE_INTEGER);
  const retryMisses = hasFlag('--retry-misses');
  const r2AccountId = process.env.R2_ACCOUNT_ID ?? '';
  const r2AccessKeyId = process.env.R2_ACCESS_KEY_ID ?? '';
  const r2SecretAccessKey = process.env.R2_SECRET_ACCESS_KEY ?? '';
  const r2Bucket = getArgValue('--r2-bucket') ?? process.env.R2_BUCKET_NAME ?? 'realfakebirds-cdn';
  const r2Endpoint = getArgValue('--r2-endpoint') ?? process.env.R2_ENDPOINT ?? (r2AccountId ? `https://${r2AccountId}.r2.cloudflarestorage.com` : '');
  const hasR2Creds = Boolean(r2AccessKeyId && r2SecretAccessKey && r2Endpoint);
  const restoreArg = parseOptionalBooleanArg('--restore-r2');
  const shouldRestoreToR2 = restoreArg ?? hasR2Creds;

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
  const progressPath = join(outputDir, 'progress.json');

  const birdNames = loadBirdNames(inputPath).slice(0, limit);
  const completedUrls = retryMisses ? new Set<string>() : loadCompletedUrls(resultsPath);

  const tasks: Array<{ birdName: string; birdKey: string; asset: AssetName; url: string; outputPath: string }> = [];

  for (const birdName of birdNames) {
    const birdKey = slugifyBirdName(birdName);
    for (const asset of ASSETS) {
      const url = `${baseUrl}/birds/fake/${birdKey}/${asset}`;
      const outputPath = join(outputDir, 'birds', 'fake', birdKey, asset);

      if (!retryMisses && completedUrls.has(url)) {
        continue;
      }

      tasks.push({ birdName, birdKey, asset, url, outputPath });
    }
  }

  const totalTasks = tasks.length;

  log(`Base URL: ${baseUrl}`);
  log(`Birds loaded: ${birdNames.length}`);
  log(`Assets per bird: ${ASSETS.length}`);
  log(`Requests queued: ${totalTasks}`);
  log(`Output dir: ${outputDir}`);
  log(`Results log: ${resultsPath}`);
  log(`Progress file: ${progressPath}`);
  log(`Concurrency: ${concurrency}, Retries: ${retries}, Timeout: ${timeoutMs}ms`);
  log(`Restore to R2: ${shouldRestoreToR2 ? `enabled (bucket=${r2Bucket})` : 'disabled'}`);

  const stats = {
    startedAt: new Date().toISOString(),
    totalBirds: birdNames.length,
    totalRequests: totalTasks,
    attempted: 0,
    recovered: 0,
    misses: 0,
    failed: 0,
    bytesRecovered: 0,
    restoredToR2: 0,
    restoreFailed: 0,
    finishedAt: null as string | null,
  };

  let nextIndex = 0;
  let stop = false;

  const flushProgress = () => {
    writeProgress(progressPath, {
      ...stats,
      remaining: Math.max(0, totalTasks - stats.attempted),
      percentComplete: totalTasks === 0 ? 100 : Number(((stats.attempted / totalTasks) * 100).toFixed(2)),
      lastUpdatedAt: new Date().toISOString(),
    });
  };

  process.on('SIGINT', () => {
    stop = true;
    log('Received SIGINT, finishing in-flight requests and flushing progress.');
  });

  process.on('SIGTERM', () => {
    stop = true;
    log('Received SIGTERM, finishing in-flight requests and flushing progress.');
  });

  const worker = async () => {
    while (!stop) {
      const index = nextIndex;
      nextIndex += 1;

      if (index >= totalTasks) {
        return;
      }

      const task = tasks[index];
      const attemptStartedAt = new Date().toISOString();

      try {
        const response = await fetchWithRetries(task.url, retries, timeoutMs);

        if (response.ok) {
          const bytes = new Uint8Array(await response.arrayBuffer());
          ensureDir(dirname(task.outputPath));
          await writeFile(task.outputPath, bytes);

          stats.recovered += 1;
          stats.bytesRecovered += bytes.byteLength;

          let restoredToR2 = false;
          let restoreError: string | undefined;

          if (shouldRestoreToR2 && r2Client) {
            try {
              await uploadToR2WithRetries(
                r2Client,
                r2Bucket,
                `birds/fake/${task.birdKey}/${task.asset}`,
                bytes,
                getAssetContentType(task.asset),
                getAssetCacheControl(task.asset),
                retries,
              );
              restoredToR2 = true;
              stats.restoredToR2 += 1;
            } catch (error) {
              restoreError = error instanceof Error ? error.message : String(error);
              stats.restoreFailed += 1;
            }
          }

          await appendResult(resultsPath, {
            birdName: task.birdName,
            birdKey: task.birdKey,
            asset: task.asset,
            url: task.url,
            ok: true,
            status: response.status,
            bytes: bytes.byteLength,
            cfCacheStatus: response.headers.get('cf-cache-status'),
            age: response.headers.get('age'),
            etag: response.headers.get('etag'),
            restoredToR2,
            restoreError,
            timestamp: attemptStartedAt,
          });
        } else {
          stats.misses += 1;
          await appendResult(resultsPath, {
            birdName: task.birdName,
            birdKey: task.birdKey,
            asset: task.asset,
            url: task.url,
            ok: false,
            status: response.status,
            cfCacheStatus: response.headers.get('cf-cache-status'),
            age: response.headers.get('age'),
            etag: response.headers.get('etag'),
            timestamp: attemptStartedAt,
            error: `HTTP ${response.status}`,
          });
        }
      } catch (error) {
        stats.failed += 1;
        await appendResult(resultsPath, {
          birdName: task.birdName,
          birdKey: task.birdKey,
          asset: task.asset,
          url: task.url,
          ok: false,
          timestamp: attemptStartedAt,
          error: error instanceof Error ? error.message : String(error),
        });
      } finally {
        stats.attempted += 1;

        if (stats.attempted % 50 === 0 || stats.attempted === totalTasks) {
          flushProgress();
          log(`Progress ${stats.attempted}/${totalTasks} | recovered=${stats.recovered} misses=${stats.misses} failed=${stats.failed}`);
        }
      }
    }
  };

  if (totalTasks === 0) {
    log('No work to do. If you want to re-try prior misses, add --retry-misses.');
    flushProgress();
    return;
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));

  stats.finishedAt = new Date().toISOString();
  flushProgress();

  log('Run complete.');
  log(`Recovered assets: ${stats.recovered}`);
  log(`HTTP misses: ${stats.misses}`);
  log(`Request failures: ${stats.failed}`);
  log(`Recovered bytes: ${stats.bytesRecovered}`);
  log(`R2 restores succeeded: ${stats.restoredToR2}`);
  log(`R2 restores failed: ${stats.restoreFailed}`);
}

void main().catch((error) => {
  console.error(`[recover:fake-assets] ${error instanceof Error ? error.stack ?? error.message : String(error)}`);
  process.exitCode = 1;
});
