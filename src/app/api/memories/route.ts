import { createClient } from '@/lib/supabase/server';

/** GET /api/memories?courseId=xxx — 과목별 메모리 목록 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: '로그인이 필요합니다' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const courseId = searchParams.get('courseId');
  const type = searchParams.get('type');

  if (!courseId) {
    return Response.json({ error: 'courseId가 필요합니다' }, { status: 400 });
  }

  let query = supabase
    .from('course_memories')
    .select('id, memory_type, content, importance, source_conversation_id, metadata, created_at, updated_at')
    .eq('course_id', courseId)
    .order('importance', { ascending: false })
    .order('updated_at', { ascending: false });

  if (type) {
    query = query.eq('memory_type', type);
  }

  const { data, error } = await query.limit(50);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json(data);
}

/** POST /api/memories — 수동 메모 추가 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: '로그인이 필요합니다' }, { status: 401 });
  }

  const { courseId, content } = await request.json();
  if (!courseId || !content) {
    return Response.json({ error: 'courseId와 content가 필요합니다' }, { status: 400 });
  }

  // 임베딩 생성
  const { embed } = await import('@/lib/ai/embeddings');
  const embedding = await embed(content);

  const { data, error } = await supabase
    .from('course_memories')
    .insert({
      course_id: courseId,
      user_id: user.id,
      memory_type: 'user_note',
      content,
      embedding: JSON.stringify(embedding),
      importance: 0.7,
    })
    .select()
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json(data);
}

/** DELETE /api/memories?id=xxx — 메모리 삭제 */
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
    .from('course_memories')
    .delete()
    .eq('id', id);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ ok: true });
}
