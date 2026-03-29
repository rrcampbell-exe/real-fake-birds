import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/server/utils/percent-of-time', () => ({
  percentOfTime: vi.fn(),
}));

vi.mock('@/lib/server/utils/surname-select', () => ({
  surnameSelect: vi.fn(),
}));

vi.mock('@/lib/server/utils/general-adjective-select', () => ({
  generalAdjectiveSelect: vi.fn(),
}));

vi.mock('@/lib/server/utils/color-select', () => ({
  colorSelect: vi.fn(),
}));

vi.mock('@/lib/server/utils/error-eval', () => ({
  errorEval: vi.fn(),
}));

import { nameGenerator } from './name-generator';
import { colorSelect } from '@/lib/server/utils/color-select';
import { errorEval } from '@/lib/server/utils/error-eval';
import { generalAdjectiveSelect } from '@/lib/server/utils/general-adjective-select';
import { percentOfTime } from '@/lib/server/utils/percent-of-time';
import { surnameSelect } from '@/lib/server/utils/surname-select';

describe('nameGenerator', () => {
  beforeEach(() => {
    vi.mocked(errorEval).mockReturnValue(false);
    vi.mocked(surnameSelect).mockResolvedValue('Campbell');
    vi.mocked(generalAdjectiveSelect).mockResolvedValue('Striped');
    vi.mocked(colorSelect).mockResolvedValue('Blue');
  });

  it('uses a fallback color + bird type when no modifiers are selected', async () => {
    vi.mocked(percentOfTime)
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(false);
    vi.spyOn(Math, 'random').mockReturnValue(0);

    await expect(nameGenerator()).resolves.toEqual({
      birdName: 'Blue Robin',
      isReal: false,
    });
  });

  it('returns an error when the fallback color call fails', async () => {
    vi.mocked(percentOfTime)
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(false);
    vi.mocked(colorSelect).mockResolvedValueOnce({ error: 'timeout' });
    vi.spyOn(Math, 'random').mockReturnValue(0);

    await expect(nameGenerator()).resolves.toEqual({
      error: 'third-party api call timed out',
    });
  });

  it('assembles a fake bird name from enabled parts', async () => {
    vi.mocked(percentOfTime)
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(true);
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0);

    await expect(nameGenerator()).resolves.toEqual({
      birdName: "Campbell's Striped Algerian Blue-bellied Robin",
      isReal: false,
    });
  });
});