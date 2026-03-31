'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface ShortcutHandlers {
  onToggleShortcuts?: () => void;
  onNewConversation?: () => void;
}

export function useKeyboardShortcuts({ onToggleShortcuts, onNewConversation }: ShortcutHandlers = {}) {
  const router = useRouter();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ignore when typing in inputs
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      // ? — show shortcuts help
      if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        onToggleShortcuts?.();
        return;
      }

      // g then h — go home (dashboard)
      if (e.key === 'h' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        // Only if no modifier
      }

      // Ctrl/Cmd shortcuts
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case '/':
            e.preventDefault();
            // Focus search / input
            const input = document.querySelector('textarea');
            input?.focus();
            break;
        }
      }

      // Alt shortcuts
      if (e.altKey && !e.ctrlKey && !e.metaKey) {
        switch (e.key) {
          case 'h':
            e.preventDefault();
            router.push('/');
            break;
          case 'n':
            e.preventDefault();
            onNewConversation?.();
            break;
          case 's':
            e.preventDefault();
            router.push('/settings');
            break;
        }
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [router, onToggleShortcuts, onNewConversation]);
}

export const SHORTCUTS = [
  { keys: ['?'], description: '단축키 도움말' },
  { keys: ['Ctrl', 'K'], description: '학습 템플릿 열기' },
  { keys: ['Ctrl', '/'], description: '입력창 포커스' },
  { keys: ['Alt', 'H'], description: '대시보드로 이동' },
  { keys: ['Alt', 'N'], description: '새 대화 시작' },
  { keys: ['Alt', 'S'], description: '설정으로 이동' },
  { keys: ['Enter'], description: '메시지 전송' },
  { keys: ['Shift', 'Enter'], description: '줄바꿈' },
];
