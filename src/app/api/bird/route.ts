import { NextRequest, NextResponse } from 'next/server';
import type { BirdApiResult, HintRequest, HintType } from '@/types';
import { locations } from '@/lib/server/constants/locations';
import { nameGenerator } from '@/lib/server/name-generator';
import { generateFakeFact, generateFakeImage } from '@/lib/server/openai';
import { percentOfTime } from '@/lib/server/utils/percent-of-time';
import { fetchWikipediaFact, fetchWikipediaImage } from '@/lib/server/wikipedia';

const EBIRD_TIMEOUT_MS = 8000;

interface EBirdObservation {
  comName?: string;
  sciName?: string;
}

function selectLocation(): string {
  const locationVal = Math.floor(Math.random() * locations.length);
  return locations[locationVal].alpha2code;
}

function isHintType(value: unknown): value is HintType {
  return value === 'fact' || value === 'image';
}

function isHintRequest(value: unknown): value is HintRequest {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<HintRequest>;
  return (
    typeof candidate.birdName === 'string' &&
    typeof candidate.isReal === 'boolean' &&
    isHintType(candidate.type) &&
    (candidate.sciName === undefined || typeof candidate.sciName === 'string') &&
    (candidate.factHintContent === undefined || typeof candidate.factHintContent === 'string')
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function getMinimumHintDelay(type: HintType): number {
  if (type === 'fact') {
    return Math.ceil(2000 + Math.random() * 1500);
  }

  return Math.ceil(3500 + Math.random() * 2000);
}

async function waitForMinimumHintDelay(type: HintType, startTime: number): Promise<void> {
  const elapsed = Date.now() - startTime;
  const minimumDelay = getMinimumHintDelay(type);

  if (elapsed < minimumDelay) {
    await sleep(minimumDelay - elapsed);
  }
}

async function fetchRealBird(): Promise<BirdApiResult> {
  const apiKey = process.env.EBIRD_API_KEY;

  const location = selectLocation();
  const url = `https://api.ebird.org/v2/data/obs/${location}/recent?back=30`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), EBIRD_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: { 'X-eBirdApiToken': apiKey ?? '' },
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
    });

    const data = (await response.json()) as EBirdObservation[];

    if (data.length) {
      const random = Math.floor(Math.random() * data.length);
      return {
        birdName: data[random].comName ?? 'Unknown Bird',
        isReal: true,
        sciName: data[random].sciName,
        url,
      };
    }

    return nameGenerator();
  } catch {
    const result = await nameGenerator();
    if ('error' in result) {
      return { error: 'birdCall timed out' };
    }
    return result;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function resolveHintContent(request: HintRequest): Promise<string | null> {
  if (request.isReal) {
    if (request.type === 'fact') {
      return fetchWikipediaFact(request.birdName, request.sciName);
    }

    return fetchWikipediaImage(request.birdName, request.sciName);
  }

  if (request.type === 'fact') {
    return generateFakeFact(request.birdName);
  }

  return generateFakeImage(request.birdName, request.factHintContent);
}

export async function GET() {
  // force a fake bird 47% of the time
  const fakeBird = percentOfTime(47);

  if (fakeBird) {
    const result = await nameGenerator();
    return NextResponse.json(result);
  }

  const result = await fetchRealBird();
  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  let requestBody: unknown;

  try {
    requestBody = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  }

  if (!isHintRequest(requestBody)) {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  }

  const startTime = Date.now();

  try {
    const content = await resolveHintContent(requestBody);
    await waitForMinimumHintDelay(requestBody.type, startTime);

    if (!content) {
      return NextResponse.json({ error: 'hint_unavailable' }, { status: 502 });
    }

    return NextResponse.json({
      type: requestBody.type,
      content,
    });
  } catch {
    await waitForMinimumHintDelay(requestBody.type, startTime);
    return NextResponse.json({ error: 'hint_unavailable' }, { status: 502 });
  }
}
