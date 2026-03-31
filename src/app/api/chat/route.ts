import { createClient } from '@/lib/supabase/server';
import { createProvider, getAppDefaultKey } from '@/lib/ai/provider-factory';
import type { ProviderName } from '@/lib/ai/types';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return Response.json({ error: 'no user' }, { status: 401 });
    }

    const body = await request.json();
    const { conversationId, message, provider: providerName = 'gemini' } = body as {
      conversationId: string;
      message: string;
      provider?: ProviderName;
    };

    if (!conversationId || !message) {
      return Response.json({ error: 'missing fields' }, { status: 400 });
    }

    const { data: conversation, error: convErr } = await supabase
      .from('conversations')
      .select('*, courses(*)')
      .eq('id', conversationId)
      .single();

    if (convErr || !conversation) {
      return Response.json({ step: 'conv', error: convErr?.message ?? 'not found' }, { status: 500 });
    }

    // 사용자 메시지 저장
    await supabase.from('messages').insert({
      conversation_id: conversationId,
      role: 'user',
      content: message,
    });

    // 이전 메시지
    const { data: history } = await supabase
      .from('messages')
      .select('role, content')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(20);

    // 프롬프트
    const course = conversation.courses as Record<string, unknown> | null;
    const systemParts = [
      '당신은 대학생의 AI 학습 비서 "올A+"입니다.',
      '학생이 이해하기 쉽도록 친절하고 명확하게 설명해주세요.',
      '한국어로 답변하되, 전공 용어는 영어를 병기해도 좋습니다.',
    ];
    if (course) {
      systemParts.push(`\n## 현재 과목: ${course.name}`);
      if (course.professor) systemParts.push(`담당 교수: ${course.professor}`);
    }
    const systemPrompt = systemParts.join('\n');

    const msgs = (history || []).map((m: { role: string; content: string }) =>
      `${m.role === 'user' ? '학생' : 'AI'}: ${m.content}`
    ).join('\n\n');
    const userPrompt = msgs ? `${msgs}\n\n학생: ${message}` : message;

    // AI
    const apiKey = getAppDefaultKey(providerName);
    if (!apiKey) {
      return Response.json({ error: `No key for ${providerName}` }, { status: 500 });
    }
    const provider = await createProvider(providerName, apiKey);

    const result = await provider.complete({
      systemPrompt,
      userPrompt,
      maxTokens: 2048,
      temperature: 0.7,
    });

    // AI 메시지 저장
    await supabase.from('messages').insert({
      conversation_id: conversationId,
      role: 'assistant',
      content: result.content,
      provider: providerName,
      model: result.model,
    });

    // 제목 자동 생성
    if (!conversation.title) {
      const title = message.length > 30 ? message.slice(0, 30) + '...' : message;
      await supabase.from('conversations').update({ title }).eq('id', conversationId);
    }

    // SSE 응답
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'chunk', content: result.content })}\n\n`));
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`));
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
