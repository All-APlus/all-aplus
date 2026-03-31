import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import type { Course, Conversation } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, MessageSquare, Pin } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { NewConversationButton } from '@/components/course/NewConversationButton';
import { ProfessorAnalysis } from '@/components/course/ProfessorAnalysis';

interface Props {
  params: Promise<{ courseId: string }>;
}

export default async function CoursePage({ params }: Props) {
  const { courseId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: course } = await supabase
    .from('courses')
    .select('*')
    .eq('id', courseId)
    .single();

  if (!course) notFound();

  const { data: conversations } = await supabase
    .from('conversations')
    .select('*')
    .eq('course_id', courseId)
    .order('is_pinned', { ascending: false })
    .order('updated_at', { ascending: false });

  const convList = (conversations || []) as Conversation[];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2">
            <span
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: (course as Course).color || '#6366f1' }}
            />
            <h2 className="text-2xl font-bold">{(course as Course).name}</h2>
          </div>
          <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
            {(course as Course).code && <span>{(course as Course).code}</span>}
            {(course as Course).professor && <span>{(course as Course).professor}</span>}
            <span>{(course as Course).semester}</span>
          </div>
        </div>
        <NewConversationButton courseId={courseId} />
      </div>

      {/* 교수 성향 분석 */}
      {(course as Course).professor && (
        <div className="mb-6">
          <ProfessorAnalysis
            courseId={courseId}
            professorName={(course as Course).professor}
          />
        </div>
      )}

      {convList.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="h-16 w-16 rounded-full bg-indigo-50 flex items-center justify-center mb-4">
            <MessageSquare className="h-8 w-8 text-indigo-400" />
          </div>
          <h3 className="text-lg font-semibold mb-2">첫 대화를 시작해보세요</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-sm">
            강의 내용 질문, 시험 대비, 리포트 작성 등
            <br />
            무엇이든 AI에게 물어보세요
          </p>
          <NewConversationButton courseId={courseId} />
        </div>
      ) : (
        <div className="space-y-2">
          {convList.map((conv) => (
            <Link
              key={conv.id}
              href={`/courses/${courseId}/chat/${conv.id}`}
            >
              <Card className="hover:shadow-sm transition-shadow cursor-pointer">
                <CardContent className="flex items-center justify-between py-3 px-4">
                  <div className="flex items-center gap-2 min-w-0">
                    {conv.is_pinned && <Pin className="h-3.5 w-3.5 text-indigo-500 shrink-0" />}
                    <span className="truncate font-medium text-sm">
                      {conv.title || '새 대화'}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0 ml-4">
                    {formatDistanceToNow(new Date(conv.updated_at), {
                      addSuffix: true,
                      locale: ko,
                    })}
                  </span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
