-- ============================================================
-- Phase 8: 퀴즈 + 플래시카드
-- ============================================================

-- 퀴즈 세트
create table public.quizzes (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references public.courses(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  question_count int not null default 0,
  score int, -- null = 아직 안 풀음
  total int,
  created_at timestamptz default now() not null
);

alter table public.quizzes enable row level security;
create policy "Users can manage own quizzes" on public.quizzes
  for all using (auth.uid() = user_id);

-- 퀴즈 문제
create table public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid references public.quizzes(id) on delete cascade not null,
  question_type text not null default 'multiple_choice', -- multiple_choice, short_answer
  question text not null,
  options jsonb, -- ["선택1", "선택2", "선택3", "선택4"]
  correct_answer text not null,
  explanation text,
  user_answer text,
  is_correct boolean,
  sort_order int not null default 0
);

alter table public.quiz_questions enable row level security;
create policy "Users can manage own quiz questions" on public.quiz_questions
  for all using (
    quiz_id in (select id from public.quizzes where user_id = auth.uid())
  );

-- 플래시카드 덱
create table public.flashcard_decks (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references public.courses(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  card_count int not null default 0,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.flashcard_decks enable row level security;
create policy "Users can manage own decks" on public.flashcard_decks
  for all using (auth.uid() = user_id);

-- 플래시카드
create table public.flashcards (
  id uuid primary key default gen_random_uuid(),
  deck_id uuid references public.flashcard_decks(id) on delete cascade not null,
  front text not null,
  back text not null,
  -- SM-2 간격반복 필드
  ease_factor float not null default 2.5,
  interval_days int not null default 0,
  repetitions int not null default 0,
  next_review_at timestamptz default now() not null,
  created_at timestamptz default now() not null
);

alter table public.flashcards enable row level security;
create policy "Users can manage own flashcards" on public.flashcards
  for all using (
    deck_id in (select id from public.flashcard_decks where user_id = auth.uid())
  );
