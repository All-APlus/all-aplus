'use client';

import { useEffect, useRef } from 'react';
import { useChat } from '@/hooks/useChat';
import type { Message } from '@/types/database';
import type { ProviderName } from '@/lib/ai/types';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Send, Square, Bot, User, FileText } from 'lucide-react';

interface ChatInterfaceProps {
  conversationId: string;
  initialMessages: Message[];
  courseName: string;
  provider?: ProviderName;
}

export function ChatInterface({
  conversationId,
  initialMessages,
  courseName,
  provider = 'gemini',
}: ChatInterfaceProps) {
  const { messages, input, setInput, sendMessage, isLoading, stop, sources } = useChat({
    conversationId,
    initialMessages,
    provider,
  });
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* 메시지 영역 */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Bot className="h-12 w-12 text-indigo-300 mb-4" />
            <h3 className="text-lg font-semibold mb-1">
              {courseName} 학습을 도와드릴게요
            </h3>
            <p className="text-sm text-muted-foreground max-w-md">
              강의 내용 질문, 개념 설명, 시험 대비, 리포트 작성 등<br />
              무엇이든 물어보세요!
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              'flex gap-3 max-w-3xl',
              msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''
            )}
          >
            <div
              className={cn(
                'h-8 w-8 rounded-full flex items-center justify-center shrink-0',
                msg.role === 'user'
                  ? 'bg-indigo-100 text-indigo-600'
                  : 'bg-gray-100 text-gray-600'
              )}
            >
              {msg.role === 'user' ? (
                <User className="h-4 w-4" />
              ) : (
                <Bot className="h-4 w-4" />
              )}
            </div>
            <div
              className={cn(
                'rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap',
                msg.role === 'user'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white border shadow-sm'
              )}
            >
              {msg.content || (
                <span className="inline-flex gap-1">
                  <span className="animate-bounce">.</span>
                  <span className="animate-bounce" style={{ animationDelay: '0.1s' }}>.</span>
                  <span className="animate-bounce" style={{ animationDelay: '0.2s' }}>.</span>
                </span>
              )}
              {/* 출처 표시 */}
              {msg.role === 'assistant' && sources[msg.id] && sources[msg.id].length > 0 && (
                <div className="mt-2 pt-2 border-t border-gray-100">
                  <p className="text-xs text-gray-400 mb-1">참고 자료</p>
                  <div className="flex flex-wrap gap-1">
                    {sources[msg.id].map((src, i) => (
                      <span
                        key={src.id}
                        className="inline-flex items-center gap-1 text-xs bg-gray-50 text-gray-600 px-2 py-0.5 rounded-md"
                        title={src.contentPreview}
                      >
                        <FileText className="h-3 w-3" />
                        [{i + 1}] {src.sourceFile}
                        {src.page ? ` p.${src.page}` : ''}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 입력 영역 */}
      <div className="border-t bg-white p-4">
        <div className="max-w-3xl mx-auto flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="메시지를 입력하세요... (Shift+Enter로 줄바꿈)"
            rows={1}
            className="flex-1 resize-none rounded-xl border bg-gray-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            disabled={isLoading}
          />
          {isLoading ? (
            <Button
              variant="outline"
              size="icon"
              className="shrink-0 h-11 w-11 rounded-xl"
              onClick={stop}
            >
              <Square className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              size="icon"
              className="shrink-0 h-11 w-11 rounded-xl"
              onClick={() => sendMessage()}
              disabled={!input.trim()}
            >
              <Send className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
