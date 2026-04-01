import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { BookOpen, Brain, Sparkles, GraduationCap, Search, MessageSquare, FlaskConical } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default async function LandingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) redirect('/courses');

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* 네비게이션 */}
      <header className="border-b border-border/40 backdrop-blur-sm sticky top-0 z-50 bg-background/80">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
              <GraduationCap className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-base">올A+</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm">로그인</Button>
            </Link>
            <Link href="/login">
              <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white">시작하기</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* 히어로 섹션 */}
        <section className="max-w-5xl mx-auto px-6 pt-24 pb-20 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 text-xs font-medium mb-8">
            <Sparkles className="h-3 w-3" />
            Gemini AI 기반
          </div>

          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight mb-6 leading-[1.1]">
            대학 강의를 위한
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-violet-600">
              AI 학습 비서
            </span>
          </h1>

          <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-10 leading-relaxed">
            과목별 강의자료를 업로드하면 AI가 질문에 답하고,
            교수 성향을 분석하고, 시험 준비까지 도와줍니다.
          </p>

          <div className="flex items-center justify-center gap-3">
            <Link href="/login">
              <Button size="lg" className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 h-12 text-base">
                무료로 시작하기
              </Button>
            </Link>
          </div>
        </section>

        {/* 기능 소개 섹션 */}
        <section className="max-w-5xl mx-auto px-6 pb-20">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold mb-3">한 학기 전체를 함께합니다</h2>
            <p className="text-muted-foreground text-sm">
              강의자료부터 시험 준비까지, 과목마다 전담 AI가 붙습니다
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* 카드 1 */}
            <div className="rounded-2xl border border-border bg-card p-6 group hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors">
              <div className="h-11 w-11 rounded-xl bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center mb-4 group-hover:bg-blue-100 dark:group-hover:bg-blue-950 transition-colors">
                <Search className="h-5 w-5 text-blue-500" />
              </div>
              <h3 className="font-semibold text-base mb-2">RAG 자료 검색</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                강의 PDF, 노트를 업로드하면 AI가 정확한 출처와 함께 답변합니다. 환각 없이 내 자료 기반으로만 답변합니다.
              </p>
            </div>

            {/* 카드 2 */}
            <div className="rounded-2xl border border-border bg-card p-6 group hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors">
              <div className="h-11 w-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center mb-4 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-950 transition-colors">
                <MessageSquare className="h-5 w-5 text-emerald-500" />
              </div>
              <h3 className="font-semibold text-base mb-2">지속 메모리</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                이전 대화 맥락을 기억합니다. 학기 내내 같은 AI와 이야기하듯 학습 흐름이 끊기지 않습니다.
              </p>
            </div>

            {/* 카드 3 */}
            <div className="rounded-2xl border border-border bg-card p-6 group hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors">
              <div className="h-11 w-11 rounded-xl bg-violet-50 dark:bg-violet-950/60 flex items-center justify-center mb-4 group-hover:bg-violet-100 dark:group-hover:bg-violet-950 transition-colors">
                <BookOpen className="h-5 w-5 text-violet-500" />
              </div>
              <h3 className="font-semibold text-base mb-2">교수 성향 분석</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                강의자료와 시험 패턴을 분석해 교수가 중요하게 여기는 포인트를 짚어줍니다.
              </p>
            </div>

            {/* 카드 4 */}
            <div className="rounded-2xl border border-border bg-card p-6 group hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors">
              <div className="h-11 w-11 rounded-xl bg-amber-50 dark:bg-amber-950/60 flex items-center justify-center mb-4 group-hover:bg-amber-100 dark:group-hover:bg-amber-950 transition-colors">
                <Brain className="h-5 w-5 text-amber-500" />
              </div>
              <h3 className="font-semibold text-base mb-2">퀴즈 / 플래시카드</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                업로드한 자료로 퀴즈와 플래시카드를 자동 생성합니다. 시험 전 빠른 복습에 최적입니다.
              </p>
            </div>
          </div>
        </section>

        {/* 기술 스택 뱃지 */}
        <section className="border-t border-border/60 bg-muted/30">
          <div className="max-w-5xl mx-auto px-6 py-10 text-center">
            <p className="text-xs text-muted-foreground mb-5 uppercase tracking-widest font-medium">
              Powered by
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              {/* Next.js */}
              <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-border bg-card text-sm font-medium">
                <svg className="h-4 w-4" viewBox="0 0 180 180" fill="none">
                  <mask id="mask0" style={{ maskType: 'alpha' }} maskUnits="userSpaceOnUse" x="0" y="0" width="180" height="180">
                    <circle cx="90" cy="90" r="90" fill="black" />
                  </mask>
                  <g mask="url(#mask0)">
                    <circle cx="90" cy="90" r="90" fill="black" />
                    <path d="M149.508 157.52L69.142 54H54V125.97H66.1974V69.3836L139.862 164.637C143.259 162.383 146.464 159.861 149.508 157.52Z" fill="url(#paint0_linear)" />
                    <rect x="115" y="54" width="12" height="72" fill="url(#paint1_linear)" />
                  </g>
                  <defs>
                    <linearGradient id="paint0_linear" x1="109" y1="116.5" x2="144.5" y2="160.5" gradientUnits="userSpaceOnUse">
                      <stop stopColor="white" />
                      <stop offset="1" stopColor="white" stopOpacity="0" />
                    </linearGradient>
                    <linearGradient id="paint1_linear" x1="121" y1="54" x2="120.799" y2="106.875" gradientUnits="userSpaceOnUse">
                      <stop stopColor="white" />
                      <stop offset="1" stopColor="white" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                </svg>
                Next.js 15
              </div>

              {/* Supabase */}
              <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-border bg-card text-sm font-medium">
                <svg className="h-4 w-4 text-emerald-500" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11.9 1.036c-.015-.986-1.26-1.41-1.874-.637L.764 12.05C.295 12.64.738 13.5 1.5 13.5h9.5V22.963c.015.987 1.26 1.41 1.874.637l9.262-11.652c.469-.59.026-1.448-.736-1.448H12.4L11.9 1.036Z" />
                </svg>
                Supabase
              </div>

              {/* Gemini AI */}
              <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-border bg-card text-sm font-medium">
                <FlaskConical className="h-4 w-4 text-blue-500" />
                Gemini AI
              </div>

              {/* TypeScript */}
              <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-border bg-card text-sm font-medium">
                <div className="h-4 w-4 rounded bg-blue-600 flex items-center justify-center">
                  <span className="text-white font-bold" style={{ fontSize: '9px' }}>TS</span>
                </div>
                TypeScript
              </div>

              {/* Tailwind */}
              <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-border bg-card text-sm font-medium">
                <svg className="h-4 w-4 text-sky-400" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12.001 4.8c-3.2 0-5.2 1.6-6 4.8 1.2-1.6 2.6-2.2 4.2-1.8.913.228 1.565.89 2.288 1.624C13.666 10.618 15.027 12 18.001 12c3.2 0 5.2-1.6 6-4.8-1.2 1.6-2.6 2.2-4.2 1.8-.913-.228-1.565-.89-2.288-1.624C16.337 6.182 14.976 4.8 12.001 4.8zm-6 7.2c-3.2 0-5.2 1.6-6 4.8 1.2-1.6 2.6-2.2 4.2-1.8.913.228 1.565.89 2.288 1.624 1.177 1.194 2.538 2.576 5.512 2.576 3.2 0 5.2-1.6 6-4.8-1.2 1.6-2.6 2.2-4.2 1.8-.913-.228-1.565-.89-2.288-1.624C10.337 13.382 8.976 12 6.001 12z" />
                </svg>
                Tailwind CSS
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* 푸터 */}
      <footer className="border-t border-border/40">
        <div className="max-w-5xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 rounded bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
              <GraduationCap className="h-3 w-3 text-white" />
            </div>
            <span className="font-medium text-foreground">올A+</span>
          </div>
          <p>&copy; {new Date().getFullYear()} 올A+. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
