#!/usr/bin/env npx tsx

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { slugifyBirdName } from '../src/lib/utils/slugify';

const __dirname = dirname(fileURLToPath(import.meta.url));

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID ?? '';
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID ?? '';
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY ?? '';
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME ?? 'realfakebirds-cdn';
const R2_ENDPOINT = process.env.R2_ENDPOINT ?? `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY ?? '';
const OPENAI_MODERATION_MODEL = process.env.OPENAI_MODERATION_MODEL ?? 'omni-moderation-latest';
const OPENAI_IMAGE_REVIEW_MODEL = process.env.OPENAI_IMAGE_REVIEW_MODEL ?? 'gpt-4o-mini';
const CDN_BASE_URL = process.env.CDN_BASE_URL ?? 'https://cdn.realfakebirds.app';

const REQUIRED_R2_OBJECTS = ['fact.json', 'image.webp', 'thumb.webp', 'image-thumb.webp'] as const;
const REQUIRED_FACT_FIELDS = ['birdName', 'fact', 'summary', 'description'] as const;
const REPORT_PATH = join(__dirname, '.tmp', 'fake-bird-validation-report.json');
const DATA_PATH = join(__dirname, 'data', 'fake-birds.json');
const MODERATION_BATCH_SIZE = 12;
const VALIDATION_BATCH_SIZE = 40;
const LOCAL_PROFANITY_PATTERN = /\b(fuck|fucking|shit|bitch|asshole|bastard|cunt|motherfucker|slut|whore|nigger|faggot)\b/i;
const REFUSAL_PATTERNS = [
  /i'm sorry/i,
  /i can't help/i,
  /i cannot help/i,
  /i'm unable/i,
  /i cannot assist/i,
  /i can't assist/i,
  /as an ai/i,
  /i'm not able/i,
];
const MODERATION_MAX_RETRIES = 6;
const MODERATION_RETRY_BASE_MS = 1500;

const MODERATE_TEXT = process.argv.includes('--moderate-text') || process.argv.includes('--moderate');
const MODERATE_IMAGES = process.argv.includes('--moderate-images') || process.argv.includes('--moderate');

const LIMIT = (() => {
  const index = process.argv.indexOf('--limit');
  if (index === -1) {
    return undefined;
  }

  const raw = process.argv[index + 1];
  const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
})();

type R2ClientLike = {
  send: (command: unknown) => Promise<unknown>;
};

type RequiredFactField = (typeof REQUIRED_FACT_FIELDS)[number];

interface FakeBirdFactJson {
  birdName?: string;
  fact?: string;
  summary?: string;
  description?: string;
}

interface ExpectedBird {
  birdName: string;
  birdKey: string;
}

interface ValidationIssue {
  birdName: string;
  birdKey: string;
  type:
    | 'missing-assets'
    | 'invalid-fact-json'
    | 'field-mismatch'
    | 'unexpected-r2-prefix'
    | 'local-profanity'
    | 'refusal-text'
    | 'text-moderation'
    | 'image-moderation';
  message: string;
  field?: RequiredFactField;
  details?: unknown;
}

interface ValidatedBird {
  birdName: string;
  birdKey: string;
  factJson: Record<RequiredFactField, string>;
}

interface TextModerationCandidate {
  birdName: string;
  birdKey: string;
  field: RequiredFactField;
  text: string;
}

interface ModerationResult {
  flagged: boolean;
  categories?: Record<string, boolean>;
  category_scores?: Record<string, number>;
}

function log(message: string) {
  console.log(`[validate:fake] ${message}`);
}

function warn(message: string) {
  console.warn(`[validate:fake] ${message}`);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function assertEnv() {
  const missing = [
    ['R2_ACCOUNT_ID', R2_ACCOUNT_ID],
    ['R2_ACCESS_KEY_ID', R2_ACCESS_KEY_ID],
    ['R2_SECRET_ACCESS_KEY', R2_SECRET_ACCESS_KEY],
  ].filter(([, value]) => !value);

  if (missing.length > 0) {
    throw new Error(`Missing required env vars: ${missing.map(([name]) => name).join(', ')}`);
  }

  if ((MODERATE_TEXT || MODERATE_IMAGES) && !OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is required when running moderation checks');
  }
}

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

async function listAllObjectKeys(prefix: string): Promise<string[]> {
  const client = await getR2Client();
  const { ListObjectsV2Command } = await import('@aws-sdk/client-s3');
  const keys: string[] = [];
  let continuationToken: string | undefined;

  do {
    const response = await client.send(
      new ListObjectsV2Command({
        Bucket: R2_BUCKET_NAME,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      }),
    ) as { Contents?: Array<{ Key?: string }>; IsTruncated?: boolean; NextContinuationToken?: string };

    for (const item of response.Contents ?? []) {
      if (item.Key) {
        keys.push(item.Key);
      }
    }

    continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined;
  } while (continuationToken);

  return keys;
}

async function readObjectAsString(key: string): Promise<string> {
  const client = await getR2Client();
  const { GetObjectCommand } = await import('@aws-sdk/client-s3');
  const response = await client.send(
    new GetObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    }),
  ) as { Body?: { transformToString?: () => Promise<string> } };

  if (!response.Body?.transformToString) {
    throw new Error(`Unable to read object body for ${key}`);
  }

  return response.Body.transformToString();
}

async function moderateTextBatch(entries: TextModerationCandidate[]): Promise<ValidationIssue[]> {
  const issues: ValidationIssue[] = [];
  const totalBatches = Math.ceil(entries.length / MODERATION_BATCH_SIZE);

  for (let index = 0; index < entries.length; index += MODERATION_BATCH_SIZE) {
    const batch = entries.slice(index, index + MODERATION_BATCH_SIZE);
    const batchNumber = Math.floor(index / MODERATION_BATCH_SIZE) + 1;
    let payload: unknown;
    let response: Response | null = null;

    for (let attempt = 1; attempt <= MODERATION_MAX_RETRIES; attempt += 1) {
      response = await fetch('https://api.openai.com/v1/moderations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: OPENAI_MODERATION_MODEL,
          input: batch.map((entry) => entry.text),
        }),
      });

      payload = await response.json();
      if (response.ok) {
        break;
      }

      if (response.status !== 429 || attempt === MODERATION_MAX_RETRIES) {
        throw new Error(`OpenAI moderation error: ${response.status} ${JSON.stringify(payload)}`);
      }

      const retryAfterHeader = response.headers.get('retry-after');
      const retryAfterSeconds = retryAfterHeader ? Number.parseFloat(retryAfterHeader) : Number.NaN;
      const backoffMs = Number.isFinite(retryAfterSeconds)
        ? retryAfterSeconds * 1000
        : MODERATION_RETRY_BASE_MS * (2 ** (attempt - 1));

      warn(`Moderation rate limited on batch ${batchNumber}/${totalBatches}; retrying in ${Math.round(backoffMs)}ms (attempt ${attempt}/${MODERATION_MAX_RETRIES})`);
      await delay(backoffMs);
    }

    if (!response?.ok) {
      throw new Error(`OpenAI moderation error: unknown failure for batch starting at ${index}`);
    }

    const results = ((payload as { results?: ModerationResult[] }).results ?? []) as ModerationResult[];
    results.forEach((result, resultIndex) => {
      if (!result.flagged) {
        return;
      }

      const candidate = batch[resultIndex];
      const categories = Object.entries(result.categories ?? {})
        .filter(([, value]) => value)
        .map(([key]) => key);

      issues.push({
        birdName: candidate.birdName,
        birdKey: candidate.birdKey,
        field: candidate.field,
        type: 'text-moderation',
        message: `OpenAI moderation flagged ${candidate.field}${categories.length > 0 ? ` (${categories.join(', ')})` : ''}`,
        details: {
          text: candidate.text,
          categories: result.categories,
          categoryScores: result.category_scores,
        },
      });
    });

    if (batchNumber === 1 || batchNumber === totalBatches || batchNumber % 25 === 0) {
      log(`Moderated text batch ${batchNumber}/${totalBatches}`);
    }
  }

  return issues;
}

async function moderateImage(bird: ValidatedBird): Promise<ValidationIssue | null> {
  const imageUrl = `${CDN_BASE_URL}/birds/fake/${bird.birdKey}/image.webp`;
  let payload: unknown;
  let response: Response | null = null;

  for (let attempt = 1; attempt <= MODERATION_MAX_RETRIES; attempt += 1) {
    response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: OPENAI_IMAGE_REVIEW_MODEL,
        temperature: 0,
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'image_safety_review',
            schema: {
              type: 'object',
              additionalProperties: false,
              properties: {
                safe: { type: 'boolean' },
                categories: { type: 'array', items: { type: 'string' } },
                reason: { type: 'string' },
              },
              required: ['safe', 'categories', 'reason'],
            },
          },
        },
        messages: [
          {
            role: 'system',
            content: 'You review bird artwork for safety. Flag only if the image appears offensive, sexual, hateful, violent, gory, self-harm related, or otherwise unsafe for a general audience wildlife game.',
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Review this fake bird image for "${bird.birdName}". Return whether it is safe for a family-friendly wildlife game.`,
              },
              {
                type: 'image_url',
                image_url: { url: imageUrl },
              },
            ],
          },
        ],
      }),
    });

    payload = await response.json();
    if (response.ok) {
      break;
    }

    if (response.status !== 429 || attempt === MODERATION_MAX_RETRIES) {
      throw new Error(`OpenAI image moderation error: ${response.status} ${JSON.stringify(payload)}`);
    }

    const retryAfterHeader = response.headers.get('retry-after');
    const retryAfterSeconds = retryAfterHeader ? Number.parseFloat(retryAfterHeader) : Number.NaN;
    const backoffMs = Number.isFinite(retryAfterSeconds)
      ? retryAfterSeconds * 1000
      : MODERATION_RETRY_BASE_MS * (2 ** (attempt - 1));

    warn(`Image moderation rate limited for ${bird.birdName}; retrying in ${Math.round(backoffMs)}ms (attempt ${attempt}/${MODERATION_MAX_RETRIES})`);
    await delay(backoffMs);
  }

  if (!response?.ok) {
    throw new Error(`OpenAI image moderation error: unknown failure for ${bird.birdName}`);
  }

  const content = (payload as { choices?: Array<{ message?: { content?: string } }> }).choices?.[0]?.message?.content;
  if (typeof content !== 'string') {
    throw new Error(`Missing image moderation response content for ${bird.birdName}`);
  }

  const parsed = JSON.parse(content) as { safe: boolean; categories: string[]; reason: string };
  if (parsed.safe) {
    return null;
  }

  return {
    birdName: bird.birdName,
    birdKey: bird.birdKey,
    type: 'image-moderation',
    message: parsed.reason,
    details: {
      categories: parsed.categories,
      imageUrl,
    },
  };
}

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.replace(/\s+/g, ' ').trim();
  return normalized.length > 0 ? normalized : null;
}

