'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Loader2,
  Plus,
  CheckCircle,
  XCircle,
  Trophy,
  ClipboardList,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { Quiz, QuizQuestion } from '@/types/database';

type QuizState = 'list' | 'generating' | 'solving' | 'result';

export default function QuizPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const [state, setState] = useState<QuizState>('list');
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [topic, setTopic] = useState('');
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<{ score: number; total: number } | null>(null);
  const [docCount, setDocCount] = useState<number | null>(null);

  const fetchDocCount = useCallback(async () => {
    const res = await fetch(`/api/documents?courseId=${courseId}`);
    if (res.ok) {
      const docs = await res.json();
      setDocCount(docs.length);
    }
  }, [courseId]);

  useEffect(() => { fetchDocCount(); }, [fetchDocCount]);

  const fetchQuizzes = useCallback(async () => {
    const res = await fetch(`/api/quiz?courseId=${courseId}`);
    if (res.ok) setQuizzes(await res.json());
  }, [courseId]);

  useEffect(() => { fetchQuizzes(); }, [fetchQuizzes]);

  const generateQuiz = async () => {
    setState('generating');
    try {
      const res = await fetch('/api/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId, topic: topic.trim() || undefined, count: 5 }),
      });
      const data = await res.json();
      if (res.ok) {
        setTopic('');
        await fetchQuizzes();
        await loadQuiz(data.quizId);
      } else {
        toast.error(data.error || '퀴즈 생성 실패');
        setState('list');
      }
    } catch {
      toast.error('퀴즈 생성 중 오류가 발생했습니다');
      setState('list');
    }
  };

  const loadQuiz = async (quizId: string) => {
    const quiz = quizzes.find((q) => q.id === quizId);
    // 문제 가져오기 - 간단하게 supabase 대신 별도 API를 쓰지 않고,
    // quiz submit 시 questions를 받아오는 구조로 가는 대신
    // 여기서는 퀴즈 목록에서 선택 시 새로 생성한 퀴즈의 questions를 fetch
    const res = await fetch(`/api/quiz/questions?quizId=${quizId}`);
    if (res.ok) {
      const qs = await res.json();
      setQuestions(qs);
      setActiveQuiz(quiz || { id: quizId } as Quiz);
      setAnswers({});
      setResult(null);
      setState(quiz?.score != null ? 'result' : 'solving');
    }
  };

  const submitQuiz = async () => {
    if (!activeQuiz) return;
    const answerList = questions.map((q) => ({
      questionId: q.id,
      answer: answers[q.id] || '',
    }));

    const res = await fetch('/api/quiz/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quizId: activeQuiz.id, answers: answerList }),
    });

    if (res.ok) {
      const data = await res.json();
      setResult(data);
      setState('result');
      // 문제 다시 로드 (채점 결과 반영)
      const qRes = await fetch(`/api/quiz/questions?quizId=${activeQuiz.id}`);
      if (qRes.ok) setQuestions(await qRes.json());
      fetchQuizzes();
    }
  };

  // 목록 뷰
  if (state === 'list') {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold">퀴즈</h2>
            <p className="text-sm text-muted-foreground mt-1">
              AI가 학습 자료를 기반으로 퀴즈를 생성합니다
            </p>
          </div>
        </div>

        {/* 생성 폼 */}
        <Card className="mb-6">
          <CardContent className="py-4 px-4">
            <div className="flex items-center gap-2">
              <Input
                placeholder="주제 (선택사항, 예: 3장 데이터베이스)"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && generateQuiz()}
              />
              <Button onClick={generateQuiz} className="shrink-0 gap-1.5" disabled={docCount === 0}>
                <Plus className="h-4 w-4" />
                퀴즈 생성
              </Button>
            </div>
          </CardContent>
        </Card>

        {docCount === 0 && (
          <div className="mb-6 p-3 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200 text-sm rounded-lg border border-amber-200 dark:border-amber-800">
            먼저{' '}
            <a href={`/courses/${courseId}/documents`} className="underline font-medium">
              학습 자료를 업로드
            </a>
            하면 더 정확한 퀴즈를 생성할 수 있어요.
          </div>
        )}

        {/* 퀴즈 목록 */}
        {quizzes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-16 w-16 rounded-full bg-indigo-50 flex items-center justify-center mb-4">
              <ClipboardList className="h-8 w-8 text-indigo-400" />
            </div>
            <h3 className="text-lg font-semibold mb-1">아직 퀴즈가 없어요</h3>
            <p className="text-sm text-muted-foreground">
              위에서 퀴즈를 생성해보세요
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {quizzes.map((quiz) => (
              <Card
                key={quiz.id}
                className="cursor-pointer hover:shadow-sm transition-shadow"
                onClick={() => loadQuiz(quiz.id)}
              >
                <CardContent className="flex items-center justify-between py-3 px-4">
                  <div>
                    <p className="text-sm font-medium">{quiz.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {quiz.question_count}문제
                    </p>
                  </div>
                  {quiz.score != null ? (
                    <span className={cn(
                      'text-sm font-bold',
                      quiz.score / (quiz.total || 1) >= 0.8 ? 'text-green-600' : 'text-amber-600'
                    )}>
                      {quiz.score}/{quiz.total}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">미풀이</span>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  // 생성 중
  if (state === 'generating') {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-10 w-10 text-indigo-500 animate-spin mb-4" />
        <p className="text-sm text-muted-foreground">AI가 퀴즈를 생성하고 있어요...</p>
      </div>
    );
  }

  // 풀이 뷰
  if (state === 'solving') {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">{activeQuiz?.title}</h2>
          <Button variant="outline" onClick={() => setState('list')}>
            목록으로
          </Button>
        </div>

        <div className="space-y-4">
          {questions.map((q, i) => (
            <Card key={q.id}>
              <CardHeader>
                <CardTitle className="text-base">
                  {i + 1}. {q.question}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {q.question_type === 'multiple_choice' && q.options ? (
                  <div className="space-y-2">
                    {(q.options as string[]).map((opt) => (
                      <button
                        key={opt}
                        onClick={() => setAnswers({ ...answers, [q.id]: opt })}
                        className={cn(
                          'w-full text-left px-4 py-2.5 rounded-lg border text-sm transition-colors',
                          answers[q.id] === opt
                            ? 'border-indigo-500 bg-indigo-50 text-indigo-700 font-medium'
                            : 'hover:bg-muted'
                        )}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                ) : (
                  <Input
                    placeholder="답을 입력하세요"
                    value={answers[q.id] || ''}
                    onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                  />
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-6 flex justify-end">
          <Button onClick={submitQuiz} size="lg">
            제출하기
          </Button>
        </div>
      </div>
    );
  }

  // 결과 뷰
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">{activeQuiz?.title} — 결과</h2>
        <Button variant="outline" onClick={() => setState('list')}>
          목록으로
        </Button>
      </div>

      {result && (
        <Card className="mb-6">
          <CardContent className="flex items-center gap-4 py-6 px-6">
            <Trophy className={cn(
              'h-10 w-10',
              result.score / result.total >= 0.8 ? 'text-yellow-500' : 'text-gray-400'
            )} />
            <div>
              <p className="text-3xl font-bold">
                {result.score} / {result.total}
              </p>
              <p className="text-sm text-muted-foreground">
                정답률 {Math.round((result.score / result.total) * 100)}%
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {questions.map((q, i) => (
          <Card key={q.id} className={cn(
            'border-l-4',
            q.is_correct === true ? 'border-l-green-500' :
            q.is_correct === false ? 'border-l-red-500' : 'border-l-gray-200'
          )}>
            <CardHeader>
              <div className="flex items-center gap-2">
                {q.is_correct === true ? (
                  <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
                ) : q.is_correct === false ? (
                  <XCircle className="h-5 w-5 text-red-500 shrink-0" />
                ) : null}
                <CardTitle className="text-base">
                  {i + 1}. {q.question}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {q.user_answer && (
                <p className="text-sm">
                  <span className="text-muted-foreground">내 답: </span>
                  <span className={q.is_correct ? 'text-green-600 font-medium' : 'text-red-600 line-through'}>
                    {q.user_answer}
                  </span>
                </p>
              )}
              {!q.is_correct && (
                <p className="text-sm">
                  <span className="text-muted-foreground">정답: </span>
                  <span className="text-green-600 font-medium">{q.correct_answer}</span>
                </p>
              )}
              {q.explanation && (
                <p className="text-sm text-muted-foreground bg-muted rounded-lg px-3 py-2">
                  {q.explanation}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
