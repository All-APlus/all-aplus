'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Course } from '@/types/database';
import { BookOpen, Settings, MessageSquare, FileText, Brain, ClipboardList, Layers, PanelLeftClose, PanelLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface SidebarProps {
  courses: Course[];
  open?: boolean;
  collapsed?: boolean;
  onClose?: () => void;
  onToggleCollapse?: () => void;
}

export function Sidebar({ courses, open, collapsed, onClose, onToggleCollapse }: SidebarProps) {
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
          'fixed md:static inset-y-0 left-0 z-40 bg-background border-r flex flex-col transition-all md:translate-x-0',
          collapsed ? 'w-16' : 'w-60',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className={cn('border-b flex items-center', collapsed ? 'justify-center p-3' : 'justify-between p-4')}>
          {!collapsed && (
            <Link href="/" className="text-lg font-extrabold bg-gradient-to-r from-indigo-600 to-violet-500 bg-clip-text text-transparent" onClick={onClose}>
              올A+
            </Link>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 hidden md:flex"
            onClick={onToggleCollapse}
            title={collapsed ? '사이드바 펼치기' : '사이드바 접기'}
          >
            {collapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </Button>
        </div>

        <nav className="flex-1 overflow-y-auto p-2 space-y-1">
          <Link
            href="/"
            onClick={onClose}
            className={cn(
              'flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
              collapsed && 'justify-center px-2',
              pathname === '/'
                ? 'bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 font-medium'
                : 'text-muted-foreground hover:bg-muted'
            )}
            title={collapsed ? '내 과목' : undefined}
          >
            <BookOpen className="h-4 w-4 shrink-0" />
            {!collapsed && '내 과목'}
          </Link>

          {!collapsed && (
            <div className="pt-3 pb-1 px-3">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                과목 목록
              </span>
            </div>
          )}

          {collapsed && <div className="pt-2" />}

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
                    collapsed && 'justify-center px-2',
                    isActive
                      ? 'bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 font-medium'
                      : 'text-muted-foreground hover:bg-muted'
                  )}
                  title={collapsed ? course.name : undefined}
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: course.color || '#6366f1' }}
                  />
                  {!collapsed && <span className="truncate">{course.name}</span>}
                </Link>
                {isActive && !collapsed && (
                  <div className="ml-5 pl-3 border-l border-border space-y-0.5 mt-0.5 mb-1">
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
                              ? 'text-indigo-600 dark:text-indigo-400 font-medium'
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

          {courses.length === 0 && !collapsed && (
            <p className="px-3 py-2 text-xs text-muted-foreground">
              아직 등록된 과목이 없어요
            </p>
          )}
        </nav>

        <div className="border-t p-2">
          <Link
            href="/settings"
            onClick={onClose}
            className={cn(
              'flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted transition-colors',
              collapsed && 'justify-center px-2'
            )}
            title={collapsed ? '설정' : undefined}
          >
            <Settings className="h-4 w-4 shrink-0" />
            {!collapsed && '설정'}
          </Link>
        </div>
      </aside>
    </>
  );
}
