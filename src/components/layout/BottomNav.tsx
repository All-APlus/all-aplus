'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen, MessageSquare, FileText, Brain, ClipboardList, Settings, GitFork } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BottomNavProps {
  courseId?: string;
}

export function BottomNav({ courseId }: BottomNavProps) {
  const pathname = usePathname();

  const courseBase = courseId ? `/courses/${courseId}` : null;

  const items = courseBase
    ? [
        { href: '/', icon: BookOpen, label: '과목' },
        { href: courseBase, icon: MessageSquare, label: '대화', exact: true },
        { href: `${courseBase}/documents`, icon: FileText, label: '자료' },
        { href: `${courseBase}/memory`, icon: Brain, label: '기록' },
        { href: `${courseBase}/mindmap`, icon: GitFork, label: '맵' },
        { href: `${courseBase}/quiz`, icon: ClipboardList, label: '퀴즈' },
      ]
    : [
        { href: '/', icon: BookOpen, label: '내 과목', exact: true },
        { href: '/settings', icon: Settings, label: '설정' },
      ];

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="flex items-center justify-around h-14">
        {items.map((item) => {
          const isActive = item.exact
            ? pathname === item.href || pathname.startsWith(`${item.href}/chat`)
            : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center gap-0.5 px-3 py-1.5 text-[10px] transition-colors',
                isActive
                  ? 'text-indigo-600 font-medium'
                  : 'text-muted-foreground'
              )}
            >
              <item.icon className={cn('h-5 w-5', isActive && 'text-indigo-600')} />
              {item.label}
            </Link>
          );
        })}
      </div>
      {/* safe area spacing for notched devices */}
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}
