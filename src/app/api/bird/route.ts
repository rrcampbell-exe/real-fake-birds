import { NextRequest, NextResponse } from 'next/server';
import type { BirdApiResult, HintRequest, HintType } from '@/types';
import { locations } from '@/lib/server/constants/locations';
import { nameGenerator } from '@/lib/server/name-generator';
import { generateFakeFact, generateFakeImage, generateRealBirdFact } from '@/lib/server/openai';
import { percentOfTime } from '@/lib/server/utils/percent-of-time';
import { fetchWikipediaFact, fetchWikipediaImage } from '@/lib/server/wikipedia';

const EBIRD_TIMEOUT_MS = 8000;

interface EBirdObservation {
  comName?: string;
  sciName?: string;
}

interface SelectedLocation {
  alpha2code: string;
  name: string;
}

function selectLocation(): SelectedLocation {
  const locationVal = Math.floor(Math.random() * locations.length);
  const location = locations[locationVal];
  return {
    alpha2code: location.alpha2code,
    name: location.name,
  };
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
    (candidate.regionLabel === undefined || typeof candidate.regionLabel === 'string') &&
    (candidate.sciName === undefined || typeof candidate.sciName === 'string') &&
    (candidate.factHintContent === undefined || typeof candidate.factHintContent === 'string')
  );
}

function buildStructuredRealBirdFact(request: HintRequest): string | null {
  const birdName = request.birdName.trim();
  const sciName = request.sciName?.trim();
  const regionLabel = request.regionLabel?.trim();

  if (!birdName) {
    return null;
  }

  const templates: string[] = [];

  if (regionLabel && sciName) {
    templates.push(
      `The ${birdName} can be found in ${regionLabel} and has the scientific name ${sciName}.`,
      `${birdName} is found in ${regionLabel}, and its scientific name is ${sciName}.`,
      `In ${regionLabel}, the ${birdName} is known by the scientific name ${sciName}.`
    );
  }

  if (sciName) {
    templates.push(
      `The scientific name of the ${birdName} is ${sciName}.`,
      `${birdName} is a real bird with the scientific name ${sciName}.`
    );
  }

  if (regionLabel) {
    templates.push(
      `The ${birdName} can be found in ${regionLabel}.`,
      `${birdName} is found in ${regionLabel}.`
    );
  }

  templates.push(`${birdName} is a real bird species.`);

  const templateIndex = (birdName.length + (sciName?.length ?? 0) + (regionLabel?.length ?? 0)) % templates.length;
  return templates[templateIndex];
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
  const url = `https://api.ebird.org/v2/data/obs/${location.alpha2code}/recent?back=30`;

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
        regionLabel: location.name,
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
      const wikipediaFact = await fetchWikipediaFact(request.birdName, request.sciName);
      if (wikipediaFact) {
        return wikipediaFact;
      }

      const openAiFact = await generateRealBirdFact({
        birdName: request.birdName,
        regionLabel: request.regionLabel,
        sciName: request.sciName,
      });

      return openAiFact ?? buildStructuredRealBirdFact(request);
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
