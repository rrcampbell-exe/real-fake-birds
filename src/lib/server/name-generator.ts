import type { BirdApiResult } from '@/types';
import { bodyParts } from '@/lib/server/constants/body-parts';
import { birdTypes } from '@/lib/server/constants/bird-types';
import { locations } from '@/lib/server/constants/locations';
import { colorSelect } from '@/lib/server/utils/color-select';
import { generalAdjectiveSelect } from '@/lib/server/utils/general-adjective-select';
import { surnameSelect } from '@/lib/server/utils/surname-select';
import { percentOfTime } from '@/lib/server/utils/percent-of-time';
import { errorEval } from '@/lib/server/utils/error-eval';

export async function nameGenerator(): Promise<BirdApiResult> {
  const includesSurname = percentOfTime(5);
  const includesAdjective = percentOfTime(20);
  const includesLocation = percentOfTime(35);
  const includesColor = percentOfTime(80);
  const includesBodyPart = percentOfTime(30);

  const surname = includesSurname ? await surnameSelect() : '';

  const birdTypeVal = Math.floor(Math.random() * birdTypes.length);
  const adjective = includesAdjective
    ? await generalAdjectiveSelect(birdTypes[birdTypeVal])
    : '';

  const locationVal = Math.floor(Math.random() * locations.length);
  const { demonym, name, subregion } = locations[locationVal];
  const locationsArr = [demonym, name, subregion];
  const locationArrVal = Math.floor(Math.random() * locationsArr.length);
  const location = includesLocation ? locationsArr[locationArrVal] : '';

  const color = includesColor ? await colorSelect() : '';

  const bodyPartVal = Math.floor(Math.random() * bodyParts.length);
  const bodyPart = includesColor && includesBodyPart ? bodyParts[bodyPartVal] : '';

  // ensures bird values like "Robin" never display on their own as false negatives
  if (!includesSurname && !includesAdjective && !includesLocation && !includesColor) {
    const fallbackColor = await colorSelect();
    if (typeof fallbackColor === 'object') {
      return { error: 'third-party api call timed out' };
    }
    return { birdName: `${fallbackColor} ${birdTypes[birdTypeVal]}`, isReal: false };
  }

  if (errorEval([surname, adjective, color])) {
    return { error: 'third-party api call timed out' };
  }

  const parts = [
    includesSurname && typeof surname === 'string' ? `${surname}'s ` : '',
    includesAdjective && typeof adjective === 'string' ? `${adjective} ` : '',
    includesLocation ? `${location} ` : '',
    includesColor && typeof color === 'string' ? color : '',
    includesBodyPart ? bodyPart : '',
    ` ${birdTypes[birdTypeVal]}`,
  ];

  return { birdName: parts.join(''), isReal: false };
}
