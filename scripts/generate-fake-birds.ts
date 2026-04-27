#!/usr/bin/env npx tsx

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { nameGenerator } from '../src/lib/server/name-generator';
import { formatBirdName } from '../src/lib/utils/format-bird-name';
import { slugifyBirdName } from '../src/lib/utils/slugify';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FAKE_BIRDS_PATH = join(__dirname, 'data', 'fake-birds.json');
const SEED_BIRDS_PATH = join(__dirname, 'data', 'seed-birds.json');

const COUNT = (() => {
  const index = process.argv.indexOf('--count');
  if (index === -1) {
    return 100;
  }

  const raw = process.argv[index + 1];
  const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 100;
})();

const DRY_RUN = process.argv.includes('--dry-run');
const SEED = process.argv.includes('--seed');
const MAX_ATTEMPTS = COUNT * 50;

const NEW_BIRDS_OUT = (() => {
  const index = process.argv.indexOf('--new-birds-out');
  return index !== -1 ? process.argv[index + 1] : undefined;
})();

type GeneratedBirdResult = {
  birdName: string;
  birdKey: string;
};

function log(message: string) {
  console.log(`[generate:fake] ${message}`);
}

function normalizeGeneratedBirdName(name: string): string {
  return formatBirdName(name)
    .replace(/\s+/g, ' ')
    .trim();
}

function loadExistingBirds(): string[] {
  return JSON.parse(readFileSync(FAKE_BIRDS_PATH, 'utf-8')) as string[];
}

function loadRealBirdNames(): Set<string> {
  if (!existsSync(SEED_BIRDS_PATH)) return new Set();
  const names = JSON.parse(readFileSync(SEED_BIRDS_PATH, 'utf-8')) as string[];
  return new Set(names.map((name) => name.toLowerCase().trim()));
}

function loadRealBirdKeys(): Set<string> {
  if (!existsSync(SEED_BIRDS_PATH)) return new Set();
  const names = JSON.parse(readFileSync(SEED_BIRDS_PATH, 'utf-8')) as string[];
  return new Set(names.map((name) => slugifyBirdName(name)));
}

function seedBird(birdName: string): void {
  const result = spawnSync(
    'npx',
    ['tsx', 'scripts/seed-cdn.ts', '--fake', '--bird', birdName],
    {
      cwd: join(__dirname, '..'),
      env: process.env,
      stdio: 'inherit',
    },
  );

  if (result.status !== 0) {
    throw new Error(`Failed seeding ${birdName} (exit ${result.status ?? 'unknown'})`);
  }
}

async function main() {
  const existingBirds = loadExistingBirds();
  const existingNames = new Set(existingBirds);
  const existingKeys = new Set(existingBirds.map((birdName) => slugifyBirdName(birdName)));

  // Also dedupe against real birds so fake candidates can't collide with real species
  const realBirdNames = loadRealBirdNames();
  const realBirdKeys = loadRealBirdKeys();
  if (realBirdNames.size > 0) {
    log(`Loaded ${realBirdNames.size} real bird names for dedupe.`);
  }

  const generatedBirds: GeneratedBirdResult[] = [];

  let attempts = 0;
  while (generatedBirds.length < COUNT && attempts < MAX_ATTEMPTS) {
    attempts += 1;
    const result = await nameGenerator();
    if ('error' in result) {
      continue;
    }

    const birdName = normalizeGeneratedBirdName(result.birdName);
    const birdKey = slugifyBirdName(birdName);

    if (!birdName || existingNames.has(birdName) || existingKeys.has(birdKey)) {
      continue;
    }

    // Reject collision with real birds
    if (realBirdNames.has(birdName.toLowerCase().trim()) || realBirdKeys.has(birdKey)) {
      log(`Skipping "${birdName}" — collides with a real bird.`);
      continue;
    }

    generatedBirds.push({ birdName, birdKey });
    existingNames.add(birdName);
    existingKeys.add(birdKey);
  }

  if (generatedBirds.length < COUNT) {
    throw new Error(`Unable to generate ${COUNT} unique fake birds after ${attempts} attempts; generated ${generatedBirds.length}`);
  }

  log(`Generated ${generatedBirds.length} new fake birds after ${attempts} attempts.`);
  for (const bird of generatedBirds) {
    log(`  - ${bird.birdName}`);
  }

  if (DRY_RUN) {
    log('Dry run enabled; not writing fake-birds.json.');
    return;
  }

  const updatedBirds = [...existingBirds, ...generatedBirds.map((bird) => bird.birdName)].sort((left, right) => left.localeCompare(right));
  writeFileSync(FAKE_BIRDS_PATH, JSON.stringify(updatedBirds, null, 2) + '\n');
  log(`Appended ${generatedBirds.length} birds to ${FAKE_BIRDS_PATH}`);

  if (NEW_BIRDS_OUT) {
    const newBirdNames = generatedBirds.map((bird) => bird.birdName);
    writeFileSync(NEW_BIRDS_OUT, JSON.stringify(newBirdNames, null, 2) + '\n');
    log(`Wrote ${newBirdNames.length} new bird names to ${NEW_BIRDS_OUT}`);
  }

  if (!SEED) {
    return;
  }

  log('Seeding generated birds to CDN...');
  for (const bird of generatedBirds) {
    seedBird(bird.birdName);
  }
  log('Finished seeding generated birds.');
}

void main().catch((error) => {
  console.error(`[generate:fake] ${error instanceof Error ? error.stack ?? error.message : String(error)}`);
  process.exitCode = 1;
});