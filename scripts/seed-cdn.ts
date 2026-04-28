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

const FAKE_MODE = process.argv.includes('--fake');
const MULTI_ONLY = process.argv.includes('--multi-only'); // force multi-bird compositions (for targeted sample testing)
const FROM_SAMPLES = process.argv.includes('--from-samples'); // upload pre-generated samples from FAKE_SAMPLES_DIR to R2 (skips generation)
const SAMPLE_COUNT = (() => {
  const val = getFlagValue('--sample');
  return val ? parseInt(val, 10) : undefined;
})();

const DETAIL_WIDTH = 800;
const THUMB_WIDTH = 240;
const WEBP_QUALITY = 82;
const FACT_TEMPERATURE = 0.2;
const FAKE_FACT_TEMPERATURE = 0.7;
const _FAKE_SUMMARY_TEMPERATURE = 1.0;
const FACT_CACHE_CONTROL = 'public, max-age=86400';
const IMAGE_CACHE_CONTROL = 'public, max-age=31536000, immutable';
const REPORTS_DIR = join(__dirname, '.tmp', 'seed-cdn-runs');
const LAST_RUN_REPORT_PATH = join(__dirname, '.tmp', 'seed-cdn-last-run.json');
const FAKE_SAMPLES_DIR = join(__dirname, '.tmp', 'fake-samples');
const REQUIRED_R2_OBJECTS = ['image.webp', 'thumb.webp', 'image-thumb.webp', 'fact.json'] as const;
const OPENAI_IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL ?? 'gpt-image-1.5';

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

// ---------------------------------------------------------------------------
// Bird-type-to-habitat mapping (for fake bird image prompts)
// ---------------------------------------------------------------------------

const HABITAT_GROUPS: Record<string, string[]> = {
  waterfowl: ['lake shore', 'wetland marsh', 'river bank', 'coastal estuary', 'calm pond'],
  shorebird: ['tidal mudflat', 'sandy beach', 'rocky shoreline', 'salt marsh'],
  raptor: ['open sky above valley', 'cliff ledge', 'tall dead tree', 'savanna with thermals'],
  seabird: ['ocean cliff face', 'rocky islet', 'open sea', 'coastal bluff'],
  wetland: ['shallow marsh', 'reed-fringed lake', 'flooded rice paddy', 'mangrove edge', 'quiet river backwater'],
  forest: ['deciduous canopy', 'mossy forest floor', 'dense undergrowth', 'mixed woodland'],
  tropical: ['tropical rainforest canopy', 'flowering tropical tree', 'jungle clearing', 'lush vine-draped branch'],
  grassland: ['open grassland', 'meadow', 'steppe', 'cultivated field edge'],
  arid: ['scrubby desert wash', 'sun-baked rocky trail', 'dry chaparral hillside', 'sparse thorn-bush flat'],
  urban: ['city rooftop ledge', 'barn eaves', 'park tree', 'telephone wire over a field', 'garden hedge'],
  savanna: ['open savanna', 'dry acacia woodland', 'dusty grassland clearing', 'scrubby lowland'],
  nocturnal: ['twilight forest', 'moonlit branch', 'dusky woodland edge'],
  fallback: ['forest edge', 'open woodland', 'riverside thicket', 'flower-studded meadow', 'mossy boulder field'],
};

const BIRD_TYPE_TO_GROUP: Record<string, string> = {
  // Waterfowl
  Duck: 'waterfowl', Goose: 'waterfowl', Swan: 'waterfowl', Merganser: 'waterfowl',
  Teal: 'waterfowl', Bufflehead: 'waterfowl', Pochard: 'waterfowl', Scoter: 'waterfowl',
  Shoveler: 'waterfowl', Eider: 'waterfowl', Brant: 'waterfowl', Coot: 'waterfowl',
  Grebe: 'waterfowl', Loon: 'waterfowl',
  // Shorebirds
  Sandpiper: 'shorebird', Plover: 'shorebird', Curlew: 'shorebird', Godwit: 'shorebird',
  Turnstone: 'shorebird', Oystercatcher: 'shorebird', Stilt: 'shorebird', Avocet: 'shorebird',
  Dotterel: 'shorebird', Whimbrel: 'shorebird', Lapwing: 'shorebird', Snipe: 'shorebird',
  Courser: 'shorebird', Jacana: 'shorebird',
  // Raptors
  Hawk: 'raptor', Eagle: 'raptor', Falcon: 'raptor', Kestrel: 'raptor',
  Harrier: 'raptor', Goshawk: 'raptor', Buzzard: 'raptor', Kite: 'raptor',
  Condor: 'raptor', Vulture: 'raptor',
  // Seabirds
  Gull: 'seabird', Tern: 'seabird', Puffin: 'seabird', Albatross: 'seabird',
  Gannet: 'seabird', Petrel: 'seabird', Shearwater: 'seabird', Skua: 'seabird',
  Frigatebird: 'seabird', Fulmar: 'seabird', Murre: 'seabird', Auk: 'seabird',
  Auklet: 'seabird', Booby: 'seabird', Noddy: 'seabird', Pelican: 'seabird',
  Cormorant: 'seabird', Anhinga: 'seabird', Darter: 'seabird', Penguin: 'seabird',
  // Wetland/wading
  Heron: 'wetland', Egret: 'wetland', Bittern: 'wetland', Ibis: 'wetland',
  Stork: 'wetland', Flamingo: 'wetland', Rail: 'wetland', Crane: 'wetland',
  // Forest/woodland
  Warbler: 'forest', Woodpecker: 'forest', Wren: 'forest', Thrush: 'forest',
  Nuthatch: 'forest', Flycatcher: 'forest', Vireo: 'forest', Oriole: 'forest',
  Tanager: 'forest', Treecreeper: 'forest', Robin: 'forest', Redstart: 'forest',
  Chickadee: 'forest', Tit: 'forest', Jay: 'forest', Catbird: 'forest',
  Mockingbird: 'forest', Babbler: 'forest', Nightingale: 'forest',
  Woodhoopoe: 'forest', Kingfisher: 'forest', Junco: 'forest',
  Siskin: 'forest', Redpoll: 'forest', Finch: 'forest', Waxwing: 'forest',
  Cardinal: 'forest', Grackle: 'forest', Sparrow: 'forest',
  // Tropical
  Toucan: 'tropical', Macaw: 'tropical', Parrot: 'tropical', Parakeet: 'tropical',
  Lorikeet: 'tropical', Cockatoo: 'tropical', Hornbill: 'tropical', 'Bee-eater': 'tropical',
  Motmot: 'tropical', Sunbittern: 'tropical', Roller: 'tropical', Hoopoe: 'tropical',
  Koel: 'tropical', Coucal: 'tropical', Myna: 'tropical', Drongo: 'tropical',
  Honeyguide: 'tropical', Bishop: 'tropical', Weaver: 'tropical', Whydah: 'tropical',
  Mousebird: 'tropical',
  // Open/grassland
  Lark: 'grassland', Skylark: 'grassland', Meadowlark: 'grassland', Pipit: 'grassland',
  Bunting: 'grassland', Yellowhammer: 'grassland', Wheatear: 'grassland', Stonechat: 'grassland',
  Quail: 'grassland', Bustard: 'grassland', Fieldfare: 'grassland', Woodlark: 'grassland',
  Starling: 'grassland', Wagtail: 'grassland', Shrike: 'grassland', Longtail: 'grassland',
  Pheasant: 'grassland', Grouse: 'grassland', Ptarmigan: 'grassland',
  // Arid/scrub
  Roadrunner: 'arid', Spadebill: 'arid', Canary: 'arid',
  // Urban/generalist
  Pigeon: 'urban', Dove: 'urban', Crow: 'urban', Raven: 'urban', Rook: 'urban',
  Chough: 'urban', Swallow: 'urban', Martin: 'urban', Swift: 'urban',
  Kingbird: 'urban', Cuckoo: 'urban',
  // Large ground birds
  Ostrich: 'savanna', Emu: 'savanna', Cassowary: 'savanna', Rhea: 'savanna',
  Peafowl: 'savanna', Fowl: 'savanna', Hummingbird: 'forest',
  // Nocturnal
  Owl: 'nocturnal', Nightjar: 'nocturnal', Nighthawk: 'nocturnal', Frogmouth: 'nocturnal',
  Oilbird: 'nocturnal', Kiwi: 'nocturnal',
};

