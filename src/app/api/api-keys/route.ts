import { createClient } from '@/lib/supabase/server';
import { encrypt, decrypt, createKeyHint } from '@/lib/crypto';
import { createProvider } from '@/lib/ai/provider-factory';
import type { ProviderName } from '@/lib/ai/types';

/** GET /api/api-keys — 등록된 키 목록 (힌트만) */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: '로그인이 필요합니다' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('api_keys')
    .select('id, provider, key_hint, is_valid, created_at')
    .order('created_at', { ascending: true });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json(data);
}

/** POST /api/api-keys — 키 등록 + 테스트 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: '로그인이 필요합니다' }, { status: 401 });
  }

  const { provider, apiKey } = await request.json() as {
    provider: ProviderName;
    apiKey: string;
  };

  if (!provider || !apiKey) {
    return Response.json({ error: 'provider와 apiKey가 필요합니다' }, { status: 400 });
  }

  // 키 유효성 테스트
  let isValid = true;
  try {
    const providerInstance = await createProvider(provider, apiKey);
    await providerInstance.complete({
      systemPrompt: 'Reply with "ok"',
      userPrompt: 'test',
      maxTokens: 10,
      temperature: 0,
    });
  } catch {
    isValid = false;
  }

  const encryptedKey = encrypt(apiKey);
  const keyHint = createKeyHint(apiKey);

  // upsert (provider별 1개만)
  const { data, error } = await supabase
    .from('api_keys')
    .upsert(
      {
        user_id: user.id,
        provider,
        encrypted_key: encryptedKey,
        key_hint: keyHint,
        is_valid: isValid,
      },
      { onConflict: 'user_id,provider' },
    )
    .select('id, provider, key_hint, is_valid, created_at')
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ ...data, tested: true });
}

/** DELETE /api/api-keys?id=xxx — 키 삭제 */
export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: '로그인이 필요합니다' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return Response.json({ error: 'id가 필요합니다' }, { status: 400 });
  }

  const { error } = await supabase
    .from('api_keys')
    .delete()
    .eq('id', id);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ ok: true });
}

/**
 * 사용자의 BYOK 키 가져오기 (서버 내부용)
 */
export async function getUserApiKey(
  userId: string,
  provider: ProviderName,
): Promise<string | null> {
  const { createClient: createAdmin } = await import('@/lib/supabase/server');
  const supabase = await createAdmin();

  const { data } = await supabase
    .from('api_keys')
    .select('encrypted_key, is_valid')
    .eq('user_id', userId)
    .eq('provider', provider)
    .eq('is_valid', true)
    .single();

  if (!data) return null;
  return decrypt(data.encrypted_key);
}
