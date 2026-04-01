import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: '인증 필요' }, { status: 401 });
  }

  const [courses, conversations, messages, documents, memories] = await Promise.all([
    supabase
      .from('courses')
      .select('id', { count: 'exact', head: true })
      .eq('is_archived', false),
    supabase
      .from('conversations')
      .select('id', { count: 'exact', head: true }),
    supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'user'),
    supabase
      .from('documents')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'completed'),
    supabase
      .from('course_memories')
      .select('id', { count: 'exact', head: true }),
  ]);

  return Response.json({
    courses: courses.count ?? 0,
    conversations: conversations.count ?? 0,
    messages: messages.count ?? 0,
    documents: documents.count ?? 0,
    memories: memories.count ?? 0,
  });
}