// Bird types that cannot soar or sustain powered aerial flight; flight poses are excluded for these.
const FLIGHTLESS_OR_POOR_FLIER_TYPES = new Set([
  'Ostrich', 'Emu', 'Cassowary', 'Rhea', 'Kiwi',    // true flightless
  'Penguin', 'Puffin', 'Auk', 'Auklet', 'Murre',    // non-soaring / aquatic fliers
]);

// Bird types too large to perch in trees or fit inside cavities; tree/branch poses are excluded.
const LARGE_GROUND_BIRD_TYPES = new Set([
  'Ostrich', 'Emu', 'Cassowary', 'Rhea',
]);

// Poses that presuppose a tree, branch, or cavity; excluded for large ground birds.
const TREE_AND_PERCH_POSES = new Set([
  'perched on a branch',
  'singing from a treetop',
  'landing on a branch',
  'climbing a tree trunk',
  'peeking from a cavity',
  'displaying with wings half-spread on a branch',
  'investigating a hollow in a tree trunk',
  'watching intently from a low branch just above the ground',
  'balancing on a swaying reed stem',
]);

// Poses that require standing or swimming water; excluded when the habitat is not water-adjacent.
const WATER_SPECIFIC_POSES = new Set([
  'wading in shallow water',
  'swimming on calm water',
  'diving toward water',
]);

// Habitat groups that include a water body (enables water poses and water-based compositions).
const WATER_ADJACENT_GROUPS = new Set(['waterfowl', 'shorebird', 'seabird', 'wetland']);

// Poses that require sustained aerial flight; filtered out for flightless/poor-flier types.
const FLIGHT_ONLY_POSES = new Set([
  'mid-flight with wings spread',
  'banking turn in flight',
  'hovering',
  'catching an insect mid-air',
  'in coordinated flight against an open sky',
]);

const POSES = [
  'perched on a branch', 'mid-flight with wings spread', 'foraging on the ground',
  'wading in shallow water', 'preening feathers', 'singing from a treetop',
  'banking turn in flight', 'hovering', 'diving toward water', 'bathing in a puddle',
  'standing alert on a rock', 'stretching wings', 'landing on a branch',
  'carrying nesting material in beak', 'catching an insect mid-air',
  'swimming on calm water', 'climbing a tree trunk', 'running across open ground',
  'peeking from a cavity',
  // Additional variety
  'displaying with wings half-spread on a branch',
  'investigating a hollow in a tree trunk',
  'drinking from a shallow stream',
  'watching intently from a low branch just above the ground',
  'balancing on a swaying reed stem',
];

const LIGHTING = [
  'golden hour dawn light', 'harsh midday sun', 'soft overcast light',
  'misty morning light', 'dappled forest light', 'backlit rim glow with frontal fill light', 'cool blue-hour light',
];

const CAMERA_STYLES = [
  '400mm telephoto lens', '600mm super-telephoto lens', '200mm lens with creamy bokeh',
  '500mm telephoto lens with natural background separation', '300mm f/2.8 lens wide open for soft background',
];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function extractBirdType(birdName: string): string | null {
  // Split on spaces and look for the last word that matches a known bird type
  const words = birdName.split(/\s+/);
  // Check multi-word types first (e.g. "Bee-eater", "Guinea Fowl")
  for (let i = words.length - 2; i >= 0; i--) {
    const twoWord = `${words[i]} ${words[i + 1]}`;
    if (BIRD_TYPE_TO_GROUP[twoWord]) return twoWord;
  }
  // Then single words from the end
  for (let i = words.length - 1; i >= 0; i--) {
    if (BIRD_TYPE_TO_GROUP[words[i]]) return words[i];
  }
  return null;
}

function getHabitatForBird(birdName: string): { habitat: string; group: string } {
  const birdType = extractBirdType(birdName);
  const group = (birdType ? BIRD_TYPE_TO_GROUP[birdType] : undefined) ?? 'fallback';
  const habitats = HABITAT_GROUPS[group] ?? HABITAT_GROUPS.fallback;
  return { habitat: pickRandom(habitats), group };
}

/**
 * Returns the subset of POSES that are contextually appropriate for this bird type and habitat group.
 * Filters: flightless (no flight poses), large ground birds (no tree/perch poses),
 * non-water habitats (no water-specific poses).
 */
function getCompatiblePoses(birdName: string, habitatGroup: string): string[] {
  const birdType = extractBirdType(birdName);
  let poses = POSES;
  if (birdType && FLIGHTLESS_OR_POOR_FLIER_TYPES.has(birdType)) {
    poses = poses.filter((p) => !FLIGHT_ONLY_POSES.has(p));
  }
  if (birdType && LARGE_GROUND_BIRD_TYPES.has(birdType)) {
    poses = poses.filter((p) => !TREE_AND_PERCH_POSES.has(p));
  }
  if (!WATER_ADJACENT_GROUPS.has(habitatGroup)) {
    poses = poses.filter((p) => !WATER_SPECIFIC_POSES.has(p));
  }
  return poses.length > 0 ? poses : ['foraging on the ground', 'standing alert on a rock'];
}

const FAKE_IMAGE_PROMPT_OVERRIDES: Record<string, string> = {
  'Back Vida Loca Duck': 'Show a single duck floating naturally on open water in clean side profile, with smooth webbed feet tucked under the body or hidden by the waterline. Do not show talons, malformed claws, extra toes, twisted limbs, tattoos, ink, symbols, lettering, decorative markings, jewelry, or stylized body art. Keep the anatomy clean, organic, and unmistakably duck-like.',
  'Revolver-billed Chickadee': 'Show a chickadee with an unmistakably unusual but fully organic oversized beak that still reads as a natural bird beak made of keratin, with a bold curved profile and visible organic texture. Do not depict an ordinary standard chickadee bill. Do not depict anything metallic, tubular, barrel-shaped, trigger-like, muzzle-like, mechanical, or weapon-like. The result should feel clearly fictional yet biologically plausible in a wildlife photograph.',
};

