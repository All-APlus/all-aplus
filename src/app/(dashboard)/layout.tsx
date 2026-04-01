'use client';

import { useState, useEffect, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { BottomNav } from '@/components/layout/BottomNav';
import { ShortcutsDialog } from '@/components/layout/ShortcutsDialog';
import { OnboardingDialog } from '@/components/onboarding/OnboardingDialog';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { ChevronRight } from 'lucide-react';
import type { Course } from '@/types/database';

const SIDEBAR_COLLAPSED_KEY = 'all-aplus-sidebar-collapsed';

const PAGE_LABELS: Record<string, string> = {
  documents: '학습 자료',
  memory: '학습 기록',
  quiz: '퀴즈',
  flashcards: '플래시카드',
  chat: '대화',
  settings: '설정',
  'api-keys': 'API 키 관리',
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [user, setUser] = useState<{ email?: string; displayName?: string }>({});
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  const courseIdMatch = pathname.match(/\/courses\/([^/]+)/);
  const activeCourseId = courseIdMatch?.[1];

  useKeyboardShortcuts({
    onToggleShortcuts: () => setShortcutsOpen((prev) => !prev),
  });

  useEffect(() => {
    const saved = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    if (saved === 'true') setSidebarCollapsed(true);
  }, []);

  const toggleCollapse = () => {
    setSidebarCollapsed((prev) => {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(!prev));
      return !prev;
    });
  };

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        setUser({
          email: authUser.email,
          displayName: authUser.user_metadata?.display_name,
        });
      }

      const { data } = await supabase
        .from('courses')
        .select('*')
        .eq('is_archived', false)
        .order('created_at', { ascending: false });

      if (data) setCourses(data as Course[]);
    };
    load();
  }, []);

  // 브레드크럼 생성
  const breadcrumbs = useMemo(() => {
    const crumbs: { label: string; href: string }[] = [];
    crumbs.push({ label: '내 과목', href: '/' });

    if (activeCourseId) {
      const course = courses.find((c) => c.id === activeCourseId);
      crumbs.push({
        label: course?.name || '과목',
        href: `/courses/${activeCourseId}`,
      });

      const segments = pathname.replace(`/courses/${activeCourseId}`, '').split('/').filter(Boolean);
      if (segments.length > 0) {
        const pageKey = segments[0];
        if (PAGE_LABELS[pageKey]) {
          crumbs.push({
            label: PAGE_LABELS[pageKey],
            href: `/courses/${activeCourseId}/${pageKey}`,
          });
        }
      }
    } else if (pathname.startsWith('/settings')) {
      crumbs.push({ label: '설정', href: '/settings' });
      if (pathname.includes('api-keys')) {
        crumbs.push({ label: 'API 키 관리', href: '/settings/api-keys' });
      }
    }

    return crumbs;
  }, [pathname, activeCourseId, courses]);

  return (
    <div className="h-screen flex flex-col">
      <Header
        email={user.email}
        displayName={user.displayName}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
      />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          courses={courses}
          open={sidebarOpen}
          collapsed={sidebarCollapsed}
          onClose={() => setSidebarOpen(false)}
          onToggleCollapse={toggleCollapse}
        />
        <main className="flex-1 overflow-y-auto bg-muted/30 p-4 md:p-6 pb-20 md:pb-6">
          {/* 브레드크럼 */}
          {breadcrumbs.length > 1 && (
            <nav className="flex items-center gap-1 text-xs text-muted-foreground mb-4">
              {breadcrumbs.map((crumb, i) => (
                <span key={crumb.href} className="flex items-center gap-1">
                  {i > 0 && <ChevronRight className="h-3 w-3" />}
                  {i < breadcrumbs.length - 1 ? (
                    <Link href={crumb.href} className="hover:text-foreground transition-colors">
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className="text-foreground font-medium">{crumb.label}</span>
                  )}
                </span>
              ))}
            </nav>
          )}
          {children}
        </main>
      </div>
      <BottomNav courseId={activeCourseId} />
      <OnboardingDialog />
      <ShortcutsDialog open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
    </div>
  );
}
