'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Course } from '@/types/database';
import { BookOpen, Settings, MessageSquare, FileText, Brain, ClipboardList, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarProps {
  courses: Course[];
  open?: boolean;
  onClose?: () => void;
}

export function Sidebar({ courses, open, onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* 모바일 오버레이 */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={cn(
          'fixed md:static inset-y-0 left-0 z-40 w-60 bg-background border-r flex flex-col transition-transform md:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="p-4 border-b">
          <Link href="/" className="text-lg font-bold text-indigo-600" onClick={onClose}>
            올A+
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto p-2 space-y-1">
          <Link
            href="/"
            onClick={onClose}
            className={cn(
              'flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
              pathname === '/'
                ? 'bg-indigo-50 text-indigo-700 font-medium'
                : 'text-muted-foreground hover:bg-muted'
            )}
          >
            <BookOpen className="h-4 w-4" />
            내 과목
          </Link>

          <div className="pt-3 pb-1 px-3">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              과목 목록
            </span>
          </div>

          {courses.map((course) => {
            const courseBase = `/courses/${course.id}`;
            const isActive = pathname.startsWith(courseBase);
            return (
              <div key={course.id}>
                <Link
                  href={courseBase}
                  onClick={onClose}
                  className={cn(
                    'flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
                    isActive
                      ? 'bg-indigo-50 text-indigo-700 font-medium'
                      : 'text-muted-foreground hover:bg-muted'
                  )}
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: course.color || '#6366f1' }}
                  />
                  <span className="truncate">{course.name}</span>
                </Link>
                {isActive && (
                  <div className="ml-5 pl-3 border-l border-gray-200 space-y-0.5 mt-0.5 mb-1">
                    {[
                      { href: courseBase, icon: MessageSquare, label: '대화', exact: true },
                      { href: `${courseBase}/documents`, icon: FileText, label: '학습 자료' },
                      { href: `${courseBase}/memory`, icon: Brain, label: '학습 기록' },
                      { href: `${courseBase}/quiz`, icon: ClipboardList, label: '퀴즈' },
                      { href: `${courseBase}/flashcards`, icon: Layers, label: '플래시카드' },
                    ].map((item) => {
                      const subActive = item.exact
                        ? pathname === item.href || pathname.startsWith(`${item.href}/chat`)
                        : pathname.startsWith(item.href);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={onClose}
                          className={cn(
                            'flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors',
                            subActive
                              ? 'text-indigo-600 font-medium'
                              : 'text-muted-foreground hover:text-foreground'
                          )}
                        >
                          <item.icon className="h-3.5 w-3.5" />
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {courses.length === 0 && (
            <p className="px-3 py-2 text-xs text-muted-foreground">
              아직 등록된 과목이 없어요
            </p>
          )}
        </nav>

        <div className="border-t p-2">
          <Link
            href="/settings"
            onClick={onClose}
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted transition-colors"
          >
            <Settings className="h-4 w-4" />
            설정
          </Link>
        </div>
      </aside>
    </>
  );
}
