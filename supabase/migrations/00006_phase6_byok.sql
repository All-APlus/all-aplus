-- ============================================================
-- Phase 6 BYOK: api_keys
-- ============================================================

create table public.api_keys (
  id              uuid        primary key default gen_random_uuid(),
  user_id         uuid        not null references auth.users(id) on delete cascade,
  provider        text        not null check (provider in ('claude', 'openai', 'gemini')),
  encrypted_key   text        not null,
  key_hint        text        not null,
  is_valid        boolean     not null default true,
  created_at      timestamptz not null default now()
);
comment on table public.api_keys is 'BYOK 암호화 저장';

create index idx_api_keys_user_id on public.api_keys(user_id);
create unique index idx_api_keys_user_provider on public.api_keys(user_id, provider);

alter table public.api_keys enable row level security;

create policy "api_keys: 본인만 조회"
  on public.api_keys for select
  using (auth.uid() = user_id);

create policy "api_keys: 본인만 생성"
  on public.api_keys for insert
  with check (auth.uid() = user_id);

create policy "api_keys: 본인만 수정"
  on public.api_keys for update
  using (auth.uid() = user_id);

create policy "api_keys: 본인만 삭제"
  on public.api_keys for delete
  using (auth.uid() = user_id);
