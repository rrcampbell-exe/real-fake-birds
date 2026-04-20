/**
 * Local heuristic-based plausibility scoring for fake bird names.
 *
 * Scores each name on a 1–10 scale representing how plausible it sounds as a
 * real bird species name to a casual player (not a birder).
 *
 * The scorer evaluates:
 *   1. Whether the name ends with a recognised bird type suffix
 *   2. Word count (2–4 words is the sweet spot for real bird names)
 *   3. Whether modifiers resemble real ornithological descriptors
 *   4. Absence of obviously non-ornithological words
 */

// ---------------------------------------------------------------------------
// Known bird type suffixes (lowercase, single-word and compound)
// ---------------------------------------------------------------------------

const COMPOUND_BIRD_TYPES = new Set([
  'guinea fowl', 'bee-eater', 'ground-dove', 'storm-petrel',
]);

const SINGLE_BIRD_TYPES = new Set([
  'albatross', 'anhinga', 'antbird', 'antpitta', 'antshrike', 'antwren',
  'auk', 'auklet', 'avocet', 'babbler', 'barbet', 'bee-eater', 'bishop',
  'bittern', 'blackbird', 'bluebird', 'bobwhite', 'booby', 'brant',
  'broadbill', 'bufflehead', 'bulbul', 'bunting', 'bustard', 'buzzard',
  'canary', 'caracara', 'cardinal', 'cassowary', 'catbird', 'chat',
  'chickadee', 'chough', 'cisticola', 'cockatoo', 'condor', 'coot',
  'cormorant', 'coucal', 'courser', 'cowbird', 'crake', 'crane', 'creeper',
  'crossbill', 'crow', 'cuckoo', 'cuckooshrike', 'curlew', 'dacnis',
  'darter', 'dickcissel', 'dipper', 'dotterel', 'dove', 'dowitcher',
  'drongo', 'duck', 'dunlin', 'eagle', 'egret', 'eider', 'elaenia', 'emu',
  'euphonia', 'falcon', 'fieldfare', 'finch', 'flamingo', 'flicker',
  'flycatcher', 'francolin', 'frigatebird', 'frogmouth', 'fulmar',
  'gallinule', 'gannet', 'gnatcatcher', 'godwit', 'goldfinch', 'gonolek',
  'goose', 'goshawk', 'grackle', 'grassquit', 'grebe', 'grosbeak', 'grouse',
  'guan', 'guillemot', 'gull', 'harrier', 'hawk', 'hemispingus', 'heron',
  'hobby', 'honeyguide', 'hoopoe', 'hornbill', 'hummingbird', 'ibis',
  'jacamar', 'jacana', 'jay', 'junco', 'kestrel', 'kingbird', 'kingfisher',
  'kite', 'kiwi', 'koel', 'lapwing', 'lark', 'limpkin', 'longtail',
  'loon', 'lorikeet', 'macaw', 'magpie', 'malimbe', 'manakin', 'mannikin',
  'martin', 'meadowlark', 'merganser', 'mockingbird', 'moorhen', 'motmot',
  'mousebird', 'murre', 'murrelet', 'myna', 'nighthawk', 'nightingale',
  'nightjar', 'noddy', 'nuthatch', 'oilbird', 'oriole', 'osprey', 'ostrich',
  'owl', 'oystercatcher', 'parakeet', 'parrot', 'partridge', 'peafowl',
  'pelican', 'penguin', 'petrel', 'pewee', 'pheasant', 'pigeon', 'pintail',
  'pipit', 'plover', 'pochard', 'prinia', 'prion', 'ptarmigan', 'puffin',
  'quail', 'rail', 'raven', 'redpoll', 'redstart', 'roadrunner', 'robin',
  'roller', 'rook', 'sandgrouse', 'sandpiper', 'sapsucker', 'scoter',
  'screech-owl', 'seedcracker', 'shearwater', 'shoveler', 'shrike',
  'silverbill', 'siskin', 'skua', 'skylark', 'snipe', 'spadebill',
  'sparrow', 'spinetail', 'spurfowl', 'starling', 'stilt', 'stonechat',
  'stork', 'sunbird', 'sunbittern', 'swallow', 'swan', 'swift', 'tanager',
  'teal', 'tern', 'thrush', 'tit', 'tody', 'toucan', 'treecreeper',
  'trogon', 'tropicbird', 'turnstone', 'tyrannulet', 'tyrant',
  'vireo', 'vulture', 'wagtail', 'warbler', 'waxbill', 'waxwing', 'weaver',
  'wheatear', 'whimbrel', 'whydah', 'widowbird', 'woodhoopoe', 'woodlark',
  'woodpecker', 'woodstar', 'wren', 'yellowhammer', 'yellowthroat',
]);

// ---------------------------------------------------------------------------
// Plausible bird-name modifiers — colours, geography, morphological terms
// ---------------------------------------------------------------------------

