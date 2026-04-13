import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import type { Course, Conversation } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  MessageSquare, Pin, FileText, Brain, GitFork,
  ClipboardList, Layers, Upload,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { NewConversationButton } from '@/components/course/NewConversationButton';
import { ProfessorAnalysis } from '@/components/course/ProfessorAnalysis';
import { EditCourseDialog } from '@/components/course/EditCourseDialog';
import { ConversationActions } from '@/components/course/ConversationActions';

interface Props {
  params: Promise<{ courseId: string }>;
}

export default async function CoursePage({ params }: Props) {
  const { courseId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const [
    { data: course },
    { data: conversations },
    { count: docCount },
    { count: memoryCount },
    { count: quizCount },
    { count: flashcardDeckCount },
  ] = await Promise.all([
    supabase.from('courses').select('*').eq('id', courseId).single(),
    supabase.from('conversations').select('*').eq('course_id', courseId)
      .order('is_pinned', { ascending: false })
      .order('updated_at', { ascending: false }),
    supabase.from('documents').select('id', { count: 'exact', head: true }).eq('course_id', courseId),
    supabase.from('course_memories').select('id', { count: 'exact', head: true }).eq('course_id', courseId),
    supabase.from('quizzes').select('id', { count: 'exact', head: true }).eq('course_id', courseId),
    supabase.from('flashcard_decks').select('id', { count: 'exact', head: true }).eq('course_id', courseId),
  ]);

  if (!course) notFound();

  const typedCourse = course as Course;
  const convList = (conversations || []) as Conversation[];
  const hasDocuments = (docCount ?? 0) > 0;

  const featureCards = [
    { href: `/courses/${courseId}`, icon: MessageSquare, label: '대화', stat: `${convList.length}개`, color: 'bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400' },
    { href: `/courses/${courseId}/documents`, icon: FileText, label: '학습 자료', stat: `${docCount ?? 0}개`, color: 'bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400' },
    { href: `/courses/${courseId}/memory`, icon: Brain, label: '학습 기록', stat: `${memoryCount ?? 0}개`, color: 'bg-violet-50 dark:bg-violet-950 text-violet-600 dark:text-violet-400' },
    { href: `/courses/${courseId}/mindmap`, icon: GitFork, label: '마인드맵', stat: null, color: 'bg-pink-50 dark:bg-pink-950 text-pink-600 dark:text-pink-400' },
    { href: `/courses/${courseId}/quiz`, icon: ClipboardList, label: '퀴즈', stat: `${quizCount ?? 0}회`, color: 'bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400' },
    { href: `/courses/${courseId}/flashcards`, icon: Layers, label: '플래시카드', stat: `${flashcardDeckCount ?? 0}세트`, color: 'bg-cyan-50 dark:bg-cyan-950 text-cyan-600 dark:text-cyan-400' },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2">
            <span
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: typedCourse.color || '#6366f1' }}
            />
            <h2 className="text-2xl font-bold">{typedCourse.name}</h2>
          </div>
          <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
            {typedCourse.code && <span>{typedCourse.code}</span>}
            {typedCourse.professor && <span>{typedCourse.professor}</span>}
            <span>{typedCourse.semester}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <EditCourseDialog course={typedCourse} />
          <NewConversationButton courseId={courseId} />
        </div>
      </div>

      {/* 기능 카드 그리드 */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-6">
        {featureCards.map((card) => (
          <Link key={card.href + card.label} href={card.href}>
            <div className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-border bg-card hover:shadow-sm hover:border-indigo-300 dark:hover:border-indigo-700 transition-all cursor-pointer text-center">
              <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${card.color}`}>
                <card.icon className="h-4.5 w-4.5" />
              </div>
              <span className="text-xs font-medium">{card.label}</span>
              {card.stat && (
                <span className="text-[10px] text-muted-foreground">{card.stat}</span>
              )}
            </div>
          </Link>
        ))}
      </div>

      {/* 자료 업로드 안내 (문서 0개일 때) */}
      {!hasDocuments && (
        <div className="mb-6 p-4 rounded-xl border-2 border-dashed border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/30">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-lg bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center shrink-0">
              <Upload className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold mb-1">먼저 학습 자료를 업로드하세요</h3>
              <p className="text-xs text-muted-foreground mb-3">
                자료를 올리면 출처 기반 답변을 받을 수 있어요. 자료 없이도 대화는 가능합니다.
              </p>
              <Link href={`/courses/${courseId}/documents`}>
                <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white">
                  <Upload className="h-3.5 w-3.5 mr-1.5" />
                  자료 업로드하기
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* 교수 성향 분석 */}
      {typedCourse.professor && (
        <div className="mb-6">
          <ProfessorAnalysis
            courseId={courseId}
            professorName={typedCourse.professor}
          />
        </div>
      )}

      {/* 대화 목록 */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-muted-foreground">최근 대화</h3>
      </div>

      {convList.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="h-14 w-14 rounded-full bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center mb-3">
            <MessageSquare className="h-7 w-7 text-indigo-400" />
          </div>
          <h3 className="text-base font-semibold mb-1.5">첫 대화를 시작해보세요</h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-sm">
            강의 내용 질문, 시험 대비, 리포트 작성 등
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
              <Card className="hover:shadow-sm transition-shadow cursor-pointer group">
                <CardContent className="flex items-center justify-between py-3 px-4">
                  <div className="flex items-center gap-2 min-w-0">
                    {conv.is_pinned && <Pin className="h-3.5 w-3.5 text-indigo-500 shrink-0" />}
                    <span className="truncate font-medium text-sm">
                      {conv.title || '새 대화'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-4">
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(conv.updated_at), {
                        addSuffix: true,
                        locale: ko,
                      })}
                    </span>
                    <ConversationActions
                      conversationId={conv.id}
                      title={conv.title || '새 대화'}
                      isPinned={conv.is_pinned}
                    />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
