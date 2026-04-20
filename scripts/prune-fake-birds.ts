#!/usr/bin/env npx tsx

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DeleteObjectsCommand, ListObjectsV2Command, S3Client } from '@aws-sdk/client-s3';
import { slugifyBirdName } from '../src/lib/utils/slugify';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_PATH = join(__dirname, 'data', 'fake-birds.json');
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID ?? '';
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID ?? '';
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY ?? '';
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME ?? 'realfakebirds-cdn';
const R2_ENDPOINT = process.env.R2_ENDPOINT ?? `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
const APPLY = process.argv.includes('--apply');

function log(message: string) {
  console.log(`[prune:fake] ${message}`);
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
}

function loadExpectedBirdKeys(): Set<string> {
  const birdNames = JSON.parse(readFileSync(DATA_PATH, 'utf-8')) as string[];
  return new Set(birdNames.map((birdName) => slugifyBirdName(birdName)));
}

function getR2Client(): S3Client {
  return new S3Client({
    region: 'auto',
    endpoint: R2_ENDPOINT,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
  });
}

async function listAllObjectKeys(client: S3Client, prefix: string): Promise<string[]> {
  const keys: string[] = [];
  let continuationToken: string | undefined;

  do {
    const response = await client.send(new ListObjectsV2Command({
      Bucket: R2_BUCKET_NAME,
      Prefix: prefix,
      ContinuationToken: continuationToken,
    }));

    for (const item of response.Contents ?? []) {
      if (item.Key) {
        keys.push(item.Key);
      }
    }

    continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined;
  } while (continuationToken);

  return keys;
}

function buildObjectMap(keys: string[]): Map<string, string[]> {
  const objectMap = new Map<string, string[]>();

  for (const key of keys) {
    const match = key.match(/^birds\/fake\/([^/]+)\//);
    if (!match) {
      continue;
    }

    const birdKey = match[1];
    const objectKeys = objectMap.get(birdKey) ?? [];
    objectKeys.push(key);
    objectMap.set(birdKey, objectKeys);
  }

  return objectMap;
}

async function deleteObjectBatch(client: S3Client, keys: string[]): Promise<void> {
  if (keys.length === 0) {
    return;
  }

  await client.send(new DeleteObjectsCommand({
    Bucket: R2_BUCKET_NAME,
    Delete: {
      Objects: keys.map((key) => ({ Key: key })),
      Quiet: false,
    },
  }));
}

async function main() {
  assertEnv();

  const expectedBirdKeys = loadExpectedBirdKeys();
  const client = getR2Client();
  const allKeys = await listAllObjectKeys(client, 'birds/fake/');
  const objectMap = buildObjectMap(allKeys);
  const staleEntries = [...objectMap.entries()]
    .filter(([birdKey]) => !expectedBirdKeys.has(birdKey))
    .sort(([left], [right]) => left.localeCompare(right));

  if (staleEntries.length === 0) {
    log('No stale fake bird prefixes found.');
    return;
  }

  log(`Found ${staleEntries.length} stale fake bird prefix(es).`);
  for (const [birdKey, keys] of staleEntries) {
    log(`  - ${birdKey} (${keys.length} object${keys.length === 1 ? '' : 's'})`);
  }

  if (!APPLY) {
    log('Dry run only. Re-run with --apply to delete these prefixes from R2.');
    return;
  }

  const staleKeys = staleEntries.flatMap(([, keys]) => keys);
  for (let index = 0; index < staleKeys.length; index += 1000) {
    const batch = staleKeys.slice(index, index + 1000);
    await deleteObjectBatch(client, batch);
  }

  log(`Deleted ${staleKeys.length} stale object(s) across ${staleEntries.length} prefix(es).`);
}

void main().catch((error) => {
  console.error(`[prune:fake] ${error instanceof Error ? error.stack ?? error.message : String(error)}`);
  process.exitCode = 1;
});