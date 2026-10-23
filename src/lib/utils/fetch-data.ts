import { track } from '@/lib/analytics';
import { apiFetch } from '@/lib/api/client';
import { markLaunchStage } from '@/lib/native/launch-metrics';
import type { BirdErrorResponse, BirdResponse, GameMode, ImageAttribution } from '@/types';

const BIRD_DATA_STORAGE_KEY = 'birdData';
const BIRD_CACHE_TTL_MS = 86_400_000;

const BIRD_REVEAL_DELAY_MS = 1000;
const CACHED_BIRD_REVEAL_DELAY_MS = 300;

function preloadImage(url: string | undefined | null): void {
  if (url && typeof window !== 'undefined') {
    const img = new window.Image();
    img.src = url;
  }
}

interface CachedBirdResponse extends BirdResponse {
  cachedAt: number;
}

function getBirdDataStorageKey(mode: GameMode): string {
  return `${BIRD_DATA_STORAGE_KEY}:${mode}`;
}

function waitForRevealDelay(ms: number, signal?: AbortSignal): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const timer = window.setTimeout(() => {
      cleanup();
      resolve(true);
    }, ms);

    const onAbort = () => {
      window.clearTimeout(timer);
      cleanup();
      resolve(false);
    };

    const cleanup = () => {
      signal?.removeEventListener('abort', onAbort);
    };

    if (!signal) {
      return;
    }

    if (signal.aborted) {
      onAbort();
      return;
    }

    signal.addEventListener('abort', onAbort, { once: true });
  });
}

const fetchData = async (
  setIsReal: (val: boolean) => void,
  setIsLoading: (val: boolean) => void,
  setBirdData: (val: string) => void,
  setSciName: (val: string | null) => void,
  setRegionLabel: (val: string | null) => void,
  setFact: (val: string | null) => void,
  setSummary: (val: string | null) => void,
  setArticleUrl: (val: string | null) => void,
  setImageUrl: (val: string | null) => void,
  setDescription: (val: string | null) => void,
  setIsError: (val: boolean) => void,
  mode: GameMode = 'classic',
  signal?: AbortSignal,
  setImageThumbUrl?: (val: string | null) => void,
  setFallbackImageUrl?: (val: string | null) => void,
  setContentSource?: (val: string | null) => void,
  setAttribution?: (val: ImageAttribution | null) => void,
) => {
  const storageKey = getBirdDataStorageKey(mode);
  const cached = localStorage.getItem(storageKey);
  if (cached) {
    const parsedCached = JSON.parse(cached) as Partial<CachedBirdResponse>;
    const cachedAt = typeof parsedCached.cachedAt === 'number' ? parsedCached.cachedAt : 0;

    if ((Date.now() - cachedAt) <= BIRD_CACHE_TTL_MS) {
      const { birdName, isReal, sciName, regionLabel, fact, summary, articleUrl, imageUrl, description, imageThumbUrl, fallbackImageUrl, contentSource, attribution } = parsedCached as CachedBirdResponse;
      setIsReal(isReal);
      setSciName(sciName ?? null);
      setRegionLabel(regionLabel ?? null);
      setFact(fact ?? null);
      setSummary(summary ?? null);
      setArticleUrl(articleUrl ?? null);
      setImageUrl(imageUrl ?? null);
      setDescription(description ?? null);
      setImageThumbUrl?.(imageThumbUrl ?? null);
      setFallbackImageUrl?.(fallbackImageUrl ?? null);
      setContentSource?.(contentSource ?? null);
      setAttribution?.(attribution ?? null);
      preloadImage(imageUrl);
      const delayCompleted = await waitForRevealDelay(CACHED_BIRD_REVEAL_DELAY_MS, signal);
      if (!delayCompleted || signal?.aborted) {
        return;
      }
      markLaunchStage('first-round-ready', {
        source: 'cache',
      }, { once: true });
      setIsLoading(false);
      setBirdData(birdName);
      return;
    }

    localStorage.removeItem(storageKey);
  }

  try {
    const requestStartedAt = Date.now();
    const response = await apiFetch('/api/bird', { signal });
    const data: BirdResponse | BirdErrorResponse = await response.json();
    const requestDurationMs = Date.now() - requestStartedAt;

    if ('error' in data) {
      setIsError(true);
      setIsLoading(false);
      return;
    }

    const birdData = {
      birdName: data.birdName,
      isReal: data.isReal,
      regionLabel: data.regionLabel,
      sciName: data.sciName,
      fact: data.fact,
      summary: data.summary,
      articleUrl: data.articleUrl,
      imageUrl: data.imageUrl,
      imageThumbUrl: data.imageThumbUrl,
      fallbackImageUrl: data.fallbackImageUrl,
      description: data.description,
      contentSource: data.contentSource,
      factSource: data.factSource,
      attribution: data.attribution,
      cachedAt: Date.now(),
    };
    localStorage.setItem(storageKey, JSON.stringify(birdData));

    track('bird_content_loaded', {
      source: data.factSource ?? 'none',
      content_type: 'fact',
      load_stage: 'api',
      load_time_ms: requestDurationMs,
      outcome: data.fact ? 'success' : 'failure',
      is_real: data.isReal,
      cache_status: data.cacheStatus ?? 'none',
    });

    setIsReal(data.isReal);
    setSciName(data.sciName ?? null);
    setRegionLabel(data.regionLabel ?? null);
    setFact(data.fact ?? null);
    setSummary(data.summary ?? null);
    setArticleUrl(data.articleUrl ?? null);
    setImageUrl(data.imageUrl ?? null);
    setDescription(data.description ?? null);
    setImageThumbUrl?.(data.imageThumbUrl ?? null);
    setFallbackImageUrl?.(data.fallbackImageUrl ?? null);
    setContentSource?.(data.contentSource ?? null);
    setAttribution?.(data.attribution ?? null);
    preloadImage(data.imageUrl);
    const delayCompleted = await waitForRevealDelay(BIRD_REVEAL_DELAY_MS, signal);
    if (!delayCompleted || signal?.aborted) {
      return;
    }
    markLaunchStage('first-round-ready', {
      source: 'network',
      requestDurationMs,
    }, { once: true });
    setIsLoading(false);
    setBirdData(data.birdName);
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return;
    }

    setSciName(null);
    setRegionLabel(null);
    setFact(null);
    setSummary(null);
    setArticleUrl(null);
    setImageUrl(null);
    setDescription(null);
    setImageThumbUrl?.(null);
    setFallbackImageUrl?.(null);
    setContentSource?.(null);
    setAttribution?.(null);
    setIsError(true);
    setIsLoading(false);
  }
};

export default fetchData;
