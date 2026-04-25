import { describe, expect, it, vi } from 'vitest';
import { canLoadImage } from './image-availability';

describe('canLoadImage', () => {
  it('resolves true when the image loads', async () => {
    class MockImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      complete = false;
      naturalWidth = 0;

      set src(_value: string) {
        this.complete = true;
        this.naturalWidth = 128;
        this.onload?.();
      }
    }

    vi.stubGlobal('Image', MockImage);

    await expect(canLoadImage('https://images.example.com/bird.webp')).resolves.toBe(true);
  });

  it('resolves false when the image errors and the resource does not exist', async () => {
    class MockImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      complete = false;
      naturalWidth = 0;

      set src(_value: string) {
        this.complete = true;
        this.onerror?.();
      }
    }

    vi.stubGlobal('Image', MockImage);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));

    await expect(canLoadImage('https://images.example.com/missing.webp')).resolves.toBe(false);
  });

  it('resolves true via HEAD fallback when image decode fails but the resource exists', async () => {
    class MockImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      complete = false;
      naturalWidth = 0;

      set src(_value: string) {
        this.complete = true;
        this.onerror?.();
      }
    }

    vi.stubGlobal('Image', MockImage);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));

    await expect(canLoadImage('https://cdn.example.com/birds/fake/abc/image.webp')).resolves.toBe(true);
  });

  it('returns false for empty urls', async () => {
    await expect(canLoadImage('   ')).resolves.toBe(false);
  });
});