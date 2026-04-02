import { limitFactLength } from './utils/limit-fact-length';

interface WikipediaSummaryImage {
  source?: string;
}

interface WikipediaSummaryResponse {
  extract?: string;
  originalimage?: WikipediaSummaryImage;
  thumbnail?: WikipediaSummaryImage;
}

const WIKIPEDIA_TIMEOUT_MS = 8000;

async function fetchWikipediaSummary(title: string): Promise<WikipediaSummaryResponse | null> {
  if (!title.trim()) {
    return null;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), WIKIPEDIA_TIMEOUT_MS);

  try {
    const response = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
      {
        headers: {
          Accept: 'application/json',
        },
        method: 'GET',
        signal: controller.signal,
      }
    );

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as WikipediaSummaryResponse;
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function fetchBestWikipediaSummary(
  birdName: string,
  sciName?: string
): Promise<WikipediaSummaryResponse | null> {
  const primarySummary = await fetchWikipediaSummary(birdName);
  if (primarySummary?.extract || primarySummary?.originalimage?.source || primarySummary?.thumbnail?.source) {
    return primarySummary;
  }

  const fallbackTitle = sciName?.trim();
  if (!fallbackTitle || fallbackTitle === birdName) {
    return primarySummary;
  }

  return fetchWikipediaSummary(fallbackTitle);
}

export async function fetchWikipediaFact(birdName: string, sciName?: string): Promise<string | null> {
  const summary = await fetchBestWikipediaSummary(birdName, sciName);
  const extract = summary?.extract?.trim();
  return extract ? limitFactLength(extract, 2) : null;
}

export async function fetchWikipediaImage(
  birdName: string,
  sciName?: string
): Promise<string | null> {
  const summary = await fetchBestWikipediaSummary(birdName, sciName);
  const imageUrl = summary?.originalimage?.source ?? summary?.thumbnail?.source;
  return imageUrl?.trim() ? imageUrl : null;
}