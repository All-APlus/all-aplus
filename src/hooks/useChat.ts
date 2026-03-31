'use client';

import { useState, useCallback, useRef } from 'react';
import type { Message } from '@/types/database';
import type { ProviderName, SourceReference } from '@/lib/ai/types';

interface UseChatOptions {
  conversationId: string;
  initialMessages?: Message[];
  provider?: ProviderName;
}

export function useChat({ conversationId, initialMessages = [], provider = 'gemini' }: UseChatOptions) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sources, setSources] = useState<Record<string, SourceReference[]>>({});
  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(async (content?: string) => {
    const text = (content || input).trim();
    if (!text || isLoading) return;

    setInput('');
    setIsLoading(true);

    // 낙관적 사용자 메시지 추가
    const userMessage: Message = {
      id: crypto.randomUUID(),
      conversation_id: conversationId,
      role: 'user',
      content: text,
      provider: null,
      model: null,
      tokens_used: null,
      context_chunks: null,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);

    // AI 응답 플레이스홀더
    const assistantId = crypto.randomUUID();
    setMessages((prev) => [
      ...prev,
      {
        id: assistantId,
        conversation_id: conversationId,
        role: 'assistant',
        content: '',
        provider,
        model: null,
        tokens_used: null,
        context_chunks: null,
        created_at: new Date().toISOString(),
      },
    ]);

    try {
      abortRef.current = new AbortController();
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId, message: text, provider }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        const errBody = await res.text();
        throw new Error(`Chat ${res.status}: ${errBody.substring(0, 200)}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No reader');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const json = JSON.parse(line.slice(6));

          if (json.type === 'chunk') {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? { ...m, content: m.content + json.content }
                  : m
              )
            );
          } else if (json.type === 'sources' && json.sources) {
            setSources((prev) => ({ ...prev, [assistantId]: json.sources }));
          }
        }
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: `오류: ${(err as Error).message}` }
            : m
        )
      );
    } finally {
      setIsLoading(false);
      abortRef.current = null;
    }
  }, [conversationId, input, isLoading, provider]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    setIsLoading(false);
  }, []);

  return { messages, input, setInput, sendMessage, isLoading, stop, sources };
}
