import { createClient } from '@/lib/supabase/server';
import { createProvider, getAppDefaultKey } from '@/lib/ai/provider-factory';
import { buildContext } from '@/lib/chat/context-builder';
import type { ProviderName, StreamChunk } from '@/lib/ai/types';

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

    // 제목 자동 생성
    if (!conversation.title) {
      const title = message.length > 30 ? message.slice(0, 30) + '...' : message;
      await supabase.from('conversations').update({ title }).eq('id', conversationId);
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
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
