import type { ImageAttribution } from '@/types';
import { slugifyBirdName } from '@/lib/utils/slugify';

const CDN_BASE_URL = process.env.CDN_BASE_URL;

export interface CdnFact {
  fact?: string;
  summary?: string;
  description?: string;
  articleUrl?: string;
  attribution?: ImageAttribution;
}

export function isCdnEnabled(): boolean {
  return Boolean(CDN_BASE_URL);
}

export function getCdnImageUrl(birdKey: string, size: 'full' | 'thumb' = 'full'): string {
  const filename = size === 'thumb' ? 'thumb.webp' : 'image.webp';
  return `${CDN_BASE_URL}/birds/real/${birdKey}/${filename}`;
}

export function getCdnFactUrl(birdKey: string): string {
  return `${CDN_BASE_URL}/birds/real/${birdKey}/fact.json`;
}

const CDN_FACT_TIMEOUT_MS = 3000;

export async function fetchCdnFact(birdName: string): Promise<CdnFact | null> {
  if (!CDN_BASE_URL) {
    return null;
  }

  const birdKey = slugifyBirdName(birdName);
  const url = getCdnFactUrl(birdKey);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CDN_FACT_TIMEOUT_MS);

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as CdnFact;
  } catch {
    return null;
  }
}
