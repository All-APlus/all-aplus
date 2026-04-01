'use client';

import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { Course } from '@/types/database';
import {
  Card,
  CardContent,
  CardHeader,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { MoreVertical, Trash2, Archive, GraduationCap } from 'lucide-react';

interface CourseCardProps {
  course: Course;
}

export function CourseCard({ course }: CourseCardProps) {
  const router = useRouter();

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`"${course.name}" 과목을 삭제할까요?`)) return;

    const supabase = createClient();
    await supabase.from('courses').delete().eq('id', course.id);
    router.refresh();
  };

  const handleArchive = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const supabase = createClient();
    await supabase
      .from('courses')
      .update({ is_archived: !course.is_archived })
      .eq('id', course.id);
    router.refresh();
  };

  const color = course.color || '#6366f1';

  return (
    <Card
      className="cursor-pointer hover:shadow-lg transition-all group relative overflow-hidden hover:-translate-y-0.5"
      onClick={() => router.push(`/courses/${course.id}`)}
    >
      {/* 그라데이션 상단 */}
      <div
        className="h-20 relative"
        style={{
          background: `linear-gradient(135deg, ${color}, ${color}88)`,
        }}
      >
        <div className="absolute inset-0 bg-black/5" />
        <div className="absolute bottom-3 left-4">
          <div className="h-9 w-9 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <GraduationCap className="h-5 w-5 text-white" />
          </div>
        </div>
        {/* 메뉴 버튼 */}
        <div className="absolute top-2 right-2">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-white/70 hover:text-white hover:bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"
                />
              }
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleArchive}>
                <Archive className="h-4 w-4 mr-2" />
                {course.is_archived ? '보관 해제' : '보관'}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleDelete}
                className="text-red-600 focus:text-red-600"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                삭제
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <CardHeader className="pb-1 pt-3">
        <h3 className="font-bold text-base leading-tight truncate">
          {course.name}
        </h3>
        {course.code && (
          <p className="text-xs text-muted-foreground">{course.code}</p>
        )}
      </CardHeader>
      <CardContent className="pb-4">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span className="truncate">{course.professor || '교수 미지정'}</span>
          <span className="text-xs bg-muted px-2 py-0.5 rounded-md shrink-0 ml-2">
            {course.semester}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
