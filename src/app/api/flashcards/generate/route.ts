import { createClient } from '@/lib/supabase/server';
import { createProvider, getAppDefaultKey } from '@/lib/ai/provider-factory';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: '인증 필요' }, { status: 401 });

  const { courseId, topic, count = 10 } = await request.json();
  if (!courseId) return Response.json({ error: 'courseId 필요' }, { status: 400 });

  const { data: course } = await supabase
    .from('courses')
    .select('name')
    .eq('id', courseId)
    .single();
  if (!course) return Response.json({ error: '과목 없음' }, { status: 404 });

  // 자료 청크
  const { data: chunks } = await supabase
    .from('document_chunks')
    .select('content')
    .eq('course_id', courseId)
    .limit(10);

  const context = chunks?.map((c) => c.content).join('\n\n') || '';

  const systemPrompt = `당신은 플래시카드 생성 전문가입니다. 학습 자료를 기반으로 핵심 개념 플래시카드를 만들어주세요.

반드시 아래 JSON 형식으로만 응답하세요:
[
  { "front": "질문/개념", "back": "답/설명" }
]`;

  const userPrompt = `과목: ${course.name}
${topic ? `주제: ${topic}` : '과목 전반'}
카드 수: ${count}개

## 참고 자료
${context || '(등록된 자료 없음)'}

위 자료에서 핵심 개념 ${count}개를 플래시카드로 만들어주세요.`;

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

    const cleaned = result.content.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
    const cards = JSON.parse(cleaned);

    if (!Array.isArray(cards) || cards.length === 0) {
      throw new Error('카드 생성 실패');
    }

    // 덱 생성
    const { data: deck, error: deckErr } = await supabase
      .from('flashcard_decks')
      .insert({
        course_id: courseId,
        user_id: user.id,
        title: topic ? `${course.name} — ${topic}` : `${course.name} 카드`,
        card_count: cards.length,
      })
      .select()
      .single();

    if (deckErr || !deck) {
      return Response.json({ error: '덱 생성 실패' }, { status: 500 });
    }

    const cardRows = cards.map((c: { front: string; back: string }) => ({
      deck_id: deck.id,
      front: c.front,
      back: c.back,
    }));

    await supabase.from('flashcards').insert(cardRows);

    return Response.json({ deckId: deck.id, cardCount: cards.length });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ error: `카드 생성 실패: ${msg}` }, { status: 500 });
  }
}
