import type { ImageAttribution } from '@/types';
import { slugifyBirdName } from '@/lib/utils/slugify';

export interface CdnFact {
  fact?: string;
  summary?: string;
  description?: string;
  articleUrl?: string;
  attribution?: ImageAttribution;
}

function getCdnBaseUrl(): string | null {
  const baseUrl = process.env.CDN_BASE_URL?.trim();
  return baseUrl ? baseUrl : null;
}

export function isCdnEnabled(): boolean {
  return Boolean(getCdnBaseUrl());
}

export function getCdnImageUrl(birdKey: string, size: 'full' | 'thumb' = 'full'): string {
  const baseUrl = getCdnBaseUrl();
  if (!baseUrl) {
    throw new Error('CDN_BASE_URL is not configured');
  }

  const filename = size === 'thumb' ? 'thumb.webp' : 'image.webp';
  return `${baseUrl}/birds/real/${birdKey}/${filename}`;
}

export function getCdnFactUrl(birdKey: string): string {
  const baseUrl = getCdnBaseUrl();
  if (!baseUrl) {
    throw new Error('CDN_BASE_URL is not configured');
  }

  return `${baseUrl}/birds/real/${birdKey}/fact.json`;
}

const CDN_FACT_TIMEOUT_MS = 3000;

export async function fetchCdnFact(birdName: string): Promise<CdnFact | null> {
  if (!getCdnBaseUrl()) {
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
