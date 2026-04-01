// 메모리 기반 sliding window rate limiter (Vercel serverless 환경)
// 서버리스 특성상 인스턴스 간 공유 안 됨 → 대략적 제한, DB 기반 일일 한도가 진짜 방어선

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// 주기적 정리 (메모리 누수 방지)
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.resetAt < now) store.delete(key);
  }
}, 60_000);

/**
 * 분당 요청 제한 (인메모리)
 * @returns { success: boolean, remaining: number }
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs = 60_000,
): { success: boolean; remaining: number } {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { success: true, remaining: limit - 1 };
  }

  entry.count++;
  if (entry.count > limit) {
    return { success: false, remaining: 0 };
  }

  return { success: true, remaining: limit - entry.count };
}

// 액션별 일일 한도
export const DAILY_LIMITS: Record<string, number> = {
  chat: 100,
  quiz: 10,
  flashcard: 10,
  document: 20,
  youtube: 10,
};

// 분당 한도
export const PER_MINUTE_LIMITS = {
  authenticated: 60,
  ai_action: 10,
  unauthenticated: 10,
};
