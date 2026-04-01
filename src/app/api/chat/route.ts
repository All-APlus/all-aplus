import { createClient } from '@/lib/supabase/server';
import { createProvider, getAppDefaultKey } from '@/lib/ai/provider-factory';
import { buildContext } from '@/lib/chat/context-builder';
import { checkAndIncrementUsage, rateLimitResponse, logTokenUsage } from '@/lib/usage-tracker';
import { validateMessage } from '@/lib/validation';
import { logError } from '@/lib/logger';
import type { ProviderName, StreamChunk } from '@/lib/ai/types';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return Response.json({ error: 'no user' }, { status: 401 });
    }

    // 일일 사용량 체크
    const usage = await checkAndIncrementUsage(supabase as never, user.id, 'chat');
    if (!usage.allowed) {
      return rateLimitResponse('채팅', usage.current, usage.limit);
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

    const msgCheck = validateMessage(message);
    if (!msgCheck.valid) {
      return Response.json({ error: msgCheck.error }, { status: 400 });
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

    // context-builder로 시스템 프롬프트 + RAG 조립
    const course = conversation.courses as Record<string, unknown> | null;
    const { systemPrompt, sources } = await buildContext({
      courseId: conversation.course_id,
      courseName: (course?.name as string) || '과목',
      professor: course?.professor as string | null,
      systemContext: course?.system_context as string | null,
      userMessage: message,
    });

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

    // AI 메시지 저장 (출처 청크 ID 포함)
    const contextChunks = sources.map((s) => s.id);
    await supabase.from('messages').insert({
      conversation_id: conversationId,
      role: 'assistant',
      content: result.content,
      provider: providerName,
      model: result.model,
      context_chunks: contextChunks.length > 0 ? contextChunks : null,
    });

    // 토큰 사용량 기록
    if (result.tokensUsed) {
      logTokenUsage(supabase as never, user.id, {
        provider: providerName,
        model: result.model,
        inputTokens: result.tokensUsed.input,
        outputTokens: result.tokensUsed.output,
        action: 'chat',
      }).catch(console.error);
    }

    // 제목 자동 생성
    if (!conversation.title) {
      const title = message.length > 30 ? message.slice(0, 30) + '...' : message;
      await supabase.from('conversations').update({ title }).eq('id', conversationId);
    }

    // 5턴마다 메모리 추출 (비동기, 응답 차단 안 함)
    const msgCount = (history?.length ?? 0) + 2;
    if (msgCount % 10 === 0 && msgCount >= 10) {
      import('@/lib/memory/extractor').then(({ extractMemories }) =>
        import('@/lib/memory/manager').then(({ saveMemories }) =>
          extractMemories(history || []).then((extracted) => {
            if (extracted.length > 0) {
              saveMemories(conversation.course_id, user.id, conversationId, extracted).catch(console.error);
            }
          })
        )
      ).catch(console.error);
    }

    // SSE 응답
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        const chunk: StreamChunk = { type: 'chunk', content: result.content };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));

        if (sources.length > 0) {
          const srcChunk: StreamChunk = { type: 'sources', sources };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(srcChunk)}\n\n`));
        }

        const done: StreamChunk = { type: 'done' };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(done)}\n\n`));
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
    logError(err, { action: 'chat', route: '/api/chat' });
    return Response.json({ error: '채팅 처리 중 오류가 발생했습니다' }, { status: 500 });
  }
}
