import { createClient } from '@/lib/supabase/server';

/** GET /api/templates?category=xxx — 템플릿 목록 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: '로그인이 필요합니다' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');

  // 시스템 템플릿 + 본인 커스텀 템플릿
  let query = supabase
    .from('prompt_templates')
    .select('*')
    .or(`is_system.eq.true,user_id.eq.${user.id}`)
    .order('sort_order', { ascending: true });

  if (category) {
    query = query.eq('category', category);
  }

  const { data, error } = await query;

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json(data);
}

/** POST /api/templates — 커스텀 템플릿 생성 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: '로그인이 필요합니다' }, { status: 401 });
  }

  const body = await request.json();
  const { name, description, systemPrompt, userPromptTemplate, category, variables } = body;

  if (!name || !systemPrompt || !userPromptTemplate || !category) {
    return Response.json({ error: '필수 필드가 누락되었습니다' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('prompt_templates')
    .insert({
      name,
      description,
      system_prompt: systemPrompt,
      user_prompt_template: userPromptTemplate,
      category,
      variables: variables || [],
      is_system: false,
      user_id: user.id,
    })
    .select()
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json(data);
}

/** DELETE /api/templates?id=xxx — 커스텀 템플릿 삭제 */
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
    .from('prompt_templates')
    .delete()
    .eq('id', id)
    .eq('is_system', false);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ ok: true });
}
