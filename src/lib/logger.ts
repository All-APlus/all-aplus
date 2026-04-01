// 구조화된 에러 로깅 유틸리티

interface LogContext {
  action: string;
  userId?: string;
  route?: string;
  [key: string]: unknown;
}

/** 구조화된 에러 로그 */
export function logError(error: unknown, context: LogContext): void {
  const entry = {
    level: 'error',
    timestamp: new Date().toISOString(),
    action: context.action,
    userId: context.userId || 'anonymous',
    route: context.route,
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack?.split('\n').slice(0, 3).join('\n') : undefined,
    ...Object.fromEntries(
      Object.entries(context).filter(([k]) => !['action', 'userId', 'route'].includes(k))
    ),
  };

  console.error(JSON.stringify(entry));
}

/** 구조화된 정보 로그 */
export function logInfo(message: string, context: LogContext): void {
  const entry = {
    level: 'info',
    timestamp: new Date().toISOString(),
    message,
    ...context,
  };

  console.log(JSON.stringify(entry));
}

/** API 에러 응답 생성 (일관된 포맷) */
export function apiError(
  message: string,
  status: number,
  details?: Record<string, unknown>,
): Response {
  return Response.json(
    {
      error: message,
      status,
      timestamp: new Date().toISOString(),
      ...details,
    },
    { status },
  );
}
