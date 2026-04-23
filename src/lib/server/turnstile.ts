import type { TurnstileServerValidationResponse } from '@marsidev/react-turnstile';

const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export function getTurnstileSecretKey(): string | null {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim();
  return secret ? secret : null;
}

interface VerifyTurnstileTokenOptions {
  token: string | null | undefined;
  remoteIp?: string | null;
}

interface VerifyTurnstileTokenResult {
  success: boolean;
  errorCodes: string[];
}

export async function verifyTurnstileToken({
  token,
  remoteIp,
}: VerifyTurnstileTokenOptions): Promise<VerifyTurnstileTokenResult> {
  const secret = getTurnstileSecretKey();

  if (!secret) {
    return { success: true, errorCodes: [] };
  }

  const trimmedToken = token?.trim();
  if (!trimmedToken) {
    return { success: false, errorCodes: ['missing-input-response'] };
  }

  const requestBody = new URLSearchParams({
    secret,
    response: trimmedToken,
    idempotency_key: crypto.randomUUID(),
  });

  if (remoteIp) {
    requestBody.set('remoteip', remoteIp);
  }

  try {
    const response = await fetch(TURNSTILE_VERIFY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: requestBody,
      cache: 'no-store',
    });

    if (!response.ok) {
      return { success: false, errorCodes: ['internal-error'] };
    }

    const payload = await response.json() as TurnstileServerValidationResponse;
    return {
      success: payload.success,
      errorCodes: payload['error-codes'] ?? [],
    };
  } catch {
    return { success: false, errorCodes: ['internal-error'] };
  }
}