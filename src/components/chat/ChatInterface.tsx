'use client';

import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useChat } from '@/hooks/useChat';
import { TemplatePicker } from './TemplatePicker';
import type { Message } from '@/types/database';
import type { ProviderName } from '@/lib/ai/types';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Send, Square, Bot, User, FileText, LayoutTemplate, Download, Sparkles } from 'lucide-react';

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
  const [showTemplates, setShowTemplates] = useState(false);

  const adjustTextareaHeight = () => {
    const textarea = inputRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 144)}px`;
    }
  };

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
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.style.height = 'auto';
        }
      }, 0);
    }
    if (e.key === 'k' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      setShowTemplates((prev) => !prev);
    }
  };

  const handleExport = () => {
    window.open(`/api/conversations/export?id=${conversationId}`, '_blank');
  };

  return (
    <div className="flex flex-col h-full">
      {/* 상단 바 */}
      {messages.length > 0 && (
        <div className="flex items-center justify-end px-4 py-2 border-b">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleExport}
            title="Markdown으로 내보내기"
            className="text-xs gap-1.5 text-muted-foreground"
          >
            <Download className="h-3.5 w-3.5" />
            내보내기
          </Button>
        </div>
      )}

      {/* 메시지 영역 */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="h-16 w-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center mb-5">
              <Sparkles className="h-8 w-8 text-indigo-500" />
            </div>
            <h3 className="text-xl font-bold mb-2">
              {courseName}
            </h3>
            <p className="text-sm text-muted-foreground max-w-md leading-relaxed">
              강의 내용 질문, 개념 설명, 시험 대비, 리포트 작성 등<br />
              무엇이든 물어보세요!
            </p>
            <div className="flex gap-2 mt-6">
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => setShowTemplates(true)}
              >
                <LayoutTemplate className="h-3.5 w-3.5 mr-1.5" />
                템플릿으로 시작
              </Button>
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              'flex gap-3',
              msg.role === 'user' ? 'max-w-2xl ml-auto flex-row-reverse' : 'max-w-3xl'
            )}
          >
            {/* 아바타 */}
            <div
              className={cn(
                'h-8 w-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5',
                msg.role === 'user'
                  ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400'
                  : 'bg-violet-100 dark:bg-violet-900 text-violet-600 dark:text-violet-400'
              )}
            >
              {msg.role === 'user' ? (
                <User className="h-4 w-4" />
              ) : (
                <Bot className="h-4 w-4" />
              )}
            </div>

            {/* 메시지 본문 */}
            <div className={cn(
              'min-w-0',
              msg.role === 'user'
                ? 'bg-indigo-600 text-white rounded-2xl rounded-tr-md px-4 py-2.5'
                : ''
            )}>
              {msg.role === 'user' ? (
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
              ) : msg.content ? (
                <div className="prose prose-sm dark:prose-invert max-w-none prose-pre:bg-muted prose-pre:border prose-pre:rounded-lg prose-code:before:content-none prose-code:after:content-none prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-sm">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {msg.content}
                  </ReactMarkdown>
                </div>
              ) : (
                /* 타이핑 인디케이터 */
                <div className="flex items-center gap-2 py-2">
                  <div className="flex gap-1">
                    <span className="h-2 w-2 rounded-full bg-violet-400 animate-bounce" />
                    <span className="h-2 w-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '0.15s' }} />
                    <span className="h-2 w-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '0.3s' }} />
                  </div>
                  <span className="text-xs text-muted-foreground">답변을 작성하고 있어요...</span>
                </div>
              )}

              {/* 출처 표시 */}
              {msg.role === 'assistant' && sources[msg.id] && sources[msg.id].length > 0 && (
                <div className="mt-3 pt-3 border-t border-border">
                  <p className="text-xs text-muted-foreground mb-1.5 font-medium">참고 자료</p>
                  <div className="flex flex-wrap gap-1.5">
                    {sources[msg.id].map((src, i) => (
                      <span
                        key={src.id}
                        className="inline-flex items-center gap-1 text-xs bg-muted text-muted-foreground px-2 py-1 rounded-md hover:bg-accent transition-colors cursor-default"
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

      {/* 템플릿 피커 */}
      {showTemplates && (
        <div className="px-4 pb-2">
          <div className="max-w-3xl mx-auto">
            <TemplatePicker
              onSelect={(prompt) => {
                setInput(prompt);
                setShowTemplates(false);
                inputRef.current?.focus();
              }}
              onClose={() => setShowTemplates(false)}
            />
          </div>
        </div>
      )}

      {/* 입력 영역 */}
      <div className="border-t bg-background p-4">
        <div className="max-w-3xl mx-auto flex gap-2">
          <Button
            variant="outline"
            size="icon"
            className="shrink-0 h-11 w-11 rounded-xl"
            onClick={() => setShowTemplates(!showTemplates)}
            title="학습 템플릿 (Ctrl+K)"
          >
            <LayoutTemplate className="h-4 w-4" />
          </Button>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              adjustTextareaHeight();
            }}
            onKeyDown={handleKeyDown}
            placeholder="메시지를 입력하세요... (Shift+Enter로 줄바꿈)"
            rows={1}
            className="flex-1 resize-none rounded-xl border bg-muted/50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-muted/30"
            style={{ maxHeight: '144px' }}
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
              className="shrink-0 h-11 w-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white"
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
