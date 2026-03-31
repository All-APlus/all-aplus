import { createClient } from '@/lib/supabase/server';
import { extractMemories } from '@/lib/memory/extractor';
import { saveMemories } from '@/lib/memory/manager';

/** POST /api/memories/extract — 대화에서 메모리 추출 + 저장 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: '로그인이 필요합니다' }, { status: 401 });
  }

  const { conversationId } = await request.json();
  if (!conversationId) {
    return Response.json({ error: 'conversationId가 필요합니다' }, { status: 400 });
  }

  // 대화 + 과목 확인
  const { data: conversation } = await supabase
    .from('conversations')
    .select('course_id')
    .eq('id', conversationId)
    .single();

  if (!conversation) {
    return Response.json({ error: '대화를 찾을 수 없습니다' }, { status: 404 });
  }

  // 최근 메시지 가져오기
  const { data: messages } = await supabase
    .from('messages')
    .select('role, content')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(30);

  if (!messages || messages.length < 2) {
    return Response.json({ saved: 0, merged: 0 });
  }

  // AI로 메모리 추출
  const extracted = await extractMemories(messages);
  if (extracted.length === 0) {
    return Response.json({ saved: 0, merged: 0 });
  }

  // 중복 검사 + 저장
  const result = await saveMemories(
    conversation.course_id,
    user.id,
    conversationId,
    extracted,
  );

  return Response.json(result);
}
