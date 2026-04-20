import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { slugifyBirdName } from '@/lib/utils/slugify';

export interface FakeBirdEntry {
  birdName: string;
  birdKey: string;
}

let fakeBirdEntriesPromise: Promise<FakeBirdEntry[]> | null = null;

async function loadFakeBirdEntries(): Promise<FakeBirdEntry[]> {
  if (!fakeBirdEntriesPromise) {
    fakeBirdEntriesPromise = readFile(join(process.cwd(), 'scripts', 'data', 'fake-birds.json'), 'utf-8')
      .then((fileContents) => JSON.parse(fileContents) as string[])
      .then((birdNames) => birdNames.map((birdName) => ({
        birdName,
        birdKey: slugifyBirdName(birdName),
      })));
  }

  return fakeBirdEntriesPromise;
}

export async function getRandomFakeBirdEntry(): Promise<FakeBirdEntry | null> {
  const fakeBirdEntries = await loadFakeBirdEntries();
  if (fakeBirdEntries.length === 0) {
    return null;
  }

  const index = Math.floor(Math.random() * fakeBirdEntries.length);
  return fakeBirdEntries[index] ?? null;
}