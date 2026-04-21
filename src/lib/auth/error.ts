export class AccountActionError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'AccountActionError';
    this.status = status;
    this.code = code;
  }
}

export function isRetryableAccountActionError(error: unknown): boolean {
  if (error instanceof AccountActionError) {
    return error.status >= 500;
  }

  return true;
}