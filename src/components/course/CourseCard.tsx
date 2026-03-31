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
import { MoreVertical, Trash2, Archive, MessageSquare } from 'lucide-react';

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

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow group relative overflow-hidden"
      onClick={() => router.push(`/courses/${course.id}`)}
    >
      <div
        className="h-2"
        style={{ backgroundColor: course.color || '#6366f1' }}
      />
      <CardHeader className="pb-2 flex flex-row items-start justify-between">
        <div className="space-y-1 min-w-0 flex-1">
          <h3 className="font-semibold text-base leading-tight truncate">
            {course.name}
          </h3>
          {course.code && (
            <p className="text-xs text-muted-foreground">{course.code}</p>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
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
      </CardHeader>
      <CardContent className="pb-4">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{course.professor || '교수 미지정'}</span>
          <span className="text-xs bg-muted px-2 py-0.5 rounded">
            {course.semester}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
