import { createClient } from '@/lib/supabase/server';

/** GET /api/documents?courseId=xxx — 과목별 문서 목록 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: '로그인이 필요합니다' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const courseId = searchParams.get('courseId');

  if (!courseId) {
    return Response.json({ error: 'courseId가 필요합니다' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('course_id', courseId)
    .order('created_at', { ascending: false });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json(data);
}

/** DELETE /api/documents?id=xxx — 문서 삭제 (Storage + chunks 포함) */
export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: '로그인이 필요합니다' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const docId = searchParams.get('id');

  if (!docId) {
    return Response.json({ error: 'id가 필요합니다' }, { status: 400 });
  }

  // 문서 조회 (Storage 경로 확인)
  const { data: doc } = await supabase
    .from('documents')
    .select('storage_path')
    .eq('id', docId)
    .single();

  // Storage 파일 삭제
  if (doc?.storage_path) {
    await supabase.storage.from('documents').remove([doc.storage_path]);
  }

  // DB 삭제 (CASCADE로 chunks도 삭제)
  const { error } = await supabase
    .from('documents')
    .delete()
    .eq('id', docId);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ ok: true });
}
