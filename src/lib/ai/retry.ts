// Adapted from junflow/src/ai/retry.ts - reused as-is

export interface RetryOptions {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  retryableCheck?: (error: unknown) => boolean;
}

const DEFAULT_OPTIONS: RetryOptions = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
};

export function isRateLimitError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  if ('code' in error && (error as { code: string }).code === 'RATE_LIMIT_ERROR') return true;
  if ('status' in error && (error as { status: number }).status === 429) return true;
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    if (msg.includes('rate limit') || msg.includes('429')) return true;
  }
  return false;
}

function isRetryableError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  if ('code' in error) {
    const code = (error as { code: string }).code;
    if (code === 'RATE_LIMIT_ERROR' || code === 'NETWORK_ERROR') return true;
  }
  if ('status' in error) {
    const status = (error as { status: number }).status;
    if (status === 429 || status === 502 || status === 503 || status === 504) return true;
  }
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    if (
      msg.includes('rate limit') || msg.includes('429') ||
      msg.includes('econnrefused') || msg.includes('etimedout') ||
      msg.includes('enotfound') || msg.includes('socket hang up') ||
      msg.includes('network') || msg.includes('502') ||
      msg.includes('503') || msg.includes('504')
    ) return true;
  }
  return false;
}

function computeDelay(attempt: number, baseDelayMs: number, maxDelayMs: number): number {
  const exponential = baseDelayMs * Math.pow(2, attempt);
  const jitter = exponential * (0.5 + Math.random() * 0.5);
  return Math.min(jitter, maxDelayMs);
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options?: Partial<RetryOptions>,
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const check = opts.retryableCheck ?? isRetryableError;

  let lastError: unknown;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (!check(error)) throw error;
      if (attempt >= opts.maxRetries) throw error;
      const delay = computeDelay(attempt, opts.baseDelayMs, opts.maxDelayMs);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
