'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import type { Course } from '@/types/database';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [user, setUser] = useState<{ email?: string; displayName?: string }>({});

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
        <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
