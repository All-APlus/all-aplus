-- ============================================================
-- Phase 5 교수 성향 분석: professor_profiles
-- ============================================================

create table public.professor_profiles (
  id                uuid        primary key default gen_random_uuid(),
  course_id         uuid        not null references public.courses(id) on delete cascade,
  user_id           uuid        not null references auth.users(id) on delete cascade,
  name              text        not null,
  research_areas    text[]      not null default '{}',
  academic_stance   text,
  key_topics        text[]      not null default '{}',
  papers_analyzed   integer     not null default 0,
  raw_analysis      text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
comment on table public.professor_profiles is '교수 성향 분석 결과';

create index idx_professor_course_id on public.professor_profiles(course_id);
create unique index idx_professor_course_unique on public.professor_profiles(course_id);

create trigger trg_professor_updated_at
  before update on public.professor_profiles
  for each row execute function public.set_updated_at();

alter table public.professor_profiles enable row level security;

create policy "professor_profiles: 본인만 조회"
  on public.professor_profiles for select
  using (auth.uid() = user_id);

create policy "professor_profiles: 본인만 생성"
  on public.professor_profiles for insert
  with check (auth.uid() = user_id);

create policy "professor_profiles: 본인만 수정"
  on public.professor_profiles for update
  using (auth.uid() = user_id);

create policy "professor_profiles: 본인만 삭제"
  on public.professor_profiles for delete
  using (auth.uid() = user_id);
