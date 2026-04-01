import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: '인증 필요' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const quizId = searchParams.get('quizId');
  if (!quizId) return Response.json({ error: 'quizId 필요' }, { status: 400 });

  const { data } = await supabase
    .from('quiz_questions')
    .select('*')
    .eq('quiz_id', quizId)
    .order('sort_order');

  return Response.json(data || []);
}
