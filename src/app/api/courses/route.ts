import { createClient } from '@/lib/supabase/server';

/** PATCH /api/courses — 과목 수정 */
export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: '로그인이 필요합니다' }, { status: 401 });
  }

  const body = await request.json();
  const { id, name, code, professor, semester, color, is_archived } = body;

  if (!id) {
    return Response.json({ error: 'id가 필요합니다' }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name;
  if (code !== undefined) updates.code = code;
  if (professor !== undefined) updates.professor = professor;
  if (semester !== undefined) updates.semester = semester;
  if (color !== undefined) updates.color = color;
  if (is_archived !== undefined) updates.is_archived = is_archived;

  if (Object.keys(updates).length === 0) {
    return Response.json({ error: '수정할 항목이 없습니다' }, { status: 400 });
  }

  const { error } = await supabase
    .from('courses')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    return Response.json({ error: '수정에 실패했습니다' }, { status: 500 });
  }

  return Response.json({ success: true });
}

/** DELETE /api/courses?id=xxx — 과목 삭제 (관련 데이터 포함) */
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

  // 관련 데이터 cascade 삭제 (순서 중요: FK 의존성)
  const courseFilter = { course_id: id };

  // 1. 메시지 (conversations -> messages)
  const { data: convs } = await supabase
    .from('conversations')
    .select('id')
    .eq('course_id', id);

  if (convs && convs.length > 0) {
    const convIds = convs.map((c) => c.id);
    await supabase.from('messages').delete().in('conversation_id', convIds);
  }

  // 2. 대화, 문서 청크, 문서, 메모리, 교수 프로필, 퀴즈 문제, 퀴즈, 플래시카드, 덱
  await Promise.all([
    supabase.from('conversations').delete().eq('course_id', id),
    supabase.from('document_chunks').delete().eq('course_id', id),
    supabase.from('course_memories').delete().eq('course_id', id),
    supabase.from('professor_profiles').delete().eq('course_id', id),
  ]);

  await supabase.from('documents').delete().eq('course_id', id);

  // 3. 과목 자체 삭제
  const { error } = await supabase
    .from('courses')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    return Response.json({ error: '삭제에 실패했습니다' }, { status: 500 });
  }

  return Response.json({ success: true });
}
