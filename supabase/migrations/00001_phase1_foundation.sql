-- ============================================================
-- Phase 1 Foundation: 핵심 테이블 생성
-- 포함: profiles, courses, conversations, messages
-- ============================================================

-- 유틸리티: updated_at 자동 갱신 트리거 함수
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ─────────────────────────────────────────────
-- 1. profiles
--    auth.users 와 1:1 대응하는 사용자 프로필
-- ─────────────────────────────────────────────
create table public.profiles (
  id                  uuid        primary key references auth.users(id) on delete cascade,
  display_name        text        not null,
  university          text,
  major               text,
  department_preset   text,
  preferred_provider  text        not null default 'claude',
  preferred_language  text        not null default 'ko',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
comment on table public.profiles is '사용자 프로필 (auth.users 확장)';
comment on column public.profiles.preferred_provider  is 'AI 제공자 기본값 (claude | openai 등)';
comment on column public.profiles.preferred_language  is '응답 언어 기본값 (ko | en 등)';
comment on column public.profiles.department_preset   is '학과 프리셋 (과목 자동 완성 등에 활용)';

create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;

create policy "profiles: 본인만 조회 가능"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles: 본인만 수정 가능"
  on public.profiles for update
  using (auth.uid() = id);

-- auth.users 신규 가입 시 profiles 자동 생성 트리거
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─────────────────────────────────────────────
-- 2. courses
--    사용자별 과목(워크스페이스)
-- ─────────────────────────────────────────────
create table public.courses (
  id                uuid        primary key default gen_random_uuid(),
  user_id           uuid        not null references auth.users(id) on delete cascade,
  name              text        not null,
  code              text,
  professor         text,
  semester          text        not null,
  color             text,
  department_preset text,
  system_context    text,
  is_archived       boolean     not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
comment on table public.courses is '과목 워크스페이스';
comment on column public.courses.code           is '과목 코드 (예: CS101)';
comment on column public.courses.semester       is '학기 (예: 2026-1)';
comment on column public.courses.color          is 'UI 강조 색상 (hex 등)';
comment on column public.courses.system_context is '이 과목 전용 AI 시스템 컨텍스트 (강의계획서 등)';

create index idx_courses_user_id on public.courses(user_id);

create trigger trg_courses_updated_at
  before update on public.courses
  for each row execute function public.set_updated_at();

alter table public.courses enable row level security;

create policy "courses: 본인 과목만 조회 가능"
  on public.courses for select
  using (auth.uid() = user_id);

create policy "courses: 본인만 생성 가능"
  on public.courses for insert
  with check (auth.uid() = user_id);

create policy "courses: 본인만 수정 가능"
  on public.courses for update
  using (auth.uid() = user_id);

create policy "courses: 본인만 삭제 가능"
  on public.courses for delete
  using (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- 3. conversations
--    과목 내 AI 대화 스레드
-- ─────────────────────────────────────────────
create table public.conversations (
  id          uuid        primary key default gen_random_uuid(),
  course_id   uuid        not null references public.courses(id) on delete cascade,
  user_id     uuid        not null references auth.users(id) on delete cascade,
  title       text,
  template_id text,
  is_pinned   boolean     not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
comment on table public.conversations is '과목별 대화 스레드';
comment on column public.conversations.title       is 'null이면 첫 메시지 기반 자동 생성 예정';
comment on column public.conversations.template_id is '학습 유형 템플릿 ID (요약/퀴즈/질의응답 등, Phase 2)';

create index idx_conversations_user_id   on public.conversations(user_id);
create index idx_conversations_course_id on public.conversations(course_id);

create trigger trg_conversations_updated_at
  before update on public.conversations
  for each row execute function public.set_updated_at();

alter table public.conversations enable row level security;

create policy "conversations: 본인 대화만 조회 가능"
  on public.conversations for select
  using (auth.uid() = user_id);

create policy "conversations: 본인만 생성 가능"
  on public.conversations for insert
  with check (auth.uid() = user_id);

create policy "conversations: 본인만 수정 가능"
  on public.conversations for update
  using (auth.uid() = user_id);

create policy "conversations: 본인만 삭제 가능"
  on public.conversations for delete
  using (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- 4. messages
--    대화 내 개별 메시지 (user / assistant / system)
-- ─────────────────────────────────────────────
create table public.messages (
  id              uuid        primary key default gen_random_uuid(),
  conversation_id uuid        not null references public.conversations(id) on delete cascade,
  role            text        not null check (role in ('user', 'assistant', 'system')),
  content         text        not null,
  provider        text,
  model           text,
  tokens_used     jsonb,
  context_chunks  text[],
  created_at      timestamptz not null default now()
  -- messages는 불변(immutable)이므로 updated_at 없음
);
comment on table public.messages is '대화 내 개별 메시지';
comment on column public.messages.role           is '발화 주체: user | assistant | system';
comment on column public.messages.provider       is '응답 생성 AI 제공자 (claude | openai 등)';
comment on column public.messages.model          is '실제 사용된 모델명 (예: claude-3-5-sonnet-20241022)';
comment on column public.messages.tokens_used    is 'API 토큰 사용량 { input: number, output: number }';
comment on column public.messages.context_chunks is 'RAG에서 주입된 컨텍스트 청크 목록 (Phase 2+)';

create index idx_messages_conversation_id on public.messages(conversation_id);

-- RLS: conversations 테이블을 통해 소유권 검증
alter table public.messages enable row level security;

create policy "messages: 본인 대화의 메시지만 조회 가능"
  on public.messages for select
  using (
    exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
        and c.user_id = auth.uid()
    )
  );

create policy "messages: 본인 대화에만 메시지 생성 가능"
  on public.messages for insert
  with check (
    exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
        and c.user_id = auth.uid()
    )
  );

create policy "messages: 본인 대화의 메시지만 삭제 가능"
  on public.messages for delete
  using (
    exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
        and c.user_id = auth.uid()
    )
  );
