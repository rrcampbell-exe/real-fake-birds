import type { HintRequest, HintResponse, HintErrorResponse, HintType } from '@/types';

export default async function fetchHint(
  birdName: string,
  isReal: boolean,
  type: HintType,
  sciName?: string,
  regionLabel?: string,
  factHintContent?: string
): Promise<HintResponse> {
  const requestBody: HintRequest = {
    birdName,
    isReal,
    type,
    ...(sciName ? { sciName } : {}),
    ...(regionLabel ? { regionLabel } : {}),
    ...(factHintContent ? { factHintContent } : {}),
  };

  const response = await fetch('/api/bird', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  const data = (await response.json()) as HintResponse | HintErrorResponse;

  if (!response.ok || 'error' in data) {
    throw new Error('error' in data ? data.error : 'hint_unavailable');
  }

  return data;
}