const PLAUSIBLE_MODIFIERS = new Set([
  // Colours commonly used in bird names
  'azure', 'black', 'blue', 'brown', 'buff', 'chestnut', 'cinnamon',
  'cobalt', 'copper', 'coral', 'cream', 'crimson', 'dark', 'dusky',
  'emerald', 'flame', 'golden', 'gray', 'grey', 'green', 'indigo',
  'ivory', 'jet', 'lavender', 'olive', 'orange', 'pale', 'pink',
  'plum', 'purple', 'red', 'rose', 'ruby', 'rufous', 'russet',
  'rusty', 'saffron', 'scarlet', 'silver', 'slate', 'snowy', 'sooty',
  'tawny', 'turquoise', 'vermilion', 'violet', 'white', 'yellow',

  // Body-part & morphological descriptors
  'banded', 'barred', 'bearded', 'bellied', 'billed', 'breasted',
  'capped', 'cheeked', 'collared', 'crested', 'crowned', 'eared',
  'eyed', 'faced', 'flanked', 'footed', 'fronted', 'headed',
  'hooded', 'horned', 'legged', 'mantled', 'masked', 'naped',
  'necked', 'plumed', 'ringed', 'rumped', 'shouldered', 'sided',
  'spotted', 'streaked', 'striped', 'tailed', 'throated', 'tipped',
  'tufted', 'vented', 'wattled', 'webbed', 'winged',

  // Size / shape
  'broad', 'giant', 'great', 'greater', 'large', 'least', 'lesser',
  'little', 'long', 'short', 'slender', 'small', 'tiny',

  // Habitat / behaviour
  'alpine', 'arctic', 'coastal', 'common', 'desert', 'forest',
  'mountain', 'northern', 'southern', 'eastern', 'western', 'tropical',
  'island', 'highland', 'lowland', 'marsh', 'plain', 'river', 'rock',
  'sand', 'sea', 'snow', 'swamp', 'tree', 'water',
]);

// Words in real bird common names that serve as geographic modifiers
const GEOGRAPHIC_TERMS = new Set([
  'abyssinian', 'acadian', 'african', 'american', 'andean', 'antarctic',
  'antillean', 'arabian', 'arctic', 'asian', 'atlantic', 'australian',
  'bahama', 'bermuda', 'brazilian', 'british', 'cabo', 'caribbean',
  'cape', 'carolina', 'cuban', 'egyptian', 'eurasian', 'european',
  'hawaiian', 'himalayan', 'indian', 'japanese', 'malagasy', 'mexican',
  'pacific', 'patagonian', 'peruvian', 'polynesian', 'siberian',
  'tasmanian', 'tropical', 'verde',
]);

// Words that make a name sound obviously invented / non-ornithological
const RED_FLAG_WORDS = new Set([
  // Food / cooking
  'jambalaya', 'burrito', 'churro', 'fondue', 'tempura', 'waffle',
  'biscuit', 'croissant', 'pretzel', 'soufflé', 'souffle', 'brioche',
  'gelato', 'tiramisu', 'casserole', 'goulash', 'chowder', 'curry',
  'borscht', 'linguine', 'fettuccine', 'marzipan', 'meringue',

  // Mythology / brands / pop-culture
  'zeus', 'apollo', 'thor', 'odin', 'poseidon', 'athena', 'hermes',
  'oracle', 'zodiac', 'tempest', 'phantom', 'revolver', 'mustang',
  'cadillac', 'porsche', 'ferrari',

  // Moods / abstract nouns
  'affair', 'temptress', 'livid', 'shrill', 'angst', 'karma',
  'nirvana', 'bliss', 'chaos', 'fury', 'havoc', 'rage', 'wrath',

  // Military / tech
  'stealth', 'laser', 'turbo', 'cyber', 'quantum', 'nano', 'pixel',
  'neon', 'chrome',

  // Materials / fabrics that are not bird-name material
  'corduroy', 'denim', 'velvet', 'silk', 'satin', 'burlap', 'tweed',
  'suede', 'linen', 'cashmere', 'flannel',

  // Other obviously non-bird words
  'saratoga', 'verdun', 'pueblo', 'iroko', 'vida', 'loca',
  'daisy', 'vida', 'canyon',
]);

// ---------------------------------------------------------------------------
// Scorer
// ---------------------------------------------------------------------------

function tokenize(name: string): string[] {
  return name.trim().split(/\s+/);
}

function lowerTokens(name: string): string[] {
  return tokenize(name).map((t) => t.toLowerCase());
}

/**
 * Try to extract the bird type suffix from the name.
 * Checks compound types first (e.g. "Guinea Fowl"), then single-word types.
 */
