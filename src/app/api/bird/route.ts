import { NextResponse } from 'next/server';
import { locations } from '@/lib/server/constants/locations';
import { nameGenerator } from '@/lib/server/name-generator';
import { percentOfTime } from '@/lib/server/utils/percent-of-time';

function selectLocation(): string {
  const locationVal = Math.floor(Math.random() * locations.length);
  return locations[locationVal].alpha2code;
}

export async function GET() {
  const API_KEY = process.env.EBIRD_API_KEY;

  // force a fake bird 47% of the time
  const fakeBird = percentOfTime(47);

  if (fakeBird) {
    const result = await nameGenerator();
    return NextResponse.json(result);
  }

  try {
    const location = selectLocation();
    const url = `https://api.ebird.org/v2/data/obs/${location}/recent?back=30`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(url, {
      headers: { 'X-eBirdApiToken': API_KEY ?? '' },
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const data = await response.json();

    if (data && data.length) {
      const random = Math.floor(Math.random() * data.length);
      return NextResponse.json({
        birdName: data[random].comName,
        isReal: true,
        url,
      });
    }

    // no birds in response — generate a fake name instead
    const result = await nameGenerator();
    return NextResponse.json(result);
  } catch (error) {
    console.log('error', error);
    // on timeout or network error, generate a fake name
    const result = await nameGenerator();
    if ('error' in result) {
      return NextResponse.json({ error: 'birdCall timed out' });
    }
    return NextResponse.json(result);
  }
}
