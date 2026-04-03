import { describe, expect, it, vi } from 'vitest';
import { generalAdjectiveSelect } from './general-adjective-select';

describe('generalAdjectiveSelect', () => {
  it('returns a capitalized adjective from datamuse', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        json: vi.fn().mockResolvedValue([{ word: 'striped' }]),
      })
    );
    vi.spyOn(Math, 'random').mockReturnValue(0);

    await expect(generalAdjectiveSelect('Blue Robin')).resolves.toBe('Striped');
  });

  it('returns an error object when the fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('timeout')));

    await expect(generalAdjectiveSelect('Robin')).resolves.toEqual({
      error: 'adjective call timed out',
    });
  });

  it('returns an error object when datamuse returns no adjectives', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        json: vi.fn().mockResolvedValue([]),
      })
    );

    await expect(generalAdjectiveSelect('Robin')).resolves.toEqual({
      error: 'adjective call timed out',
    });
  });
});