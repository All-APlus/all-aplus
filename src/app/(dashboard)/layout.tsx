'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { BottomNav } from '@/components/layout/BottomNav';
import { ShortcutsDialog } from '@/components/layout/ShortcutsDialog';
import { OnboardingDialog } from '@/components/onboarding/OnboardingDialog';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import type { Course } from '@/types/database';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [user, setUser] = useState<{ email?: string; displayName?: string }>({});

  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  // Extract courseId from pathname for BottomNav
  const courseIdMatch = pathname.match(/\/courses\/([^/]+)/);
  const activeCourseId = courseIdMatch?.[1];

  useKeyboardShortcuts({
    onToggleShortcuts: () => setShortcutsOpen((prev) => !prev),
  });

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
          onClose={() => setSidebarOpen(false)}
        />
        <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-background p-4 md:p-6 pb-20 md:pb-6">
          {children}
        </main>
      </div>
      <BottomNav courseId={activeCourseId} />
      <OnboardingDialog />
      <ShortcutsDialog open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
    </div>
  );
}
