import { describe, expect, it, vi } from 'vitest';
import { colorSelect } from './color-select';

describe('colorSelect', () => {
  it('returns the resolved color name', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue({ name: { value: 'Teal' } }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(colorSelect()).resolves.toBe('Teal');
  });

  it('returns an error object when the fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('timeout')));

    await expect(colorSelect()).resolves.toEqual({ error: 'color call timed out' });
  });
});