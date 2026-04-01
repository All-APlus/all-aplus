import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: '인증 필요' }, { status: 401 });

  const { quizId, answers } = await request.json();
  // answers: { questionId: string, answer: string }[]

  if (!quizId || !Array.isArray(answers)) {
    return Response.json({ error: 'quizId와 answers 필요' }, { status: 400 });
  }

  // 문제 조회
  const { data: questions } = await supabase
    .from('quiz_questions')
    .select('*')
    .eq('quiz_id', quizId)
    .order('sort_order');

  if (!questions || questions.length === 0) {
    return Response.json({ error: '퀴즈를 찾을 수 없습니다' }, { status: 404 });
  }

  // 채점
  let score = 0;
  const answerMap = new Map(answers.map((a: { questionId: string; answer: string }) => [a.questionId, a.answer]));

  for (const q of questions) {
    const userAnswer = answerMap.get(q.id) || '';
    const isCorrect = userAnswer.trim().toLowerCase() === q.correct_answer.trim().toLowerCase();
    if (isCorrect) score++;

    await supabase
      .from('quiz_questions')
      .update({ user_answer: userAnswer, is_correct: isCorrect })
      .eq('id', q.id);
  }

  // 퀴즈 점수 업데이트
  await supabase
    .from('quizzes')
    .update({ score, total: questions.length })
    .eq('id', quizId);

  return Response.json({ score, total: questions.length });
}