// ---------------------------------------------------------------------------
// Wild-card mechanic
//
// Two independent systems:
//   1. Name-cue wild-cards (always-on): any bird whose name contains a
//      recognized token (hat, tie, crown, etc.) always receives a thematic
//      treatment — independent of the hash.
//   2. Generic anatomical wild-cards (~12%, hash-gated): birds with no name
//      cue receive a random absurdist anatomical trait when their hash falls
//      below WILD_CARD_RATE.
// ---------------------------------------------------------------------------

const WILD_CARD_RATE = 12;  // percent — generic anatomical wild-card gate
const NAME_CUE_RATE = 65;   // percent — apply a matched name cue this fraction of the time; others fall through to standard path

/**
 * Deterministic hash so the same bird always gets the same wild-card treatment.
 * Uses a djb2-style accumulation, returning a number 0–99.
 */
function birdNameHash(birdName: string): number {
  let hash = 5381;
  for (let i = 0; i < birdName.length; i++) {
    hash = ((hash << 5) + hash + birdName.charCodeAt(i)) & 0x7fffffff;
  }
  return hash % 100;
}

type WildCardCueKind = 'accessory' | 'anatomical';

interface WildCardCue {
  kind: WildCardCueKind;
  description: string;
}

/** Returns a strong, name-motivated cue, or null if no strong token is found. */
function detectWildCardCue(birdName: string): WildCardCue | null {
  const lower = birdName.toLowerCase();

  // Accessory cues — motivated by explicit name tokens
  if (/\bhat\b|\bberet\b|\bfedora\b|\bbonnet\b/.test(lower)) {
    return { kind: 'accessory', description: 'wearing a small hat that matches its name, naturally positioned on its head' };
  }

  // Anatomical / plumage cues — all patterns validated against the fake bird catalog
  if (/crowned/.test(lower)) {
    // e.g. "Red-crowned Crane", "Black-crowned Fulmar" — exaggerate the crown marking
    return { kind: 'anatomical', description: 'a dramatically oversized, vividly colored crown patch that radiates outward from the top of its head almost like a glowing halo' };
  }
  if (/\bdisco\b|\bglitter\b/.test(lower)) {
    return { kind: 'anatomical', description: 'extraordinarily iridescent plumage that catches light from every angle like a mirror-ball' };
  }
  if (/\bpearl\b/.test(lower)) {
    return { kind: 'anatomical', description: 'an opalescent pearl-like sheen across its entire plumage that shifts through soft iridescent hues depending on the angle of light' };
  }
  if (/\bmidnight\b/.test(lower)) {
    return { kind: 'anatomical', description: 'extraordinarily deep, light-absorbing matte-black plumage that seems to consume all light around it' };
  }
  if (/\bcosmic\b|\bgalactic\b|\bstellar\b/.test(lower)) {
    return { kind: 'anatomical', description: 'plumage with a deep-space quality: an inky base scattered with tiny luminous points of light, giving it a star-field appearance' };
  }
  if (/\bsunburst\b/.test(lower)) {
    return { kind: 'anatomical', description: 'a dramatic radiating starburst of contrasting feathers spreading outward from its chest like a halo' };
  }
  if (/\bcamouflage\b|\bcamo\b/.test(lower)) {
    return { kind: 'anatomical', description: 'plumage in a precise disruptive camouflage pattern of earthy tones that makes it nearly vanish against its background' };
  }
  if (/\bcyber\b/.test(lower)) {
    return { kind: 'anatomical', description: 'plumage overlaid with geometric circuit-board-like markings in electric colors, as if its feathers are living technology' };
  }
  if (/\bdead\b/.test(lower)) {
    return { kind: 'anatomical', description: 'ghostly pale, near-colorless plumage with hollow-looking dark-rimmed eyes, giving it a spectral appearance' };
  }
  if (/\bgiant\b|\bcolossal\b|\benormous\b/.test(lower)) {
    return { kind: 'anatomical', description: 'dramatically large size relative to the surrounding vegetation, towering over nearby branches' };
  }

  // Botanical / food-as-color cues — name tokens describe a color or texture
  if (/\beggplant\b/.test(lower)) {
    return { kind: 'anatomical', description: 'deep purple-black plumage with a rich glossy sheen, like polished eggplant skin' };
  }
  if (/\bparsley\b/.test(lower)) {
    // ~1-in-3 chance of the accessory version
    return birdNameHash(birdName) % 3 === 0
      ? { kind: 'accessory', description: 'wearing a small bright sprig of fresh parsley tucked neatly into its breast feathers like a boutonnière' }
      : { kind: 'anatomical', description: 'bright leafy-green speckled markings scattered across its plumage like fresh parsley' };
  }
  if (/\blaurel\b/.test(lower)) {
    // ~1-in-3 chance of an actual laurel wreath on its head
    return birdNameHash(birdName) % 3 === 0
      ? { kind: 'accessory', description: 'wearing a neatly woven laurel wreath balanced on top of its head like a champion\'s crown' }
      : { kind: 'anatomical', description: 'a ring of dense layered overlapping feathers encircling its neck like a natural laurel wreath' };
  }
  if (/\bapple\b/.test(lower)) {
    // ~1-in-3 chance of a tiny apple balanced on its head
    return birdNameHash(birdName) % 3 === 0
      ? { kind: 'accessory', description: 'balancing a small perfectly round red apple on top of its head with implausible confidence' }
      : { kind: 'anatomical', description: 'vivid patches of polished red and bright green across its breast, like the skin of a two-toned apple' };
  }
  if (/\bjambalaya\b/.test(lower)) {
    return { kind: 'anatomical', description: 'a chaotically mixed plumage of warm spicy tones — oranges, reds, and deep golds swirled together in an irregular patchwork' };
  }
  if (/\bwasabi\b/.test(lower)) {
    return { kind: 'anatomical', description: 'vivid chartreuse-green plumage of startling intensity, almost neon against any natural background' };
  }

  // Gem / mineral / color cues — name tokens describe a material sheen or vivid hue
  if (/\bemerald\b/.test(lower)) {
    return { kind: 'anatomical', description: 'jewel-like emerald-green plumage with a deep glassy iridescence, like a polished gemstone in direct light' };
  }
  if (/\bviolet\b/.test(lower)) {
    return { kind: 'anatomical', description: 'soft violet-hued plumage that shifts between blue and purple depending on the angle of light' };
  }
  if (/\bcobalt\b/.test(lower)) {
    return { kind: 'anatomical', description: 'intensely vivid cobalt-blue feathers that appear almost electrically saturated, as if lit from within' };
  }
  if (/\bamber\b/.test(lower)) {
    return { kind: 'anatomical', description: 'warm amber-toned plumage with a translucent honey-like quality that glows when backlit' };
  }
  if (/\bcopper\b/.test(lower)) {
    return { kind: 'anatomical', description: 'metallic copper-sheened feathers that catch sunlight with a warm reddish-gold glow' };
  }
  if (/\bgolden\b/.test(lower)) {
    return { kind: 'anatomical', description: 'lustrous golden-yellow plumage with a warm burnished gleam, as if every feather were gilded' };
  }
  if (/\bobsidian\b/.test(lower)) {
    return { kind: 'anatomical', description: 'glassy pitch-black plumage with a mirror-like obsidian sheen that reflects surroundings like polished volcanic glass' };
  }
  if (/\bchampagne\b/.test(lower)) {
    return { kind: 'anatomical', description: 'pale creamy-gold plumage with a soft effervescent shimmer, like champagne held up to the light' };
  }
  if (/\bcrystal\b/.test(lower)) {
    return { kind: 'anatomical', description: 'pale near-translucent plumage with a crystalline prismatic quality that scatters light into faint rainbow reflections' };
  }

  // Character / creature cues — name tokens suggest a personality or creature archetype
  if (/\bbuccaneer\b/.test(lower)) {
    // 50/50: jaunty eye patch vs. natural plumage mask
    return birdNameHash(birdName) % 2 === 0
      ? { kind: 'accessory', description: 'wearing a small jaunty eye patch over one eye, sitting naturally against its feathers, giving it a swashbuckling air' }
      : { kind: 'anatomical', description: 'a bold contrasting eye-stripe pattern that sweeps dramatically across its face like a natural mask, giving it a dashing adventurous look' };
  }
  if (/\bastronaut\b/.test(lower)) {
    // 50/50: clear bubble helmet vs. silvery spacesuit sheen
    return birdNameHash(birdName) % 2 === 0
      ? { kind: 'accessory', description: 'wearing a clear spherical space helmet fitted snugly over its head, slightly too large, with its plumage and beak visible inside' }
      : { kind: 'anatomical', description: 'a full-body silvery iridescent sheen across its plumage, like a reflective spacesuit, with a slightly puffed suited-up silhouette' };
  }
  if (/\bparadiso\b/.test(lower)) {
    return { kind: 'anatomical', description: 'extravagantly long ribbon-like tail plumes in vivid colors that cascade and drift dramatically behind it' };
  }
  if (/\btotem\b/.test(lower)) {
    return { kind: 'anatomical', description: 'bold stacked horizontal bands of strongly contrasting colors running down its chest and belly, like a totem pole pattern' };
  }
  if (/\baxolotl\b/.test(lower)) {
    return { kind: 'anatomical', description: 'delicate frilly plume extensions fanning out from behind its head and neck, resembling the iconic external gill tufts of an axolotl' };
  }
  if (/\bclairvoyant\b/.test(lower)) {
    return { kind: 'anatomical', description: 'unusually large luminous eyes that seem to glow with a soft otherworldly inner light, giving it an uncannily knowing expression' };
  }
  if (/jelly[\s-]?bean/.test(lower)) {
    return { kind: 'anatomical', description: 'plumage dotted with smooth oval spots of bright candy-like colors — greens, pinks, and yellows — scattered randomly across its body' };
  }

  // Emotion / bearing cues — name tokens suggest an expressive demeanor
  if (/\bproud\b/.test(lower)) {
    return { kind: 'anatomical', description: 'chest held prominently forward and head raised high, feathers fanned in a self-important display of obvious pride' };
  }
  if (/\bhopeful\b/.test(lower)) {
    return { kind: 'anatomical', description: 'an alert upward gaze and expectant posture, as if awaiting something wonderful just out of frame' };
  }
  if (/\bshy\b/.test(lower)) {
    return { kind: 'anatomical', description: 'feathers slightly fluffed and head tilted modestly to one side, one eye half-averted in a charmingly bashful expression' };
  }
  if (/\blonely\b/.test(lower)) {
    return { kind: 'anatomical', description: 'feathers lightly ruffled and gaze directed wistfully into the middle distance, with a quietly contemplative bearing' };
  }
  if (/\bgentle\b/.test(lower)) {
    return { kind: 'anatomical', description: 'a relaxed soft posture with feathers smoothed and eyes half-closed in a calm contented expression' };
  }
  if (/\bcareless\b/.test(lower)) {
    return { kind: 'anatomical', description: 'delightfully disheveled feathers in an endearingly carefree state, as if it recently emerged from an enthusiastic dust bath and decided not to tidy up' };
  }
  if (/\brestless\b/.test(lower)) {
    return { kind: 'anatomical', description: 'a visibly unsettled posture with tail bobbing, one foot slightly raised, and eyes darting alertly in multiple directions' };
  }

  return null;
}