function loadExpectedBirds(): ExpectedBird[] {
  const birdNames = JSON.parse(readFileSync(DATA_PATH, 'utf-8')) as string[];
  const expected = birdNames.map((birdName) => ({
    birdName,
    birdKey: slugifyBirdName(birdName),
  }));

  return LIMIT ? expected.slice(0, LIMIT) : expected;
}

function buildObjectMap(keys: string[]): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();

  for (const key of keys) {
    const match = key.match(/^birds\/fake\/([^/]+)\/(.+)$/);
    if (!match) {
      continue;
    }

    const [, birdKey, fileName] = match;
    const files = map.get(birdKey) ?? new Set<string>();
    files.add(fileName);
    map.set(birdKey, files);
  }

  return map;
}

async function validateExpectedBird(
  expectedBird: ExpectedBird,
  objectMap: Map<string, Set<string>>,
): Promise<{ validatedBird?: ValidatedBird; issues: ValidationIssue[] }> {
  const files = objectMap.get(expectedBird.birdKey);

  if (!files) {
    return {
      issues: [{
        birdName: expectedBird.birdName,
        birdKey: expectedBird.birdKey,
        type: 'missing-assets',
        message: 'Missing all CDN assets for bird',
      }],
    };
  }

  const missingFiles = REQUIRED_R2_OBJECTS.filter((fileName) => !files.has(fileName));
  if (missingFiles.length > 0) {
    return {
      issues: [{
        birdName: expectedBird.birdName,
        birdKey: expectedBird.birdKey,
        type: 'missing-assets',
        message: `Missing required CDN objects: ${missingFiles.join(', ')}`,
      }],
    };
  }

  let factJson: FakeBirdFactJson;
  try {
    factJson = JSON.parse(await readObjectAsString(`birds/fake/${expectedBird.birdKey}/fact.json`)) as FakeBirdFactJson;
  } catch (error) {
    return {
      issues: [{
        birdName: expectedBird.birdName,
        birdKey: expectedBird.birdKey,
        type: 'invalid-fact-json',
        message: `Unable to read fact.json: ${error instanceof Error ? error.message : String(error)}`,
      }],
    };
  }

  const normalizedFactJson = {} as Record<RequiredFactField, string>;
  const issues: ValidationIssue[] = [];

  for (const field of REQUIRED_FACT_FIELDS) {
    const value = asNonEmptyString(factJson[field]);
    if (!value) {
      issues.push({
        birdName: expectedBird.birdName,
        birdKey: expectedBird.birdKey,
        field,
        type: 'invalid-fact-json',
        message: `Missing or empty ${field}`,
      });
      continue;
    }

    normalizedFactJson[field] = value;
  }

  if (issues.length > 0) {
    return { issues };
  }

  if (normalizedFactJson.birdName !== expectedBird.birdName) {
    return {
      issues: [{
        birdName: expectedBird.birdName,
        birdKey: expectedBird.birdKey,
        field: 'birdName',
        type: 'field-mismatch',
        message: `fact.json birdName mismatch: expected "${expectedBird.birdName}", got "${normalizedFactJson.birdName}"`,
      }],
    };
  }

  return {
    validatedBird: {
      birdName: expectedBird.birdName,
      birdKey: expectedBird.birdKey,
      factJson: normalizedFactJson,
    },
    issues: [],
  };
}

