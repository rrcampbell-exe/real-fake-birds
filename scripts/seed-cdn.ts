#!/usr/bin/env npx tsx
/**
 * CDN Seed Script
 *
 * Fetches Wikipedia images, converts to optimized WebP, generates AI facts,
 * and uploads everything to Cloudflare R2. Also produces a manifest file
 * that the app uses to know which birds have CDN assets.
 *
 * Required env vars:
 *   R2_ACCOUNT_ID       – Cloudflare account ID
 *   R2_ACCESS_KEY_ID    – R2 S3-compatible access key
 *   R2_SECRET_ACCESS_KEY – R2 S3-compatible secret key
 *   R2_BUCKET_NAME      – R2 bucket name (default: realfakebirds-cdn)
 *   OPENAI_API_KEY      – OpenAI API key for fact generation
 *
 * Optional env vars:
 *   R2_ENDPOINT         – Override the R2 S3 endpoint
 *   CDN_BASE_URL        – Public CDN URL (for verification, default: https://cdn.realfakebirds.app)
 *   OPENAI_FACT_MODEL   – Model to use for facts (default: gpt-4o)
 *   DRY_RUN             – Set to "true" to skip uploads
 *
 * Usage:
 *   npx tsx scripts/seed-cdn.ts
 *   npx tsx scripts/seed-cdn.ts --dry-run
 *   npx tsx scripts/seed-cdn.ts --bird "Blue Jay"
 *   npx tsx scripts/seed-cdn.ts --skip-existing
 *   npx tsx scripts/seed-cdn.ts --only-failed
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchBirdTaxonomyLookup, resolveSciName, type BirdTaxonomyLookup } from './lib/ebird-taxonomy';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID ?? '';
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID ?? '';
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY ?? '';
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME ?? 'realfakebirds-cdn';
const R2_ENDPOINT = process.env.R2_ENDPOINT ?? `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
const EBIRD_API_KEY = process.env.EBIRD_API_KEY ?? '';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY ?? '';
const OPENAI_FACT_MODEL = process.env.OPENAI_FACT_MODEL ?? 'gpt-4o';
const DRY_RUN = process.argv.includes('--dry-run') || process.env.DRY_RUN === 'true';
const SKIP_EXISTING = process.argv.includes('--skip-existing');
const ONLY_FAILED = process.argv.includes('--only-failed');

const DETAIL_WIDTH = 800;
const THUMB_WIDTH = 240;
const WEBP_QUALITY = 82;
const FACT_TEMPERATURE = 0.2;
const FACT_CACHE_CONTROL = 'public, max-age=86400';
const IMAGE_CACHE_CONTROL = 'public, max-age=31536000, immutable';
const REPORTS_DIR = join(__dirname, '.tmp', 'seed-cdn-runs');
const LAST_RUN_REPORT_PATH = join(__dirname, '.tmp', 'seed-cdn-last-run.json');
const REQUIRED_R2_OBJECTS = ['image.webp', 'thumb.webp', 'image-thumb.webp', 'fact.json'] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function log(msg: string) {
  console.log(`[seed] ${msg}`);
}

function warn(msg: string) {
  console.warn(`[seed] ⚠ ${msg}`);
}

function readJsonFile<T>(filePath: string, fallback: T): T {
  if (!existsSync(filePath)) {
    return fallback;
  }

  return JSON.parse(readFileSync(filePath, 'utf-8')) as T;
}

function getFlagValue(flagName: string): string | undefined {
  const index = process.argv.indexOf(flagName);
  if (index === -1) {
    return undefined;
  }

  return process.argv[index + 1];
}

function readExistingManifestKeys(): string[] {
  const manifestPath = join(__dirname, '..', 'src', 'lib', 'server', 'cdn-manifest.ts');

  if (!existsSync(manifestPath)) {
    return [];
  }

  const existing = readFileSync(manifestPath, 'utf-8');
  const keyMatches = existing.match(/'([^']+)'/g);

  return keyMatches
    ? keyMatches.map((key) => key.replace(/'/g, '')).filter((key) => key.length > 0 && !key.includes(' '))
    : [];
}

interface SeedRunReport {
  generatedAt: string;
  dryRun: boolean;
  options: {
    bird?: string;
    onlyFailed: boolean;
    skipExisting: boolean;
  };
  sourceReportPath?: string;
  birdsRequested: string[];
  summary: {
    seeded: number;
    skipped: number;
    failed: number;
  };
  results: SeedResult[];
}

function buildRunReportFileName(generatedAt: string): string {
  return `seed-cdn-run-${generatedAt.replace(/[:.]/g, '-')}.json`;
}

function writeRunReport(report: SeedRunReport): string {
  const reportPath = join(REPORTS_DIR, buildRunReportFileName(report.generatedAt));
  const reportJson = JSON.stringify(report, null, 2);

  writeFileSync(reportPath, reportJson, 'utf-8');
  writeFileSync(LAST_RUN_REPORT_PATH, reportJson, 'utf-8');

  return reportPath;
}

function findLatestFailedReport(): { path: string; report: SeedRunReport } | null {
  if (!existsSync(REPORTS_DIR)) {
    return null;
  }

  const reportFiles = readdirSync(REPORTS_DIR)
    .filter((fileName) => fileName.startsWith('seed-cdn-run-') && fileName.endsWith('.json'))
    .sort()
    .reverse();

  for (const fileName of reportFiles) {
    const reportPath = join(REPORTS_DIR, fileName);
    const report = readJsonFile<SeedRunReport | null>(reportPath, null);
    if (report?.summary.failed && report.summary.failed > 0) {
      return { path: reportPath, report };
    }
  }

  return null;
}

interface WikipediaOverride {
  wikipediaTitle?: string;
  searchQueries?: string[];
}

const WIKIPEDIA_OVERRIDES = readJsonFile<Record<string, WikipediaOverride>>(
  join(__dirname, 'data', 'wiki-overrides.json'),
  {}
);

// ---------------------------------------------------------------------------
// Wikipedia API
// ---------------------------------------------------------------------------

interface WikiSummary {
  title: string;
  extract?: string;
  description?: string;
  originalimage?: { source: string };
  thumbnail?: { source: string };
  content_urls?: { desktop?: { page?: string } };
}

interface WikiSearchResponse {
  query?: {
    search?: Array<{
      title?: string;
    }>;
  };
}

function hasSummaryData(summary: WikiSummary | null): boolean {
  return Boolean(
    summary?.extract?.trim()
      || summary?.description?.trim()
      || summary?.originalimage?.source?.trim()
      || summary?.thumbnail?.source?.trim()
      || summary?.content_urls?.desktop?.page?.trim()
  );
}

function getPreferredImageUrl(summary: WikiSummary | null): string | null {
  return summary?.originalimage?.source?.trim() || summary?.thumbnail?.source?.trim() || null;
}

async function fetchWikipediaSummary(title: string): Promise<WikiSummary | null> {
  const encoded = encodeURIComponent(title.replace(/\s+/g, '_'));
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encoded}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'RealFakeBirds-CDN-Seed/1.0 (https://realfakebirds.app)' },
  });
  if (!res.ok) return null;
  return res.json() as Promise<WikiSummary>;
}

async function searchWikipediaTitle(query: string): Promise<string | null> {
  const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'RealFakeBirds-CDN-Seed/1.0 (https://realfakebirds.app)' },
  });

  if (!res.ok) {
    return null;
  }

  const data = await res.json() as WikiSearchResponse;
  return data.query?.search?.[0]?.title?.trim() ?? null;
}

async function fetchBestWikipediaSummary(birdName: string): Promise<WikiSummary | null> {
  const override = WIKIPEDIA_OVERRIDES[birdName];
  const candidateTitles = [
    override?.wikipediaTitle,
    birdName,
    `${birdName} (bird)`,
  ].filter((candidate): candidate is string => Boolean(candidate?.trim()));

  const attemptedTitles = new Set<string>();

  for (const candidateTitle of candidateTitles) {
    const normalizedTitle = candidateTitle.toLowerCase();
    if (attemptedTitles.has(normalizedTitle)) {
      continue;
    }

    attemptedTitles.add(normalizedTitle);
    const summary = await fetchWikipediaSummary(candidateTitle);
    if (hasSummaryData(summary)) {
      return summary;
    }
  }

  const searchQueries = [
    ...(override?.searchQueries ?? []),
    birdName,
    `${birdName} bird`,
  ];

  for (const query of searchQueries) {
    const title = await searchWikipediaTitle(query);
    if (!title || attemptedTitles.has(title.toLowerCase())) {
      continue;
    }

    attemptedTitles.add(title.toLowerCase());
    const summary = await fetchWikipediaSummary(title);
    if (hasSummaryData(summary)) {
      return summary;
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Wikimedia Commons Attribution
// ---------------------------------------------------------------------------

interface ImageAttribution {
  artist?: string;
  license?: string;
  licenseUrl?: string;
}

async function fetchCommonsAttribution(imageUrl: string): Promise<ImageAttribution> {
  // Extract filename from URL
  const urlObj = new URL(imageUrl);
  const pathSegments = urlObj.pathname.split('/');
  const filename = decodeURIComponent(pathSegments[pathSegments.length - 1]);
  if (!filename) return {};

  const apiUrl = `https://commons.wikimedia.org/w/api.php?action=query&titles=File:${encodeURIComponent(filename)}&prop=imageinfo&iiprop=extmetadata&format=json`;
  try {
    const res = await fetch(apiUrl, {
      headers: { 'User-Agent': 'RealFakeBirds-CDN-Seed/1.0 (https://realfakebirds.app)' },
    });
    if (!res.ok) return {};

    const data = await res.json() as {
      query?: {
        pages?: Record<string, {
          imageinfo?: Array<{
            extmetadata?: Record<string, { value?: string }>;
          }>;
        }>;
      };
    };

    const pages = data.query?.pages;
    if (!pages) return {};

    const page = Object.values(pages)[0];
    const meta = page?.imageinfo?.[0]?.extmetadata;
    if (!meta) return {};

    // Strip HTML tags from artist field
    const rawArtist = meta.Artist?.value ?? '';
    const artist = rawArtist.replace(/<[^>]*>/g, '').trim();

    const license = meta.LicenseShortName?.value?.trim();
    const licenseUrl = meta.LicenseUrl?.value?.trim();

    return { artist: artist || undefined, license, licenseUrl };
  } catch {
    return {};
  }
}

// ---------------------------------------------------------------------------
// Image Processing (sharp)
// ---------------------------------------------------------------------------

async function processImage(
  imageUrl: string,
  width: number,
): Promise<Buffer> {
  // Dynamic import so the script fails fast with a clear message if sharp isn't installed
  const sharp = (await import('sharp')).default;

  const res = await fetch(imageUrl, {
    headers: { 'User-Agent': 'RealFakeBirds-CDN-Seed/1.0 (https://realfakebirds.app)' },
  });
  if (!res.ok) throw new Error(`Failed to fetch image: ${res.status} ${imageUrl}`);

  const buffer = Buffer.from(await res.arrayBuffer());
  return sharp(buffer)
    .resize({ width, withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer();
}

// ---------------------------------------------------------------------------
// OpenAI Fact Generation
// ---------------------------------------------------------------------------

interface GeneratedFact {
  fact: string;
  summary: string;
  description: string;
}

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function generateFallbackFactFromReference(birdName: string, wikiExtract: string): GeneratedFact {
  const sentences = splitSentences(wikiExtract);
  const fact = (sentences[0] ?? `${birdName} is a bird species documented in Wikipedia.`)
    .slice(0, 180)
    .trim();
  const summary = (sentences.slice(0, 3).join(' ') || `${birdName} is a documented bird species.`).trim();
  const description = (sentences[1] ?? sentences[0] ?? `${birdName} has a documented appearance in the Wikipedia reference.`).trim();

  return {
    fact,
    summary,
    description,
  };
}

function extractJsonObject(content: string): string {
  const trimmed = content.trim();

  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    return trimmed;
  }

  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }

  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }

  return trimmed;
}

async function generateFact(birdName: string, wikiExtract: string): Promise<GeneratedFact> {
  if (!OPENAI_API_KEY) {
    if (!DRY_RUN) {
      throw new Error('Missing OPENAI_API_KEY');
    }

    warn(`OPENAI_API_KEY is not set; using reference-derived fallback content for ${birdName}`);
    return generateFallbackFactFromReference(birdName, wikiExtract);
  }

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_FACT_MODEL,
      temperature: FACT_TEMPERATURE,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `You are an expert ornithologist writing educational bird content for a trivia game.
Base every statement only on the supplied reference text.
Prioritize factual accuracy, clarity, and specificity.
Do not add hype, opinion, jokes, anthropomorphism, or speculative details.
Paraphrase instead of copying the source.
Respond with valid JSON only.`,
        },
        {
          role: 'user',
          content: `Bird: ${birdName}

Wikipedia reference:
${wikiExtract}

Respond with this exact JSON structure:
{
  "fact": "One concise educational fact about this bird in a single sentence, max 180 characters",
  "summary": "A factual 2-3 sentence summary with no hype or filler",
  "description": "A short factual sentence describing the bird's appearance"
}`,
        },
      ],
    }),
  });

  if (!res.ok) {
    throw new Error(`OpenAI API error: ${res.status} ${await res.text()}`);
  }

  const data = await res.json() as {
    choices: Array<{ message: { content: string } }>;
  };

  const content = data.choices[0]?.message?.content;
  if (!content) throw new Error('Empty OpenAI response');

  return JSON.parse(extractJsonObject(content)) as GeneratedFact;
}

// ---------------------------------------------------------------------------
// R2 Upload (S3 compatible)
// ---------------------------------------------------------------------------

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

function isMissingR2ObjectError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const candidate = error as {
    name?: string;
    Code?: string;
    $metadata?: { httpStatusCode?: number };
  };

  return candidate.name === 'NotFound'
    || candidate.name === 'NoSuchKey'
    || candidate.Code === 'NotFound'
    || candidate.Code === 'NoSuchKey'
    || candidate.$metadata?.httpStatusCode === 404;
}

async function hasExistingR2Assets(prefix: string): Promise<boolean> {
  const client = await getR2Client();
  const { HeadObjectCommand } = await import('@aws-sdk/client-s3');

  const checks = await Promise.all(
    REQUIRED_R2_OBJECTS.map(async (fileName) => {
      try {
        await client.send(
          new HeadObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: `${prefix}/${fileName}`,
          }),
        );
        return true;
      } catch (error) {
        if (isMissingR2ObjectError(error)) {
          return false;
        }

        throw error;
      }
    }),
  );

  return checks.every(Boolean);
}

async function uploadToR2(
  key: string,
  body: Buffer | string,
  contentType: string,
  cacheControl: string,
): Promise<void> {
  if (DRY_RUN) {
    log(`  [dry-run] Would upload ${key} (${typeof body === 'string' ? body.length : body.byteLength} bytes)`);
    return;
  }

  const client = await getR2Client();
  const { PutObjectCommand } = await import('@aws-sdk/client-s3');

  await client.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: typeof body === 'string' ? Buffer.from(body) : body,
      ContentType: contentType,
      CacheControl: cacheControl,
    }),
  );
}

// ---------------------------------------------------------------------------
// Process a single bird
// ---------------------------------------------------------------------------

interface SeedResult {
  birdName: string;
  birdKey: string;
  status: 'seeded' | 'skipped' | 'failed';
  error?: string;
  skipReason?: string;
}

async function seedBird(birdName: string, taxonomyLookup: BirdTaxonomyLookup | null): Promise<SeedResult> {
  const birdKey = slugify(birdName);
  const prefix = `birds/real/${birdKey}`;

  try {
    if (SKIP_EXISTING) {
      log('  Checking for existing CDN assets...');
      const alreadySeeded = await hasExistingR2Assets(prefix);

      if (alreadySeeded) {
        return {
          birdName,
          birdKey,
          status: 'skipped',
          skipReason: 'assets already exist in R2',
        };
      }
    }

    // 1. Fetch Wikipedia summary
    log(`  Fetching Wikipedia summary...`);
    const wiki = await fetchBestWikipediaSummary(birdName);
    if (!wiki) throw new Error('Wikipedia summary not found');

    const originalImageUrl = getPreferredImageUrl(wiki);
    if (!originalImageUrl) throw new Error('No Wikipedia image found');

    // 2. Fetch attribution from Wikimedia Commons
    log(`  Fetching image attribution...`);
    const attribution = await fetchCommonsAttribution(originalImageUrl);

    // 3. Process images
    log(`  Processing detail image (${DETAIL_WIDTH}px)...`);
    const detailWebp = await processImage(originalImageUrl, DETAIL_WIDTH);
    log(`  Processing thumbnail (${THUMB_WIDTH}px)...`);
    const thumbWebp = await processImage(originalImageUrl, THUMB_WIDTH);

    log(`  Detail: ${(detailWebp.byteLength / 1024).toFixed(1)}KB, Thumb: ${(thumbWebp.byteLength / 1024).toFixed(1)}KB`);

    // 4. Generate AI fact
    log(`  Generating AI fact...`);
    const wikiExtract = wiki.extract ?? wiki.description ?? birdName;
    const generatedFact = await generateFact(birdName, wikiExtract);
    const sciName = taxonomyLookup ? resolveSciName(birdName, taxonomyLookup) : null;

    if (taxonomyLookup && !sciName) {
      warn(`Could not resolve scientific name for ${birdName} from eBird taxonomy`);
    }

    // 5. Build fact.json
    const factJson = {
      birdName,
      sciName: sciName ?? undefined,
      fact: generatedFact.fact,
      summary: generatedFact.summary,
      description: generatedFact.description,
      articleUrl: wiki.content_urls?.desktop?.page,
      wikipediaTitle: wiki.title,
      attribution,
    };

    // 6. Upload to R2
    log(`  Uploading to R2...`);
    await uploadToR2(`${prefix}/image.webp`, detailWebp, 'image/webp', IMAGE_CACHE_CONTROL);
    await uploadToR2(`${prefix}/thumb.webp`, thumbWebp, 'image/webp', IMAGE_CACHE_CONTROL);
    await uploadToR2(`${prefix}/image-thumb.webp`, thumbWebp, 'image/webp', IMAGE_CACHE_CONTROL);
    await uploadToR2(`${prefix}/fact.json`, JSON.stringify(factJson, null, 2), 'application/json', FACT_CACHE_CONTROL);

    return { birdName, birdKey, status: 'seeded' };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { birdName, birdKey, status: 'failed', error: message };
  }
}

// ---------------------------------------------------------------------------
// Manifest generation
// ---------------------------------------------------------------------------

function generateManifest(keys: string[]): void {
  const sorted = [...keys].sort();
  const code = `// Auto-generated by scripts/seed-cdn.ts — do not edit manually
const CDN_BIRD_KEYS: ReadonlySet<string> = new Set([
${sorted.map((k) => `  '${k}',`).join('\n')}
]);

export function hasCdnAssets(birdKey: string): boolean {
  return CDN_BIRD_KEYS.has(birdKey);
}

export function getCdnBirdKeys(): ReadonlySet<string> {
  return CDN_BIRD_KEYS;
}
`;

  const manifestPath = join(__dirname, '..', 'src', 'lib', 'server', 'cdn-manifest.ts');
  writeFileSync(manifestPath, code, 'utf-8');
  log(`Wrote manifest to src/lib/server/cdn-manifest.ts (${sorted.length} birds)`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  // Parse CLI args
  const singleBird = getFlagValue('--bird');

  if (process.argv.includes('--bird') && !singleBird) {
    console.error('Missing value for --bird.');
    process.exit(1);
  }

  if (singleBird && ONLY_FAILED) {
    console.error('Use either --bird or --only-failed, not both.');
    process.exit(1);
  }

  // Load bird list
  const birdsPath = join(__dirname, 'data', 'seed-birds.json');
  const allBirds: string[] = JSON.parse(readFileSync(birdsPath, 'utf-8'));
  let sourceReportPath: string | undefined;

  let birds = singleBird ? [singleBird] : allBirds;

  if (ONLY_FAILED) {
    const latestFailedReport = findLatestFailedReport();

    if (!latestFailedReport) {
      log('No prior failed seed report was found. Nothing to rerun.');
      return;
    }

    sourceReportPath = latestFailedReport.path;
    birds = latestFailedReport.report.results
      .filter((result) => result.status === 'failed')
      .map((result) => result.birdName);

    if (birds.length === 0) {
      log(`Latest failed report at ${sourceReportPath} does not contain any failed birds.`);
      return;
    }

    log(`Loaded ${birds.length} failed bird(s) from ${sourceReportPath}`);
  }

  // Validate env
  if (!DRY_RUN || SKIP_EXISTING) {
    if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
      console.error('Missing R2 credentials. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY.');
      process.exit(1);
    }
  }

  if (!OPENAI_API_KEY && !DRY_RUN) {
    console.error('Missing OPENAI_API_KEY.');
    process.exit(1);
  }

  let taxonomyLookup: BirdTaxonomyLookup | null = null;
  if (EBIRD_API_KEY) {
    log('Fetching eBird taxonomy lookup...');
    taxonomyLookup = await fetchBirdTaxonomyLookup(EBIRD_API_KEY);
  } else {
    warn('EBIRD_API_KEY is not set; future fact.json uploads will not include sciName.');
  }

  log(`Seeding ${birds.length} bird(s)${DRY_RUN ? ' (dry run)' : ''}${SKIP_EXISTING ? ' with skip-existing' : ''}${ONLY_FAILED ? ' from failed report' : ''}...`);
  log('');

  const results: SeedResult[] = [];

  for (const bird of birds) {
    log(`Processing: ${bird}`);
    const result = await seedBird(bird, taxonomyLookup);
    results.push(result);

    if (result.status === 'seeded') {
      log(`  ✓ Done`);
    } else if (result.status === 'skipped') {
      log(`  ↷ Skipped: ${result.skipReason}`);
    } else {
      warn(`  ✗ Failed: ${result.error}`);
    }
    log('');
  }

  const seededCount = results.filter((result) => result.status === 'seeded').length;
  const skippedCount = results.filter((result) => result.status === 'skipped').length;
  const failedCount = results.filter((result) => result.status === 'failed').length;

  const report: SeedRunReport = {
    generatedAt: new Date().toISOString(),
    dryRun: DRY_RUN,
    options: {
      bird: singleBird,
      onlyFailed: ONLY_FAILED,
      skipExisting: SKIP_EXISTING,
    },
    sourceReportPath,
    birdsRequested: birds,
    summary: {
      seeded: seededCount,
      skipped: skippedCount,
      failed: failedCount,
    },
    results,
  };

  const reportPath = writeRunReport(report);

  const availableKeys = results
    .filter((result) => result.status === 'seeded' || result.status === 'skipped')
    .map((result) => result.birdKey);

  if (DRY_RUN) {
    log('Skipped manifest update during dry run.');
  } else if (availableKeys.length > 0) {
    const merged = [...new Set([...readExistingManifestKeys(), ...availableKeys])];
    generateManifest(merged);
  } else {
    log('Skipped manifest update because no CDN-backed birds were seeded or confirmed existing.');
  }

  log(`Wrote run report to ${reportPath}`);

  // Summary
  log('='.repeat(50));
  log(`Done! ${seededCount} seeded, ${skippedCount} skipped, ${failedCount} failed.`);

  if (failedCount > 0) {
    log('Failed birds:');
    for (const result of results.filter((candidate) => candidate.status === 'failed')) {
      log(`  - ${result.birdName}: ${result.error}`);
    }
    process.exit(1);
  }
}

// Ensure tmp dir exists for intermediate files
mkdirSync(join(__dirname, '.tmp'), { recursive: true });
mkdirSync(REPORTS_DIR, { recursive: true });

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