function extractBirdType(nameLower: string): { type: string; remainder: string } | null {
  // Check compound types
  for (const compound of COMPOUND_BIRD_TYPES) {
    if (nameLower.endsWith(compound)) {
      return {
        type: compound,
        remainder: nameLower.slice(0, -compound.length).trim(),
      };
    }
  }

  // Check single-word types
  const words = nameLower.split(/\s+/);
  const lastWord = words[words.length - 1];
  if (lastWord && SINGLE_BIRD_TYPES.has(lastWord)) {
    return {
      type: lastWord,
      remainder: words.slice(0, -1).join(' '),
    };
  }

  // Check hyphenated last token for compound bird-types like "screech-owl"
  if (lastWord?.includes('-')) {
    if (SINGLE_BIRD_TYPES.has(lastWord)) {
      return {
        type: lastWord,
        remainder: words.slice(0, -1).join(' '),
      };
    }
    // Try the part after the last hyphen
    const afterHyphen = lastWord.split('-').pop();
    if (afterHyphen && SINGLE_BIRD_TYPES.has(afterHyphen)) {
      return {
        type: afterHyphen,
        remainder: words.slice(0, -1).join(' ') + ' ' + lastWord.split('-').slice(0, -1).join('-'),
      };
    }
  }

  return null;
}

function hasRedFlags(tokens: string[]): number {
  let count = 0;
  for (const token of tokens) {
    // Strip hyphens to check compound tokens (e.g. "canyon-legged" → check "canyon")
    const parts = token.split('-');
    for (const part of parts) {
      if (RED_FLAG_WORDS.has(part)) {
        count++;
      }
    }
  }
  return count;
}

function countPlausibleModifiers(tokens: string[]): number {
  let count = 0;
  for (const token of tokens) {
    const parts = token.split('-');
    for (const part of parts) {
      if (PLAUSIBLE_MODIFIERS.has(part) || GEOGRAPHIC_TERMS.has(part)) {
        count++;
      }
    }
  }
  return count;
}

function hasOrdinalOrNumber(tokens: string[]): boolean {
  return tokens.some((t) => /^\d/.test(t) || /^(1st|2nd|3rd|\d+th)$/i.test(t));
}

/**
 * Score a fake bird name on a 1–10 plausibility scale.
 *
 * Higher scores = more plausible (harder to identify as fake).
 */
export function scorePlausibility(birdName: string): number {
  const nameLower = birdName.trim().toLowerCase();
  const tokens = lowerTokens(birdName);
  const wordCount = tokens.length;

  let score = 5; // Start at neutral midpoint

  // ---- Bird type suffix ----
  const typeResult = extractBirdType(nameLower);
  if (typeResult) {
    score += 2; // recognised bird type = big boost
  } else {
    score -= 2; // no recognised bird type = suspect
  }

  // ---- Word count ----
  if (wordCount >= 2 && wordCount <= 4) {
    score += 1; // sweet spot
  } else if (wordCount === 1) {
    score -= 1; // single-word fake names are unusual
  } else if (wordCount >= 5 && wordCount <= 6) {
    score -= 1; // getting long
  } else if (wordCount > 6) {
    score -= 2; // very long names are suspicious
  }

  // ---- Ordinals / numbers ----
  if (hasOrdinalOrNumber(tokens)) {
    score -= 3; // "1st French Pueblo Pelican" is obviously fake
  }

  // ---- Red flags ----
  const redFlagCount = hasRedFlags(tokens);
  score -= redFlagCount * 2;

  // ---- Plausible modifiers ----
  const modifierTokens = typeResult
    ? lowerTokens(typeResult.remainder)
    : tokens.slice(0, -1); // exclude the last word if no type match

  const plausibleCount = countPlausibleModifiers(modifierTokens);
  const modifierCount = modifierTokens.length;

  if (modifierCount > 0) {
    const plausibleRatio = plausibleCount / modifierCount;
    if (plausibleRatio >= 0.75) {
      score += 2;
    } else if (plausibleRatio >= 0.5) {
      score += 1;
    } else if (plausibleRatio < 0.25 && modifierCount > 1) {
      score -= 1;
    }
  }

  // ---- Bird type word used as a modifier (e.g. "Kingfisher" in modifiers) ----
  if (typeResult) {
    const modTokens = lowerTokens(typeResult.remainder);
    const extraBirdTypes = modTokens.filter((t) => SINGLE_BIRD_TYPES.has(t)).length;
    if (extraBirdTypes > 0) {
      score -= extraBirdTypes; // two bird types in one name is suspicious
    }
  }

  // ---- Hyphenated compound modifiers (common in real bird names) ----
  const hasHyphenatedModifier = tokens.some((t) => t.includes('-') && t !== typeResult?.type);
  if (hasHyphenatedModifier) {
    score += 1; // "black-throated", "ruby-crowned" etc. feel authentic
  }

  // Clamp to 1–10
  return Math.max(1, Math.min(10, score));
}
