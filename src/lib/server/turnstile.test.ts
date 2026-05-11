import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getTurnstileSecretKey, verifyTurnstileToken } from './turnstile';

describe('turnstile', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.stubGlobal('crypto', { randomUUID: vi.fn().mockReturnValue('uuid-123') });
  });

  it('returns null when the secret key is missing or blank', () => {
    vi.stubEnv('TURNSTILE_SECRET_KEY', '');
    expect(getTurnstileSecretKey()).toBeNull();
  });

  it('treats verification as optional when the secret key is not configured', async () => {
    vi.stubEnv('TURNSTILE_SECRET_KEY', '');
    await expect(verifyTurnstileToken({ token: 'abc' })).resolves.toEqual({
      success: true,
      errorCodes: [],
    });
  });

  it('rejects missing tokens when verification is enabled', async () => {
    vi.stubEnv('TURNSTILE_SECRET_KEY', 'secret-key');
    await expect(verifyTurnstileToken({ token: '   ' })).resolves.toEqual({
      success: false,
      errorCodes: ['missing-input-response'],
    });
  });

  it('submits the verification request and returns the API payload', async () => {
    vi.stubEnv('TURNSTILE_SECRET_KEY', 'secret-key');
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: false,
        'error-codes': ['timeout-or-duplicate'],
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      verifyTurnstileToken({ token: '  token-value  ', remoteIp: '127.0.0.1' }),
    ).resolves.toEqual({
      success: false,
      errorCodes: ['timeout-or-duplicate'],
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      expect.objectContaining({
        method: 'POST',
        body: expect.any(URLSearchParams),
      }),
    );
  });

  it('returns an internal error for failed verification requests and thrown fetch errors', async () => {
    vi.stubEnv('TURNSTILE_SECRET_KEY', 'secret-key');
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false })
      .mockRejectedValueOnce(new Error('network failure'));
    vi.stubGlobal('fetch', fetchMock);

    await expect(verifyTurnstileToken({ token: 'token' })).resolves.toEqual({
      success: false,
      errorCodes: ['internal-error'],
    });
    await expect(verifyTurnstileToken({ token: 'token' })).resolves.toEqual({
      success: false,
      errorCodes: ['internal-error'],
    });
  });
});
