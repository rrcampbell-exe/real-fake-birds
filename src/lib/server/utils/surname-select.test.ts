import { describe, expect, it, vi } from 'vitest';
import { surnameSelect } from './surname-select';

describe('surnameSelect', () => {
  it('returns the fetched surname', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        json: vi.fn().mockResolvedValue({
          results: [{ name: { last: 'Campbell' } }],
        }),
      })
    );

    await expect(surnameSelect()).resolves.toBe('Campbell');
  });

  it('returns an error object when the fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('timeout')));

    await expect(surnameSelect()).resolves.toEqual({ error: 'surname call timed out' });
  });
});