async function main() {
  assertEnv();

  const expectedBirds = loadExpectedBirds();
  const allKeys = await listAllObjectKeys('birds/fake/');
  const objectMap = buildObjectMap(allKeys);

  const completenessIssues: ValidationIssue[] = [];
  const validatedBirds: ValidatedBird[] = [];

  for (let index = 0; index < expectedBirds.length; index += VALIDATION_BATCH_SIZE) {
    const batch = expectedBirds.slice(index, index + VALIDATION_BATCH_SIZE);
    const batchResults = await Promise.all(batch.map((expectedBird) => validateExpectedBird(expectedBird, objectMap)));

    for (const result of batchResults) {
      completenessIssues.push(...result.issues);
      if (result.validatedBird) {
        validatedBirds.push(result.validatedBird);
      }
    }
  }

  if (LIMIT === undefined) {
    for (const birdKey of objectMap.keys()) {
      if (expectedBirds.some((bird) => bird.birdKey === birdKey)) {
        continue;
      }

      completenessIssues.push({
        birdName: birdKey,
        birdKey,
        type: 'unexpected-r2-prefix',
        message: 'Found CDN assets not present in scripts/data/fake-birds.json',
      });
    }
  }

  const moderationIssues: ValidationIssue[] = [];

  if (MODERATE_TEXT) {
    const textCandidates: TextModerationCandidate[] = [];

    for (const bird of validatedBirds) {
      for (const field of REQUIRED_FACT_FIELDS) {
        const text = bird.factJson[field];
        if (LOCAL_PROFANITY_PATTERN.test(text)) {
          moderationIssues.push({
            birdName: bird.birdName,
            birdKey: bird.birdKey,
            field,
            type: 'local-profanity',
            message: `Local profanity filter flagged ${field}`,
          });
        }

        if (REFUSAL_PATTERNS.some((pattern) => pattern.test(text))) {
          moderationIssues.push({
            birdName: bird.birdName,
            birdKey: bird.birdKey,
            field,
            type: 'refusal-text',
            message: `Refusal-like text detected in ${field}`,
            details: { text },
          });
        }

        textCandidates.push({
          birdName: bird.birdName,
          birdKey: bird.birdKey,
          field,
          text,
        });
      }
    }

    moderationIssues.push(...await moderateTextBatch(textCandidates));
  }

  if (MODERATE_IMAGES) {
    for (const [index, bird] of validatedBirds.entries()) {
      const issue = await moderateImage(bird);
      if (issue) {
        moderationIssues.push(issue);
      }

      const imageNumber = index + 1;
      if (imageNumber === 1 || imageNumber === validatedBirds.length || imageNumber % 25 === 0) {
        log(`Moderated image ${imageNumber}/${validatedBirds.length}`);
      }
    }
  }

  mkdirSync(dirname(REPORT_PATH), { recursive: true });
  const report = {
    checkedAt: new Date().toISOString(),
    limit: LIMIT ?? null,
    moderateText: MODERATE_TEXT,
    moderateImages: MODERATE_IMAGES,
    expectedBirdCount: expectedBirds.length,
    validatedBirdCount: validatedBirds.length,
    completenessIssueCount: completenessIssues.length,
    moderationIssueCount: moderationIssues.length,
    completenessIssues,
    moderationIssues,
  };
  writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2) + '\n');

  log(`Checked ${expectedBirds.length} expected fake birds.`);
  log(`Validated complete records: ${validatedBirds.length}`);
  log(`Completeness issues: ${completenessIssues.length}`);
  log(`Moderation issues: ${moderationIssues.length}`);
  log(`Wrote report to ${REPORT_PATH}`);

  if (completenessIssues.length > 0) {
    warn(`First completeness issue: ${completenessIssues[0]?.message}`);
  }

  if (moderationIssues.length > 0) {
    warn(`First moderation issue: ${moderationIssues[0]?.message}`);
  }

  process.exitCode = completenessIssues.length > 0 || moderationIssues.length > 0 ? 1 : 0;
}

void main().catch((error) => {
  console.error(`[validate:fake] ${error instanceof Error ? error.stack ?? error.message : String(error)}`);
  process.exitCode = 1;
});