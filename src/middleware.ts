import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import { checkRateLimit, PER_MINUTE_LIMITS } from '@/lib/rate-limit';

export async function middleware(request: NextRequest) {
  // API 뮤테이션 요청에 CSRF (Origin) 체크
  if (
    request.nextUrl.pathname.startsWith('/api/') &&
    ['POST', 'PATCH', 'PUT', 'DELETE'].includes(request.method)
  ) {
    const origin = request.headers.get('origin');
    const host = request.headers.get('host');
    if (origin && host) {
      try {
        const originHost = new URL(origin).host;
        if (originHost !== host) {
          return NextResponse.json(
            { error: '허용되지 않는 요청 출처입니다' },
            { status: 403 },
          );
        }
      } catch {
        // origin 파싱 실패 시 통과 (개발 환경 대응)
      }
    }
  }

  // API 요청에 분당 rate limiting 적용
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || 'unknown';

    const isAiRoute = ['/api/chat', '/api/quiz', '/api/flashcards/generate'].some(
      (route) => request.nextUrl.pathname.startsWith(route),
    );

    const limit = isAiRoute ? PER_MINUTE_LIMITS.ai_action : PER_MINUTE_LIMITS.authenticated;
    const key = `${ip}:${isAiRoute ? 'ai' : 'api'}`;
    const { success, remaining } = checkRateLimit(key, limit);

    if (!success) {
      return NextResponse.json(
        { error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' },
        {
          status: 429,
          headers: { 'Retry-After': '60', 'X-RateLimit-Remaining': '0' },
        },
      );
    }

    // rate limit 헤더 추가
    const response = await handleSession(request);
    response.headers.set('X-RateLimit-Remaining', String(remaining));
    return response;
  }

  return handleSession(request);
}

async function handleSession(request: NextRequest) {
  try {
    return await updateSession(request);
  } catch {
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