const WILD_CARD_GENERIC_ANATOMICAL = [
  'subtly oversized head relative to its body, giving it a comically top-heavy look',
  'unusually long tail feathers that trail behind it like a bridal train',
  'a crest or tuft of feathers that stands dramatically upright like a punk hairdo',
  'an extraordinarily wide, flat bill that looks impractically large for its face',
  'tiny vestigial wing stumps that make it look like it has perpetually folded T-rex arms',
  'plumage that appears to change hue depending on the viewing angle, like a holographic sticker',
];

// ---------------------------------------------------------------------------
// Multi-bird compositions (~20% of standard-path birds)
// ---------------------------------------------------------------------------

const MULTI_RATE = 20; // percent; uses hash range [WILD_CARD_RATE, WILD_CARD_RATE + MULTI_RATE)

interface MultiCompositionTemplate {
  /** Returns the subject+activity string that replaces "a {birdName} {pose}". */
  describe: (birdName: string) => string;
  /** Ensures all birds feel native and coherent in the scene. */
  coherenceNote: string;
  /** If true, excluded for flightless/poor-flier bird types. */
  requiresFlight?: boolean;
  /** If true, excluded when the habitat group is not water-adjacent. */
  requiresWater?: boolean;
}

const MULTI_COMPOSITIONS: MultiCompositionTemplate[] = [
  {
    describe: (n) => `a small flock of ${n} foraging on the ground`,
    coherenceNote: 'Each bird is at a different stage of foraging — one may be pecking at the ground, another scanning alertly with head raised, another walking between spots. They face independently in varied directions, their spacing unscripted and natural — not posed, not aligned, not staged, and not all performing the same motion simultaneously.',
  },
  {
    describe: (n) => `a male and female ${n} side by side, one actively preening while the other rests or looks alertly into the distance`,
    coherenceNote: 'The two birds show subtle plumage differences between sexes; they are engaged in different activities and feel naturally placed relative to each other — not mirroring each other or performing the same action.',
  },
  {
    describe: (n) => `an adult ${n} feeding two begging fledglings`,
    coherenceNote: 'The fledglings are slightly smaller and fluffier than the adult and hold their beaks open; all three birds are integrated naturally into the scene.',
  },
  {
    describe: (n) => `two ${n} at the entrance to a nest cavity`,
    coherenceNote: 'Both birds are oriented toward the nest entrance and appear engaged with nesting activity; the nest is integrated into natural surroundings.',
  },
  {
    describe: (n) => `a loose group of ${n} roosting together on a shared perch`,
    coherenceNote: 'The birds are spaced naturally along the perch with feathers relaxed in a resting posture; each faces a slightly different direction and looks independently at ease — not uniformly aligned, not posed or staged for a photograph.',
  },
  {
    describe: (n) => `a loose flock of ${n} in flight against an open sky`,
    coherenceNote: 'The birds are loosely spaced at varied distances and slightly different heights — not packed tightly or evenly spaced. Each bird is captured at a different phase of its wingbeat so no two birds look identical. The flock feels alive and unscripted, not synchronized or parade-like.',
    requiresFlight: true,
  },
  {
    describe: (n) => `two ${n} bathing together in a shallow pool, water droplets catching the light`,
    coherenceNote: 'Both birds are independently splashing and bathing; the water surface shows natural turbulence from their movement. They are not posed symmetrically — each is caught mid-action in a slightly different position.',
    requiresWater: true,
  },
];

