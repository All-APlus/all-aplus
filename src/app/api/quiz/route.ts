import { createClient } from '@/lib/supabase/server';
import { createProvider, getAppDefaultKey } from '@/lib/ai/provider-factory';
import { checkAndIncrementUsage, rateLimitResponse, logTokenUsage } from '@/lib/usage-tracker';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: '인증 필요' }, { status: 401 });

  // 일일 사용량 체크
  const usage = await checkAndIncrementUsage(supabase as never, user.id, 'quiz');
  if (!usage.allowed) {
    return rateLimitResponse('퀴즈', usage.current, usage.limit);
  }

  const { courseId, topic, count = 5, type = 'multiple_choice' } = await request.json();
  if (!courseId) return Response.json({ error: 'courseId 필요' }, { status: 400 });

  // 과목 정보
  const { data: course } = await supabase
    .from('courses')
    .select('name, professor')
    .eq('id', courseId)
    .single();
  if (!course) return Response.json({ error: '과목 없음' }, { status: 404 });

  // 자료 청크 가져오기 (최대 10개)
  const { data: chunks } = await supabase
    .from('document_chunks')
    .select('content')
    .eq('course_id', courseId)
    .limit(10);

  const context = chunks?.map((c) => c.content).join('\n\n') || '';

  const questionType = type === 'short_answer' ? '단답형' : '객관식 (4지선다)';
  const topicGuide = topic ? `주제: ${topic}` : '과목 전반';

  const systemPrompt = `당신은 대학 시험 출제 전문가입니다. 주어진 학습 자료를 기반으로 ${questionType} 퀴즈를 만들어주세요.

반드시 아래 JSON 형식으로만 응답하세요. 다른 텍스트를 포함하지 마세요.
${type === 'multiple_choice' ? `
[
  {
    "question": "질문",
    "options": ["선택1", "선택2", "선택3", "선택4"],
    "correct_answer": "정답 텍스트",
    "explanation": "해설"
  }
]` : `
[
  {
    "question": "질문",
    "correct_answer": "정답",
    "explanation": "해설"
  }
]`}`;

  const userPrompt = `과목: ${course.name}
${topicGuide}
문제 수: ${count}개

## 참고 자료
${context || '(등록된 자료 없음 — 일반적인 지식으로 출제)'}

위 자료를 기반으로 ${count}개의 ${questionType} 문제를 JSON 배열로 생성해주세요.`;

  try {
    const apiKey = getAppDefaultKey('gemini');
    if (!apiKey) return Response.json({ error: 'API 키 없음' }, { status: 500 });

    const provider = await createProvider('gemini', apiKey);
    const result = await provider.complete({
      systemPrompt,
      userPrompt,
      temperature: 0.7,
      maxTokens: 4096,
    });

    // 토큰 기록
    if (result.tokensUsed) {
      logTokenUsage(supabase as never, user.id, {
        provider: 'gemini', model: result.model,
        inputTokens: result.tokensUsed.input, outputTokens: result.tokensUsed.output,
        action: 'quiz',
      }).catch(console.error);
    }

    // JSON 파싱 (코드블록 제거)
    const cleaned = result.content.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
    const questions = JSON.parse(cleaned);

    if (!Array.isArray(questions) || questions.length === 0) {
      throw new Error('퀴즈 생성 실패');
    }

    // DB 저장
    const { data: quiz, error: quizErr } = await supabase
      .from('quizzes')
      .insert({
        course_id: courseId,
        user_id: user.id,
        title: topic ? `${course.name} — ${topic}` : `${course.name} 퀴즈`,
        question_count: questions.length,
        total: questions.length,
      })
      .select()
      .single();

    if (quizErr || !quiz) {
      return Response.json({ error: '퀴즈 저장 실패' }, { status: 500 });
    }

    const questionRows = questions.map((q: Record<string, unknown>, i: number) => ({
      quiz_id: quiz.id,
      question_type: type,
      question: q.question,
      options: type === 'multiple_choice' ? q.options : null,
      correct_answer: q.correct_answer,
      explanation: q.explanation || null,
      sort_order: i,
    }));

    await supabase.from('quiz_questions').insert(questionRows);

    return Response.json({ quizId: quiz.id, questionCount: questions.length });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ error: `퀴즈 생성 실패: ${msg}` }, { status: 500 });
  }
}

// 퀴즈 목록 조회
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: '인증 필요' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const courseId = searchParams.get('courseId');

  let query = supabase
    .from('quizzes')
    .select('*')
    .order('created_at', { ascending: false });

  if (courseId) query = query.eq('course_id', courseId);

  const { data } = await query;
  return Response.json(data || []);
}
