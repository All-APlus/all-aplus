-- ============================================================
-- Phase 2 RAG: documents + document_chunks + pgvector
-- ============================================================

-- pgvector 확장 활성화
create extension if not exists vector with schema extensions;

-- ─────────────────────────────────────────────
-- 1. documents
--    과목별 업로드 문서 메타데이터
-- ─────────────────────────────────────────────
create table public.documents (
  id            uuid        primary key default gen_random_uuid(),
  course_id     uuid        not null references public.courses(id) on delete cascade,
  user_id       uuid        not null references auth.users(id) on delete cascade,
  file_name     text        not null,
  file_type     text        not null,
  file_size     bigint      not null default 0,
  storage_path  text,
  status        text        not null default 'pending'
                            check (status in ('pending', 'processing', 'completed', 'failed')),
  error_message text,
  page_count    integer,
  chunk_count   integer     not null default 0,
  metadata      jsonb       default '{}',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
comment on table public.documents is '과목별 업로드 문서';
comment on column public.documents.status is 'pending → processing → completed / failed';

create index idx_documents_course_id on public.documents(course_id);
create index idx_documents_user_id on public.documents(user_id);

create trigger trg_documents_updated_at
  before update on public.documents
  for each row execute function public.set_updated_at();

alter table public.documents enable row level security;

create policy "documents: 본인 문서만 조회"
  on public.documents for select
  using (auth.uid() = user_id);

create policy "documents: 본인만 생성"
  on public.documents for insert
  with check (auth.uid() = user_id);

create policy "documents: 본인만 수정"
  on public.documents for update
  using (auth.uid() = user_id);

create policy "documents: 본인만 삭제"
  on public.documents for delete
  using (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- 2. document_chunks
--    문서 청크 + 벡터 임베딩
-- ─────────────────────────────────────────────
create table public.document_chunks (
  id           uuid        primary key default gen_random_uuid(),
  document_id  uuid        not null references public.documents(id) on delete cascade,
  course_id    uuid        not null references public.courses(id) on delete cascade,
  content      text        not null,
  embedding    vector(1536),
  chunk_index  integer     not null,
  page_number  integer,
  metadata     jsonb       default '{}',
  created_at   timestamptz not null default now()
);
comment on table public.document_chunks is 'RAG 벡터 저장소 — 문서 청크 + 임베딩';

create index idx_chunks_document_id on public.document_chunks(document_id);
create index idx_chunks_course_id on public.document_chunks(course_id);

-- HNSW 벡터 인덱스 (코사인 유사도)
create index idx_chunks_embedding on public.document_chunks
  using hnsw (embedding vector_cosine_ops)
  with (m = 16, ef_construction = 64);

alter table public.document_chunks enable row level security;

-- RLS: documents → courses → user_id 체인으로 소유권 검증
create policy "document_chunks: 본인 문서 청크만 조회"
  on public.document_chunks for select
  using (
    exists (
      select 1 from public.documents d
      where d.id = document_chunks.document_id
        and d.user_id = auth.uid()
    )
  );

create policy "document_chunks: 본인만 생성"
  on public.document_chunks for insert
  with check (
    exists (
      select 1 from public.documents d
      where d.id = document_chunks.document_id
        and d.user_id = auth.uid()
    )
  );

create policy "document_chunks: 본인만 삭제"
  on public.document_chunks for delete
  using (
    exists (
      select 1 from public.documents d
      where d.id = document_chunks.document_id
        and d.user_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────
-- 3. match_document_chunks RPC
--    코사인 유사도 기반 벡터 검색
-- ─────────────────────────────────────────────
create or replace function public.match_document_chunks(
  query_embedding vector(1536),
  target_course_id uuid,
  match_threshold float default 0.5,
  match_count int default 5
)
returns table (
  id uuid,
  document_id uuid,
  content text,
  chunk_index integer,
  page_number integer,
  metadata jsonb,
  similarity float
)
language sql stable
as $$
  select
    dc.id,
    dc.document_id,
    dc.content,
    dc.chunk_index,
    dc.page_number,
    dc.metadata,
    1 - (dc.embedding <=> query_embedding) as similarity
  from public.document_chunks dc
  where dc.course_id = target_course_id
    and dc.embedding is not null
    and 1 - (dc.embedding <=> query_embedding) > match_threshold
  order by dc.embedding <=> query_embedding
  limit match_count;
$$;

-- ─────────────────────────────────────────────
-- 4. Supabase Storage 버킷
-- ─────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit)
values ('documents', 'documents', false, 10485760)
on conflict (id) do nothing;

-- Storage RLS: 본인 폴더만 접근
create policy "documents bucket: 본인 폴더 업로드"
  on storage.objects for insert
  with check (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "documents bucket: 본인 폴더 조회"
  on storage.objects for select
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "documents bucket: 본인 폴더 삭제"
  on storage.objects for delete
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
