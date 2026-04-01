import { DAILY_LIMITS } from './rate-limit';

type SupabaseClient = {
  rpc: (fn: string, params: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
  from: (table: string) => {
    insert: (data: Record<string, unknown>) => Promise<{ error: unknown }>;
    select: (columns: string) => {
      eq: (col: string, val: unknown) => {
        eq: (col: string, val: unknown) => {
          single: () => Promise<{ data: { count: number } | null; error: unknown }>;
        };
      };
    };
  };
};

/**
 * 일일 사용량 체크 + 증가
 * @returns { allowed: boolean, current: number, limit: number }
 */
export async function checkAndIncrementUsage(
  supabase: SupabaseClient,
  userId: string,
  action: string,
): Promise<{ allowed: boolean; current: number; limit: number }> {
  const limit = DAILY_LIMITS[action] ?? 50;

  const { data, error } = await supabase.rpc('increment_usage', {
    p_user_id: userId,
    p_action: action,
  });

  if (error) {
    // RPC 실패 시 허용 (가용성 우선)
    console.error('Usage tracking error:', error);
    return { allowed: true, current: 0, limit };
  }

  const current = (data as number) ?? 0;
  return { allowed: current <= limit, current, limit };
}

/**
 * 토큰 사용량 기록
 */
export async function logTokenUsage(
  supabase: SupabaseClient,
  userId: string,
  params: {
    provider: string;
    model?: string;
    inputTokens: number;
    outputTokens: number;
    action: string;
  },
): Promise<void> {
  const { error } = await supabase.from('token_usage').insert({
    user_id: userId,
    provider: params.provider,
    model: params.model || null,
    input_tokens: params.inputTokens,
    output_tokens: params.outputTokens,
    action: params.action,
    date: new Date().toISOString().split('T')[0],
  });

  if (error) {
    console.error('Token usage logging error:', error);
  }
}

/**
 * 429 응답 생성 헬퍼
 */
export function rateLimitResponse(action: string, current: number, limit: number) {
  return Response.json(
    {
      error: `일일 ${action} 사용 한도(${limit}회)를 초과했습니다. 내일 다시 시도해주세요.`,
      current,
      limit,
      resetAt: getNextMidnight(),
    },
    { status: 429 },
  );
}

function getNextMidnight(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return tomorrow.toISOString();
}
