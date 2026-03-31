-- ============================================================
-- Phase 3 Memory System: course_memories + 벡터 검색
-- ============================================================

-- ─────────────────────────────────────────────
-- 1. course_memories
--    과목별 누적 학습 기록 (개념, 요약, 취약 영역 등)
-- ─────────────────────────────────────────────
create table public.course_memories (
  id                      uuid        primary key default gen_random_uuid(),
  course_id               uuid        not null references public.courses(id) on delete cascade,
  user_id                 uuid        not null references auth.users(id) on delete cascade,
  memory_type             text        not null
                                      check (memory_type in ('concept', 'summary', 'key_term', 'weak_area', 'user_note')),
  content                 text        not null,
  embedding               vector(1536),
  source_conversation_id  uuid        references public.conversations(id) on delete set null,
  importance              float       not null default 0.5,
  metadata                jsonb       default '{}',
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);
comment on table public.course_memories is '과목별 누적 학습 기록';
comment on column public.course_memories.memory_type is 'concept=핵심개념, summary=대화요약, key_term=용어, weak_area=취약영역, user_note=사용자메모';
comment on column public.course_memories.importance is '0~1 중요도 (취약 영역은 높게)';

create index idx_memories_course_id on public.course_memories(course_id);
create index idx_memories_user_id on public.course_memories(user_id);
create index idx_memories_type on public.course_memories(course_id, memory_type);

-- HNSW 벡터 인덱스
create index idx_memories_embedding on public.course_memories
  using hnsw (embedding vector_cosine_ops)
  with (m = 16, ef_construction = 64);

create trigger trg_memories_updated_at
  before update on public.course_memories
  for each row execute function public.set_updated_at();

alter table public.course_memories enable row level security;

create policy "course_memories: 본인만 조회"
  on public.course_memories for select
  using (auth.uid() = user_id);

create policy "course_memories: 본인만 생성"
  on public.course_memories for insert
  with check (auth.uid() = user_id);

create policy "course_memories: 본인만 수정"
  on public.course_memories for update
  using (auth.uid() = user_id);

create policy "course_memories: 본인만 삭제"
  on public.course_memories for delete
  using (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- 2. match_course_memories RPC
--    관련 메모리 벡터 검색
-- ─────────────────────────────────────────────
create or replace function public.match_course_memories(
  query_embedding vector(1536),
  target_course_id uuid,
  match_threshold float default 0.4,
  match_count int default 3
)
returns table (
  id uuid,
  memory_type text,
  content text,
  importance float,
  metadata jsonb,
  similarity float
)
language sql stable
as $$
  select
    cm.id,
    cm.memory_type,
    cm.content,
    cm.importance,
    cm.metadata,
    1 - (cm.embedding <=> query_embedding) as similarity
  from public.course_memories cm
  where cm.course_id = target_course_id
    and cm.embedding is not null
    and 1 - (cm.embedding <=> query_embedding) > match_threshold
  order by cm.importance desc, cm.embedding <=> query_embedding
  limit match_count;
$$;

-- ─────────────────────────────────────────────
-- 3. find_similar_memories RPC
--    중복 감지용 (임베딩 유사도 기반)
-- ─────────────────────────────────────────────
create or replace function public.find_similar_memories(
  query_embedding vector(1536),
  target_course_id uuid,
  similarity_threshold float default 0.8
)
returns table (
  id uuid,
  content text,
  importance float,
  similarity float
)
language sql stable
as $$
  select
    cm.id,
    cm.content,
    cm.importance,
    1 - (cm.embedding <=> query_embedding) as similarity
  from public.course_memories cm
  where cm.course_id = target_course_id
    and cm.embedding is not null
    and 1 - (cm.embedding <=> query_embedding) > similarity_threshold
  order by cm.embedding <=> query_embedding
  limit 5;
$$;
