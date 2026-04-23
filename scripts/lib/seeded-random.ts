/**
 * Deterministic seeded PRNG (Mulberry32 algorithm).
 *
 * Seeded by a string key so results are reproducible for the same
 * (date + bot slug) combination. Useful for debugging: running the
 * same cron twice on the same day produces the same events.
 */

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = Math.imul(31, hash) + str.charCodeAt(i);
    hash |= 0; // Force 32-bit integer
  }
  return hash >>> 0; // Unsigned 32-bit
}

function mulberry32(seed: number): () => number {
  let s = seed;
  return function () {
    s |= 0;
    s = s + 0x6d2b79f5 | 0;
    let t = Math.imul(s ^ s >>> 15, 1 | s);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/**
 * Creates a deterministic random number generator seeded by a string.
 * Returns a function that yields values in [0, 1).
 */
export function createSeededRandom(seedKey: string): () => number {
  return mulberry32(hashString(seedKey));
}

/**
 * Returns a random integer in [min, max] (inclusive) using the given rng.
 */
export function randomInt(rng: () => number, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

/**
 * Returns true with the given probability using the given rng.
 */
export function randomBool(rng: () => number, probability: number): boolean {
  return rng() < probability;
}

/**
 * Picks a random element from an array using the given rng.
 */
export function randomPick<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}
