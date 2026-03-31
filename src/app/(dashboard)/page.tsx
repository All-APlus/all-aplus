import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import type { Course } from '@/types/database';
import { CourseCard } from '@/components/course/CourseCard';
import { CreateCourseDialog } from '@/components/course/CreateCourseDialog';
import { BookOpen } from 'lucide-react';

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

      {courseList.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="h-16 w-16 rounded-full bg-indigo-50 flex items-center justify-center mb-4">
            <BookOpen className="h-8 w-8 text-indigo-400" />
          </div>
          <h3 className="text-lg font-semibold mb-2">아직 등록된 과목이 없어요</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-sm">
            과목을 추가하면 AI가 학기 전체를 함께 합니다.
            <br />
            자료 업로드, 질문, 시험 대비까지!
          </p>
          <CreateCourseDialog />
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
