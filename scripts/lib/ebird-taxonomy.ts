interface EBirdTaxonomyEntry {
  comName?: string;
  sciName?: string;
}

export interface BirdTaxonomyLookup {
  exact: Map<string, string>;
  normalized: Map<string, string>;
}

const EBIRD_TAXONOMY_URL = 'https://api.ebird.org/v2/ref/taxonomy/ebird?fmt=json&locale=en';

export function normalizeBirdName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function fetchBirdTaxonomyLookup(apiKey: string): Promise<BirdTaxonomyLookup> {
  if (!apiKey.trim()) {
    throw new Error('Missing EBIRD_API_KEY');
  }

  const response = await fetch(EBIRD_TAXONOMY_URL, {
    headers: {
      'X-eBirdApiToken': apiKey,
    },
    method: 'GET',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch eBird taxonomy: ${response.status} ${response.statusText}`);
  }

  const entries = (await response.json()) as EBirdTaxonomyEntry[];
  const exact = new Map<string, string>();
  const normalized = new Map<string, string>();

  for (const entry of entries) {
    const commonName = entry.comName?.trim();
    const scientificName = entry.sciName?.trim();

    if (!commonName || !scientificName) {
      continue;
    }

    if (!exact.has(commonName)) {
      exact.set(commonName, scientificName);
    }

    const normalizedName = normalizeBirdName(commonName);
    if (normalizedName && !normalized.has(normalizedName)) {
      normalized.set(normalizedName, scientificName);
    }
  }

  return { exact, normalized };
}

export function resolveSciName(birdName: string, lookup: BirdTaxonomyLookup): string | null {
  const exact = lookup.exact.get(birdName.trim());
  if (exact) {
    return exact;
  }

  return lookup.normalized.get(normalizeBirdName(birdName)) ?? null;
}