function selectMultiBirdComposition(birdName: string, habitatGroup: string): MultiCompositionTemplate | null {
  const hash = birdNameHash(birdName);
  if (!MULTI_ONLY && (hash < WILD_CARD_RATE || hash >= WILD_CARD_RATE + MULTI_RATE)) return null;

  const birdType = extractBirdType(birdName);
  const isFlightless = birdType ? FLIGHTLESS_OR_POOR_FLIER_TYPES.has(birdType) : false;
  const isWaterAdjacent = WATER_ADJACENT_GROUPS.has(habitatGroup);
  const eligible = MULTI_COMPOSITIONS.filter(
    (c) => (!c.requiresFlight || !isFlightless) && (!c.requiresWater || isWaterAdjacent),
  );

  return eligible.length > 0 ? eligible[hash % eligible.length] : null;
}

function buildFakeImagePrompt(birdName: string): string {
  const { habitat, group } = getHabitatForBird(birdName);
  const lighting = pickRandom(LIGHTING);
  const camera = pickRandom(CAMERA_STYLES);
  const overrideInstruction = FAKE_IMAGE_PROMPT_OVERRIDES[birdName];

  const antiSilhouette = 'The bird must be clearly and directly lit so that its plumage colors and field marks are fully visible; it must never read as a silhouette, shadow shape, outline, or backlit form.';

  const environmentClause = group === 'urban'
    ? 'Show the bird in a realistic urban or suburban environment; human infrastructure such as power lines, building ledges, rooftops, fences, and park benches is permitted. Do not include people, hands, cameras, tripods, text, labels, watermarks, or cages.'
    : 'Show only natural elements that belong in a bird photograph, such as branches, leaves, water, sky, rock, or grass. Do not include any human-made object anywhere in the frame. Do not include cameras, camera straps, lenses, tripods, people, hands, text, labels, watermarks, frames, collages, or cages.';

  // Override path: takes full control of constraints (always single bird)
  if (overrideInstruction) {
    const pose = pickRandom(getCompatiblePoses(birdName, group));
    return `Photorealistic wildlife photograph of a ${birdName} ${pose} in a ${habitat}, ${lighting}, shallow depth of field, ${camera}. The image must look like a real camera photo of the bird itself. ${antiSilhouette} ${overrideInstruction}`;
  }

  const hash = birdNameHash(birdName);

  // Name-cue wild-card path: single bird, driven by name token (~65% of matched birds)
  const nameCue = detectWildCardCue(birdName);
  if (!MULTI_ONLY && nameCue && hash < NAME_CUE_RATE) {
    const pose = pickRandom(getCompatiblePoses(birdName, group));
    if (nameCue.kind === 'accessory') {
      return `Photorealistic wildlife photograph of a ${birdName} ${pose} in a ${habitat}, ${lighting}, shallow depth of field, ${camera}. The image must look like a real camera photo of the bird itself. ${antiSilhouette} This bird is ${nameCue.description}. The accessory must look naturally worn or balanced — not held, placed beside it, or floating in the air. Outside of that single accessory, ${environmentClause} Do not include multiple birds.`;
    }
    return `Photorealistic wildlife photograph of a ${birdName} ${pose} in a ${habitat}, ${lighting}, shallow depth of field, ${camera}. The image must look like a real camera photo of the bird itself. ${antiSilhouette} This bird has ${nameCue.description}. ${environmentClause} Do not include multiple birds.`;
  }

  // Generic wild-card path (~12%, hash < WILD_CARD_RATE): anatomical absurdity, single bird
  if (!MULTI_ONLY && hash < WILD_CARD_RATE) {
    const pose = pickRandom(getCompatiblePoses(birdName, group));
    const generic = WILD_CARD_GENERIC_ANATOMICAL[hash % WILD_CARD_GENERIC_ANATOMICAL.length];
    return `Photorealistic wildlife photograph of a ${birdName} ${pose} in a ${habitat}, ${lighting}, shallow depth of field, ${camera}. The image must look like a real camera photo of the bird itself. ${antiSilhouette} This bird has ${generic}. ${environmentClause} Do not include multiple birds.`;
  }

  // Multi-bird composition path (~20%, hash in [WILD_CARD_RATE, WILD_CARD_RATE + MULTI_RATE); or all birds when --multi-only)
  const composition = selectMultiBirdComposition(birdName, group);
  if (composition) {
    const asyncNote = 'Each bird in the scene behaves independently — they are not all performing the same action or gesture at the same moment; their postures, directions, and activities vary naturally as if caught in an unscripted candid moment.';
    return `Photorealistic wildlife photograph of ${composition.describe(birdName)} in a ${habitat}, ${lighting}, shallow depth of field, ${camera}. The image must look like a real camera photo of the birds in their natural setting. ${antiSilhouette} ${composition.coherenceNote} ${asyncNote} ${environmentClause}`;
  }

  // Standard single-bird path
  const pose = pickRandom(getCompatiblePoses(birdName, group));
  return `Photorealistic wildlife photograph of a ${birdName} ${pose} in a ${habitat}, ${lighting}, shallow depth of field, ${camera}. The image must look like a real camera photo of the bird itself. ${antiSilhouette} ${environmentClause} Do not include multiple birds.`;
}

// ---------------------------------------------------------------------------
// Few-shot examples from real bird CDN facts (for style anchoring)
// ---------------------------------------------------------------------------

const REAL_BIRD_FACT_EXAMPLES = [
  { birdName: 'African Jacana', fact: 'The African jacana is known for its ability to walk on floating vegetation due to its long toes and claws.' },
  { birdName: 'Atlantic Puffin', fact: 'The Atlantic puffin is the only puffin species native to the Atlantic Ocean and is classified as vulnerable due to rapid population declines.' },
  { birdName: 'American Robin', fact: 'The American robin is a migratory bird found throughout North America, wintering from southern Canada to central Mexico.' },
  { birdName: 'American Kestrel', fact: 'The American kestrel is the smallest and most common falcon in North America, with 17 subspecies across the Americas.' },
  { birdName: 'Bald Eagle', fact: 'The bald eagle is a bird of prey native to North America, often found near large bodies of water with plentiful food and nesting trees.' },
];

// ---------------------------------------------------------------------------
// Fake bird generation (gpt-4o for facts/summaries, gpt-image-1.5 for images)
// ---------------------------------------------------------------------------

interface FakeBirdFactResult {
  fact: string;
  summary: string;
}

