import { createClient } from '@/lib/supabase/server';

/** PATCH /api/conversations — 대화 수정 (제목, 고정) */
export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: '로그인이 필요합니다' }, { status: 401 });
  }

  const body = await request.json();
  const { id, title, is_pinned } = body;

  if (!id) {
    return Response.json({ error: 'id가 필요합니다' }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (title !== undefined) updates.title = title;
  if (is_pinned !== undefined) updates.is_pinned = is_pinned;

  if (Object.keys(updates).length === 0) {
    return Response.json({ error: '수정할 항목이 없습니다' }, { status: 400 });
  }

  const { error } = await supabase
    .from('conversations')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    return Response.json({ error: '수정에 실패했습니다' }, { status: 500 });
  }

  return Response.json({ success: true });
}

/** DELETE /api/conversations?id=xxx — 대화 삭제 (메시지 포함) */
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

  // 메시지 먼저 삭제
  await supabase
    .from('messages')
    .delete()
    .eq('conversation_id', id);

  const { error } = await supabase
    .from('conversations')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    return Response.json({ error: '삭제에 실패했습니다' }, { status: 500 });
  }

  return Response.json({ success: true });
}
