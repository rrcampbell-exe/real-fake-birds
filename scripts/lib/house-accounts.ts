/**
 * House account persona definitions.
 *
 * Each entry represents a transparent bot profile that populates the
 * weekly leaderboard for social proof. All names are deliberately
 * synthetic / playful so players understand they are automated.
 *
 * Parameters:
 *   slug                 – unique identifier, also used as the username
 *   enabled              – set to false to skip this bot
 *   participationRate    – probability [0,1] of playing on any given day
 *   roundsPerDayRange    – [min, max] rounds to simulate when playing
 *   accuracyBand         – [min, max] probability of a correct guess per round
 *   realBirdRate         – probability that a given round involves a real bird
 *   avatarPalette        – avatar style (finch | tanager | kingfisher | etc.)
 */
export interface HouseAccountPersona {
  slug: string;
  enabled: boolean;
  participationRate: number;
  roundsPerDayRange: [number, number];
  accuracyBand: [number, number];
  realBirdRate: number;
  avatarPalette: string;
}

export const houseAccountPersonas: HouseAccountPersona[] = [
  {
    slug: 'realfakebirder',
    enabled: true,
    participationRate: 0.90,
    roundsPerDayRange: [8, 16],
    accuracyBand: [0.72, 0.88],
    realBirdRate: 0.55,
    avatarPalette: 'tanager',
  },
  {
    slug: 'robobird',
    enabled: true,
    participationRate: 0.80,
    roundsPerDayRange: [6, 12],
    accuracyBand: [0.60, 0.78],
    realBirdRate: 0.50,
    avatarPalette: 'kingfisher',
  },
  {
    slug: 'birdbot5000',
    enabled: true,
    participationRate: 0.70,
    roundsPerDayRange: [5, 10],
    accuracyBand: [0.65, 0.82],
    realBirdRate: 0.52,
    avatarPalette: 'warbler',
  },
  {
    slug: 'automaticavian',
    enabled: true,
    participationRate: 0.85,
    roundsPerDayRange: [4, 9],
    accuracyBand: [0.55, 0.70],
    realBirdRate: 0.48,
    avatarPalette: 'finch',
  },
  {
    slug: 'syntheticwren',
    enabled: true,
    participationRate: 0.65,
    roundsPerDayRange: [7, 14],
    accuracyBand: [0.75, 0.92],
    realBirdRate: 0.60,
    avatarPalette: 'heron',
  },
  {
    slug: 'fakefalcon9',
    enabled: true,
    participationRate: 0.75,
    roundsPerDayRange: [3, 8],
    accuracyBand: [0.58, 0.74],
    realBirdRate: 0.45,
    avatarPalette: 'owl',
  },
  {
    slug: 'quasimorhen',
    enabled: true,
    participationRate: 0.60,
    roundsPerDayRange: [6, 11],
    accuracyBand: [0.68, 0.84],
    realBirdRate: 0.53,
    avatarPalette: 'robin',
  },
  {
    slug: 'pseudo_plover',
    enabled: true,
    participationRate: 0.78,
    roundsPerDayRange: [5, 10],
    accuracyBand: [0.62, 0.78],
    realBirdRate: 0.50,
    avatarPalette: 'sparrow',
  },
  {
    slug: 'notabird_bot',
    enabled: true,
    participationRate: 0.72,
    roundsPerDayRange: [4, 8],
    accuracyBand: [0.50, 0.65],
    realBirdRate: 0.47,
    avatarPalette: 'cardinal',
  },
  {
    slug: 'hexapoda',
    enabled: true,
    participationRate: 0.55,
    roundsPerDayRange: [8, 18],
    accuracyBand: [0.80, 0.95],
    realBirdRate: 0.62,
    avatarPalette: 'pelican',
  },
];

/** Real bird keys to use when generating round-resolved events. */
export const SAMPLE_REAL_BIRD_KEYS: string[] = [
  'real:american-robin',
  'real:barn-swallow',
  'real:blue-jay',
  'real:northern-cardinal',
  'real:black-kite',
  'real:american-redstart',
  'real:atlantic-yellow-nosed-albatross',
  'real:bahama-woodstar',
  'real:black-guillemot',
  'real:ash-throated-crake',
  'real:african-green-pigeon',
  'real:african-paradise-flycatcher',
  'real:african-thrush',
  'real:american-herring-gull',
  'real:black-sawwing',
  'real:barn-owl',
  'real:cedar-waxwing',
  'real:common-loon',
  'real:eastern-bluebird',
  'real:great-horned-owl',
  'real:indigo-bunting',
  'real:killdeer',
  'real:lazuli-bunting',
  'real:mallard',
  'real:northern-mockingbird',
  'real:painted-bunting',
  'real:ruby-throated-hummingbird',
  'real:scarlet-tanager',
  'real:tufted-puffin',
  'real:yellow-warbler',
];

/** Fake bird keys to use when generating round-resolved events. */
export const SAMPLE_FAKE_BIRD_KEYS: string[] = [
  'fake:speckled-rumped-flootbird',
  'fake:greater-crested-wobblejay',
  'fake:lesser-tailed-throbbinch',
  'fake:spotted-bellied-quorkle',
  'fake:northern-beaked-flapchuck',
  'fake:rufous-necked-dingwing',
  'fake:long-toed-blumbill',
  'fake:banded-crested-snorkel',
  'fake:pale-winged-noodlefinch',
  'fake:common-dorsal-blortbird',
];
