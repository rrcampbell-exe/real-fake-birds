import { limitFactLength } from './utils/limit-fact-length';

interface WikipediaSummaryImage {
  source?: string;
}

interface WikipediaSummaryResponse {
  title?: string;
  description?: string;
  extract?: string;
  originalimage?: WikipediaSummaryImage;
  thumbnail?: WikipediaSummaryImage;
  content_urls?: {
    desktop?: {
      page?: string;
    };
  };
}

export interface WikipediaBirdSummary {
  title: string | null;
  description: string | null;
  fact: string | null;
  summary: string | null;
  imageUrl: string | null;
  articleUrl: string | null;
}

interface WikipediaSearchResponse {
  query?: {
    search?: Array<{
      title?: string;
    }>;
  };
}

const WIKIPEDIA_TIMEOUT_MS = 8000;

function hasFact(summary: WikipediaSummaryResponse | null): boolean {
  return Boolean(summary?.extract?.trim());
}

function hasImage(summary: WikipediaSummaryResponse | null): boolean {
  return Boolean(summary?.originalimage?.source ?? summary?.thumbnail?.source);
}

function getPreferredWikipediaImageUrl(summary: WikipediaSummaryResponse | null): string | null {
  return summary?.thumbnail?.source?.trim() || summary?.originalimage?.source?.trim() || null;
}

function hasSummaryData(summary: WikipediaSummaryResponse | null): boolean {
  return Boolean(
    summary?.extract?.trim()
      || summary?.originalimage?.source
      || summary?.thumbnail?.source
      || summary?.content_urls?.desktop?.page?.trim()
  );
}

function formatWikipediaSummary(summary: WikipediaSummaryResponse | null): WikipediaBirdSummary {
  const extract = summary?.extract?.trim() || null;

  return {
    title: summary?.title?.trim() || null,
    description: summary?.description?.trim() || null,
    fact: extract ? limitFactLength(extract, 2) : null,
    summary: extract,
    imageUrl: getPreferredWikipediaImageUrl(summary),
    articleUrl: summary?.content_urls?.desktop?.page?.trim() || null,
  };
}

async function fetchWikipediaJson<T>(url: string): Promise<T | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), WIKIPEDIA_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
      },
      method: 'GET',
      signal: controller.signal,
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function fetchWikipediaSummary(title: string): Promise<WikipediaSummaryResponse | null> {
  if (!title.trim()) {
    return null;
  }

  return fetchWikipediaJson<WikipediaSummaryResponse>(
    `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`
  );
}

async function fetchWikipediaSearchTitle(query: string): Promise<string | null> {
  if (!query.trim()) {
    return null;
  }

  const response = await fetchWikipediaJson<WikipediaSearchResponse>(
    `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*`
  );

  return response?.query?.search?.[0]?.title?.trim() ?? null;
}

async function fetchBestWikipediaSummary(
  titles: string[],
  isUsable: (summary: WikipediaSummaryResponse | null) => boolean
): Promise<WikipediaSummaryResponse | null> {
  const normalizedTitles = titles
    .map((title) => title.trim())
    .filter(Boolean)
    .filter((title, index, allTitles) => allTitles.findIndex((candidate) => candidate.toLowerCase() === title.toLowerCase()) === index);

  const triedTitles = new Set<string>();

  for (const title of normalizedTitles) {
    triedTitles.add(title.toLowerCase());
    const summary = await fetchWikipediaSummary(title);
    if (isUsable(summary)) {
      return summary;
    }
  }

  for (const title of normalizedTitles) {
    const searchTitle = await fetchWikipediaSearchTitle(title);
    if (!searchTitle || triedTitles.has(searchTitle.toLowerCase())) {
      continue;
    }

    triedTitles.add(searchTitle.toLowerCase());
    const summary = await fetchWikipediaSummary(searchTitle);
    if (isUsable(summary)) {
      return summary;
    }
  }

  return null;
}

export async function fetchWikipediaFact(birdName: string, sciName?: string): Promise<string | null> {
  const summary = await fetchBestWikipediaSummary([birdName, sciName ?? ''], hasFact);
  return formatWikipediaSummary(summary).fact;
}

export async function fetchWikipediaImage(
  birdName: string,
  sciName?: string
): Promise<string | null> {
  const summary = await fetchBestWikipediaSummary([birdName, sciName ?? ''], hasImage);
  return formatWikipediaSummary(summary).imageUrl;
}

export async function fetchWikipediaBirdSummary(
  birdName: string,
  sciName?: string
): Promise<WikipediaBirdSummary | null> {
  const summary = await fetchBestWikipediaSummary([birdName, sciName ?? ''], hasSummaryData);

  if (!summary) {
    return null;
  }

  return formatWikipediaSummary(summary);
}