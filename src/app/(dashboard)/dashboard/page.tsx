import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import type { Course } from '@/types/database';
import { CourseCard } from '@/components/course/CourseCard';
import { CreateCourseDialog } from '@/components/course/CreateCourseDialog';
import { StatsCards } from '@/components/dashboard/StatsCards';
import { BookOpen, Sparkles, FileText, Brain } from 'lucide-react';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: courses } = await supabase
    .from('courses')
    .select('*')
    .eq('is_archived', false)
    .order('created_at', { ascending: false });

  const courseList = (courses || []) as Course[];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">내 과목</h2>
          <p className="text-sm text-muted-foreground mt-1">
            과목을 선택해서 AI와 학습을 시작하세요
          </p>
        </div>
        <CreateCourseDialog />
      </div>

      {courseList.length > 0 && <StatsCards />}

      {courseList.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-indigo-100 to-violet-100 dark:from-indigo-900 dark:to-violet-900 flex items-center justify-center mb-6">
            <Sparkles className="h-10 w-10 text-indigo-500" />
          </div>
          <h3 className="text-xl font-bold mb-2">학기를 시작해볼까요?</h3>
          <p className="text-sm text-muted-foreground mb-8 max-w-sm leading-relaxed">
            과목을 추가하면 AI가 학기 전체를 함께 합니다.
          </p>
          <CreateCourseDialog />
          <div className="grid grid-cols-3 gap-6 mt-12 max-w-md">
            <div className="flex flex-col items-center gap-2">
              <div className="h-10 w-10 rounded-lg bg-blue-50 dark:bg-blue-950 flex items-center justify-center">
                <FileText className="h-5 w-5 text-blue-500" />
              </div>
              <span className="text-xs text-muted-foreground">자료 업로드</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="h-10 w-10 rounded-lg bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center">
                <BookOpen className="h-5 w-5 text-emerald-500" />
              </div>
              <span className="text-xs text-muted-foreground">AI 질문</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="h-10 w-10 rounded-lg bg-violet-50 dark:bg-violet-950 flex items-center justify-center">
                <Brain className="h-5 w-5 text-violet-500" />
              </div>
              <span className="text-xs text-muted-foreground">시험 대비</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {courseList.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      )}
    </div>
  );
}