const FAKE_FACT_FOCUS_AREAS = [
  { label: 'diet and foraging', instruction: 'Describe what it plausibly eats or how it searches for food.' },
  { label: 'breeding and nesting', instruction: 'Describe a plausible nesting habit, courtship behavior, or breeding pattern.' },
  { label: 'habitat and range', instruction: 'Describe the kind of place it would plausibly be found or where it tends to roam.' },
  { label: 'voice and display', instruction: 'Describe a plausible call, song, or display behavior.' },
  { label: 'seasonal movement', instruction: 'Describe a plausible migration, seasonal movement, or weather-related pattern.' },
  { label: 'social behavior', instruction: 'Describe a plausible flocking habit, territorial behavior, or interaction with other birds.' },
  { label: 'appearance', instruction: 'Describe one concrete visible trait — avoid purple prose and generic plumage adjectives.' },
];

let recentFocusLabels: string[] = [];

function selectFactFocus(): { label: string; instruction: string } {
  const available = FAKE_FACT_FOCUS_AREAS.filter(({ label }) => !recentFocusLabels.includes(label));
  const pool = available.length ? available : FAKE_FACT_FOCUS_AREAS;
  const selected = pickRandom(pool);
  recentFocusLabels = [selected.label, ...recentFocusLabels.filter((l) => l !== selected.label)].slice(0, 2);
  return selected;
}

async function generateFakeCdnFact(birdName: string): Promise<FakeBirdFactResult> {
  const focus = selectFactFocus();
  const fewShotExamples = REAL_BIRD_FACT_EXAMPLES
    .map((ex) => `Bird: "${ex.birdName}" → "${ex.fact}"`)
    .join('\n');

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_FACT_MODEL,
      temperature: FAKE_FACT_TEMPERATURE,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `You write fictional bird facts that are indistinguishable from real field-guide entries. Match the exact register, sentence structure, and specificity of these real bird facts:

${fewShotExamples}

Rules:
- Write as if this bird is a real, documented species.
- Use declarative statements. No hedging ("known for", "notable for", "famous for").
- No superlatives unless justified by the stated focus.
- No mention that the bird is fictional or AI-generated.
- Vary structure: some facts should lead with the bird's name, others with a behavioral or ecological detail.
- Respond with valid JSON only.`,
        },
        {
          role: 'user',
          content: `Bird: "${birdName}"
Focus: ${focus.label}. ${focus.instruction}

Respond with this exact JSON structure:
{
  "fact": "One concise field-guide fact, max 180 characters, single sentence",
  "summary": "2-3 sentences in a speculative, family-friendly humorous tone about what this bird would be like if it were real. Vary your opening — do NOT always start with 'If this bird were real'. Instead, mix in varied openers like: leading with the bird's name and a playful claim, a mock field observation, a whimsical 'probably' or 'would likely' statement, or a tongue-in-cheek habitat note. Keep it light, playful, not sarcastic. Avoid violence, gore, predation, menace, threats, or jokes about attacking, hunting, eating other animals, or carrying off prey; keep the humor focused on quirks, habits, fussiness, vanity, or social behavior."
}`,
        },
      ],
    }),
  });

  if (!res.ok) {
    throw new Error(`OpenAI API error (fact): ${res.status} ${await res.text()}`);
  }

  const data = await res.json() as { choices: Array<{ message: { content: string } }> };
  const content = data.choices[0]?.message?.content;
  if (!content) throw new Error('Empty OpenAI response for fake fact');

  return JSON.parse(extractJsonObject(content)) as FakeBirdFactResult;
}

interface OpenAiImageResponse {
  data?: Array<{
    b64_json?: string;
    url?: string;
  }>;
}

async function generateFakeImage(birdName: string): Promise<{ imageBuffer: Buffer; prompt: string }> {
  const prompt = buildFakeImagePrompt(birdName);

  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_IMAGE_MODEL,
      prompt,
      quality: 'medium',
      size: '1024x1024',
      n: 1,
    }),
  });

  if (!res.ok) {
    throw new Error(`OpenAI API error (image): ${res.status} ${await res.text()}`);
  }

  const data = await res.json() as OpenAiImageResponse;
  const imageData = data.data?.[0];

  if (imageData?.b64_json) {
    return { imageBuffer: Buffer.from(imageData.b64_json, 'base64'), prompt };
  }

  if (imageData?.url) {
    const imgRes = await fetch(imageData.url);
    if (!imgRes.ok) throw new Error(`Failed to download generated image: ${imgRes.status}`);
    return { imageBuffer: Buffer.from(await imgRes.arrayBuffer()), prompt };
  }

  throw new Error('No image data returned from OpenAI');
}

const VISION_REFUSAL_PATTERNS = [
  /i'm sorry/i, /i can't help/i, /i cannot help/i, /i'm unable/i,
  /i cannot assist/i, /i can't assist/i, /as an ai/i, /i'm not able/i,
];

function isVisionRefusal(text: string): boolean {
  return VISION_REFUSAL_PATTERNS.some((p) => p.test(text));
}

async function generateDescriptionFromImage(imageBuffer: Buffer, birdName: string): Promise<string> {
  const base64 = imageBuffer.toString('base64');
  const mimeType = 'image/png'; // gpt-image-1.5 returns PNG
  const MAX_ATTEMPTS = 2;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: OPENAI_FACT_MODEL,
        max_tokens: 150,
        temperature: 0.3,
        messages: [
          {
            role: 'system',
            content: 'You are a field-guide illustrator describing an AI-generated illustration of a fictional bird. The image is not a real photograph — it is a digital artwork created for a bird-themed game. Always describe what you see.',
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Describe this illustrated bird's visible physical traits in one concise sentence suitable for a field guide entry. Focus only on what is visible: plumage colors, bill shape, body proportions, distinctive markings. Do not speculate beyond what is shown.`,
              },
              {
                type: 'image_url',
                image_url: { url: `data:${mimeType};base64,${base64}` },
              },
            ],
          },
        ],
      }),
    });

    if (!res.ok) {
      throw new Error(`OpenAI API error (vision): ${res.status} ${await res.text()}`);
    }

    const data = await res.json() as { choices: Array<{ message: { content: string } }> };
    const content = data.choices[0]?.message?.content?.trim();
    if (!content) throw new Error('Empty OpenAI response for vision description');

    if (!isVisionRefusal(content)) {
      return content;
    }

    if (attempt < MAX_ATTEMPTS) {
      console.log(`[seed]   ⚠ Vision refusal on attempt ${attempt}, retrying...`);
    } else {
      console.log(`[seed]   ⚠ Vision refused after ${MAX_ATTEMPTS} attempts, using fallback description`);
      return `A detailed illustration of the ${birdName} showing distinctive plumage and field marks.`;
    }
  }

  // Unreachable, but satisfies TS
  return `A detailed illustration of the ${birdName} showing distinctive plumage and field marks.`;
}

// ---------------------------------------------------------------------------
// Fake bird seed pipeline (single bird)
// ---------------------------------------------------------------------------

interface FakeSeedResult {
  birdName: string;
  birdKey: string;
  status: 'seeded' | 'skipped' | 'failed';
  error?: string;
  skipReason?: string;
  factJson?: Record<string, unknown>;
  imagePrompt?: string;
  factPrompt?: string;
}

async function seedFakeBird(birdName: string): Promise<FakeSeedResult> {
  const birdKey = slugify(birdName);
  const prefix = `birds/fake/${birdKey}`;
  const isSampleMode = SAMPLE_COUNT !== undefined;

  try {
    if (SKIP_EXISTING && !isSampleMode) {
      log('  Checking for existing CDN assets...');
      const alreadySeeded = await hasExistingR2Assets(prefix);
      if (alreadySeeded) {
        return { birdName, birdKey, status: 'skipped', skipReason: 'assets already exist in R2' };
      }
    }

    // 1. Generate fact + summary
    log('  Generating fact + summary...');
    const factResult = await generateFakeCdnFact(birdName);

    // 2. Generate image
    log('  Generating image (gpt-image-1.5, medium)...');
    const { imageBuffer, prompt: imagePrompt } = await generateFakeImage(birdName);

    // 3. Process image with Sharp
    const sharp = (await import('sharp')).default;
    log(`  Processing detail image (${DETAIL_WIDTH}px)...`);
    const detailWebp = await sharp(imageBuffer)
      .resize({ width: DETAIL_WIDTH, withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY })
      .toBuffer();
    log(`  Processing thumbnail (${THUMB_WIDTH}px)...`);
    const thumbWebp = await sharp(imageBuffer)
      .resize({ width: THUMB_WIDTH, withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY })
      .toBuffer();

    log(`  Detail: ${(detailWebp.byteLength / 1024).toFixed(1)}KB, Thumb: ${(thumbWebp.byteLength / 1024).toFixed(1)}KB`);

    // 4. Vision-describe the generated image
    log('  Generating description from image (gpt-4o vision)...');
    const description = await generateDescriptionFromImage(imageBuffer, birdName);

    // 5. Build fact.json
    const factJson = {
      birdName,
      fact: factResult.fact,
      summary: factResult.summary,
      description,
    };

    // 6. In sample/dry-run mode, write to local disk instead of R2
    if (isSampleMode || DRY_RUN) {
      const sampleDir = join(FAKE_SAMPLES_DIR, birdKey);
      mkdirSync(sampleDir, { recursive: true });

      // Write the image
      writeFileSync(join(sampleDir, 'image.webp'), detailWebp);
      writeFileSync(join(sampleDir, 'thumb.webp'), thumbWebp);

      // Write fact.json
      writeFileSync(join(sampleDir, 'fact.json'), JSON.stringify(factJson, null, 2), 'utf-8');

      // Write prompts for debugging/iteration
      const promptLog = {
        imagePrompt,
        factSystemPrompt: '(see source code — includes few-shot examples)',
        factFocusUsed: 'rotating',
        generatedAt: new Date().toISOString(),
      };
      writeFileSync(join(sampleDir, 'prompts.json'), JSON.stringify(promptLog, null, 2), 'utf-8');

      // Also save the raw PNG for inspection
      writeFileSync(join(sampleDir, 'raw-image.png'), imageBuffer);

      log(`  Written sample to ${sampleDir}`);
      return { birdName, birdKey, status: 'seeded', factJson, imagePrompt };
    }

    // 7. Upload to R2
    log('  Uploading to R2...');
    await uploadToR2(`${prefix}/image.webp`, detailWebp, 'image/webp', IMAGE_CACHE_CONTROL);
    await uploadToR2(`${prefix}/thumb.webp`, thumbWebp, 'image/webp', IMAGE_CACHE_CONTROL);
    await uploadToR2(`${prefix}/image-thumb.webp`, thumbWebp, 'image/webp', IMAGE_CACHE_CONTROL);
    await uploadToR2(`${prefix}/fact.json`, JSON.stringify(factJson, null, 2), 'application/json', FACT_CACHE_CONTROL);

    return { birdName, birdKey, status: 'seeded', factJson, imagePrompt };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { birdName, birdKey, status: 'failed', error: message };
  }
}

function readExistingManifestKeys(): string[] {
  const manifestPath = join(__dirname, '..', 'src', 'lib', 'server', 'cdn-manifest.ts');

  if (!existsSync(manifestPath)) {
    return [];
  }

  const existing = readFileSync(manifestPath, 'utf-8');

  // Only extract keys from the CDN_BIRD_KEYS Set (real birds), not from CDN_FAKE_BIRDS Map
  const realBirdBlock = existing.match(/const CDN_BIRD_KEYS: ReadonlySet<string> = new Set\(\[([\s\S]*?)\]\);/);
  if (!realBirdBlock?.[1]) {
    return [];
  }

  const keyMatches = realBirdBlock[1].match(/'([^']+)'/g);
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
  /** True when the failure is due to missing Wikipedia data (no summary or no image). These are
   * expected gaps in coverage and do not indicate a processing or infrastructure error. */
  wikiUnavailable?: boolean;
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
    if (!wiki) return { birdName, birdKey, status: 'failed', error: 'Wikipedia summary not found', wikiUnavailable: true };

    const originalImageUrl = getPreferredImageUrl(wiki);
    if (!originalImageUrl) return { birdName, birdKey, status: 'failed', error: 'No Wikipedia image found', wikiUnavailable: true };

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

function readExistingFakeBirdBlock(): string {
  const manifestPath = join(__dirname, '..', 'src', 'lib', 'server', 'cdn-manifest.ts');

  if (!existsSync(manifestPath)) {
    return '';
  }

  const existing = readFileSync(manifestPath, 'utf-8');

  // Extract everything from CDN_FAKE_BIRDS through the helper functions at end of file
  const fakeBlockStart = existing.indexOf('const CDN_FAKE_BIRDS');
  if (fakeBlockStart === -1) {
    return '';
  }

  // Return everything from CDN_FAKE_BIRDS to end of file (includes helpers)
  return existing.slice(fakeBlockStart);
}

function generateManifest(keys: string[]): void {
  const sorted = [...keys].sort();

  const realBirdBlock = `const CDN_BIRD_KEYS: ReadonlySet<string> = new Set([
${sorted.map((k) => `  '${k}',`).join('\n')}
]);`;

  // Preserve the fake bird block + helpers if they exist
  const fakeBirdBlock = readExistingFakeBirdBlock();

  let code: string;
  if (fakeBirdBlock) {
    code = `// Auto-generated — do not edit manually
// Real birds: generated by scripts/seed-cdn.ts
// Fake birds: scored by scripts/score-fake-birds.ts

${realBirdBlock}

${fakeBirdBlock}`;
  } else {
    // No fake birds yet — write just the real bird Set with basic helpers
    code = `// Auto-generated by scripts/seed-cdn.ts — do not edit manually
${realBirdBlock}

export function hasCdnAssets(birdKey: string): boolean {
  return CDN_BIRD_KEYS.has(birdKey);
}

export function getCdnBirdKeys(): ReadonlySet<string> {
  return CDN_BIRD_KEYS;
}
`;
  }

  const manifestPath = join(__dirname, '..', 'src', 'lib', 'server', 'cdn-manifest.ts');
  writeFileSync(manifestPath, code, 'utf-8');
  log(`Wrote manifest to src/lib/server/cdn-manifest.ts (${sorted.length} birds)`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  if (FAKE_MODE) {
    return mainFake();
  }

  return mainReal();
}

async function uploadSamplesFromDisk(): Promise<void> {
  if (!DRY_RUN && (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY)) {
    console.error('Missing R2 credentials. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY.');
    process.exit(1);
  }

  if (!existsSync(FAKE_SAMPLES_DIR)) {
    console.error(`No samples directory found at ${FAKE_SAMPLES_DIR}. Run with --fake --sample N first.`);
    process.exit(1);
  }

  const slugs = readdirSync(FAKE_SAMPLES_DIR).filter((name) => {
    const full = join(FAKE_SAMPLES_DIR, name);
    return existsSync(join(full, 'image.webp')) && existsSync(join(full, 'thumb.webp')) && existsSync(join(full, 'fact.json'));
  });

  if (slugs.length === 0) {
    console.error('No complete sample directories found (need image.webp, thumb.webp, fact.json).');
    process.exit(1);
  }

  log(`[FAKE] Uploading ${slugs.length} samples from disk to R2${DRY_RUN ? ' (dry-run)' : ''}...`);
  log('');

  let uploaded = 0;
  let failed = 0;

  for (const slug of slugs) {
    const sampleDir = join(FAKE_SAMPLES_DIR, slug);
    const prefix = `birds/fake/${slug}`;
    log(`Uploading: ${slug}`);
    try {
      const imageWebp = readFileSync(join(sampleDir, 'image.webp'));
      const thumbWebp = readFileSync(join(sampleDir, 'thumb.webp'));
      const factJson = readFileSync(join(sampleDir, 'fact.json'), 'utf-8');

      await uploadToR2(`${prefix}/image.webp`, imageWebp, 'image/webp', IMAGE_CACHE_CONTROL);
      await uploadToR2(`${prefix}/thumb.webp`, thumbWebp, 'image/webp', IMAGE_CACHE_CONTROL);
      await uploadToR2(`${prefix}/image-thumb.webp`, thumbWebp, 'image/webp', IMAGE_CACHE_CONTROL);
      await uploadToR2(`${prefix}/fact.json`, factJson, 'application/json', FACT_CACHE_CONTROL);

      log(`  ✓ Done`);
      uploaded++;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      warn(`  ✗ Failed: ${message}`);
      failed++;
    }
    log('');
  }

  log('='.repeat(50));
  log(`Done! ${uploaded} uploaded, ${failed} failed.`);

  if (failed > 0) process.exit(1);
}

async function mainFake() {
  if (FROM_SAMPLES) {
    return uploadSamplesFromDisk();
  }

  const singleBird = getFlagValue('--bird');
  const isSampleMode = SAMPLE_COUNT !== undefined;

  if (process.argv.includes('--bird') && !singleBird) {
    console.error('Missing value for --bird.');
    process.exit(1);
  }

  // Validate env — need OpenAI for both sample and full mode
  if (!OPENAI_API_KEY) {
    console.error('Missing OPENAI_API_KEY.');
    process.exit(1);
  }

  // R2 credentials only needed for non-sample, non-dry-run uploads
  if (!isSampleMode && !DRY_RUN) {
    if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
      console.error('Missing R2 credentials. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY.');
      process.exit(1);
    }
  }

  // Load fake bird list
  const fakeBirdsPath = join(__dirname, 'data', 'fake-birds.json');
  const allFakeBirds: string[] = JSON.parse(readFileSync(fakeBirdsPath, 'utf-8'));

  let birds: string[];

  if (singleBird) {
    birds = [singleBird];
  } else if (isSampleMode) {
    // Random sample from the list
    const shuffled = [...allFakeBirds].sort(() => Math.random() - 0.5);
    birds = shuffled.slice(0, SAMPLE_COUNT!);
  } else {
    birds = allFakeBirds;
  }

  if (isSampleMode) {
    mkdirSync(FAKE_SAMPLES_DIR, { recursive: true });
  }

  const modeLabel = isSampleMode ? `sample of ${birds.length}` : `${birds.length} bird(s)`;
  const dryLabel = DRY_RUN || isSampleMode ? ' (local output only)' : '';
  log(`[FAKE] Seeding ${modeLabel}${dryLabel}${SKIP_EXISTING ? ' with skip-existing' : ''}...`);
  log('');

  const results: FakeSeedResult[] = [];

  for (const bird of birds) {
    log(`Processing: ${bird}`);
    const result = await seedFakeBird(bird);
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

  const seededCount = results.filter((r) => r.status === 'seeded').length;
  const skippedCount = results.filter((r) => r.status === 'skipped').length;
  const failedCount = results.filter((r) => r.status === 'failed').length;

  // Write a summary report
  const report = {
    generatedAt: new Date().toISOString(),
    mode: 'fake',
    dryRun: DRY_RUN,
    sampleMode: isSampleMode,
    sampleCount: SAMPLE_COUNT,
    birdsRequested: birds,
    summary: { seeded: seededCount, skipped: skippedCount, failed: failedCount },
    results: results.map(({ birdName, birdKey, status, error, skipReason, factJson, imagePrompt }) => ({
      birdName, birdKey, status, error, skipReason, factJson, imagePrompt,
    })),
  };

  const reportPath = join(REPORTS_DIR, buildRunReportFileName(report.generatedAt));
  writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');
  log(`Wrote run report to ${reportPath}`);

  if (isSampleMode) {
    log(`Sample output written to ${FAKE_SAMPLES_DIR}/`);
    log('Review the generated facts, images, and prompts, then iterate on the prompt.');
  }

  log('='.repeat(50));
  log(`Done! ${seededCount} seeded, ${skippedCount} skipped, ${failedCount} failed.`);

  if (failedCount > 0) {
    log('Failed birds:');
    for (const result of results.filter((r) => r.status === 'failed')) {
      log(`  - ${result.birdName}: ${result.error}`);
    }
    process.exit(1);
  }
}

async function mainReal() {
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
    const wikiOnlyFailures = results.filter((r) => r.status === 'failed' && r.wikiUnavailable);
    const hardFailures = results.filter((r) => r.status === 'failed' && !r.wikiUnavailable);

    if (wikiOnlyFailures.length > 0) {
      warn(`Warning: ${wikiOnlyFailures.length} bird(s) skipped due to missing Wikipedia data (no image or summary):`);
      for (const result of wikiOnlyFailures) {
        warn(`  - ${result.birdName}: ${result.error}`);
      }
    }

    if (hardFailures.length > 0) {
      log('Failed birds (processing/infrastructure errors):');
      for (const result of hardFailures) {
        log(`  - ${result.birdName}: ${result.error}`);
      }
      process.exit(1);
    }
    // All failures were Wikipedia data gaps — not a pipeline error
  }
}

// Ensure tmp dir exists for intermediate files
mkdirSync(join(__dirname, '.tmp'), { recursive: true });
mkdirSync(REPORTS_DIR, { recursive: true });

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
