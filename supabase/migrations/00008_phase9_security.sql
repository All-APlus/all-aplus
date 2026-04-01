-- ============================================================
-- Phase 9: 보안 & 운영 안정성
-- ============================================================

-- 일일 API 사용량 추적
create table public.usage_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  action text not null, -- chat, quiz, flashcard, document, youtube
  date date not null default current_date,
  count int not null default 1,
  created_at timestamptz default now() not null,
  unique(user_id, action, date)
);

alter table public.usage_logs enable row level security;
create policy "Users can read own usage" on public.usage_logs
  for select using (auth.uid() = user_id);

-- 토큰 사용량 추적
create table public.token_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  provider text not null,
  model text,
  input_tokens int not null default 0,
  output_tokens int not null default 0,
  action text not null, -- chat, quiz, flashcard
  date date not null default current_date,
  created_at timestamptz default now() not null
);

alter table public.token_usage enable row level security;
create policy "Users can read own token usage" on public.token_usage
  for select using (auth.uid() = user_id);

-- 일일 사용량 증가 함수 (upsert)
create or replace function public.increment_usage(
  p_user_id uuid,
  p_action text
) returns int as $$
declare
  current_count int;
begin
  insert into public.usage_logs (user_id, action, date, count)
  values (p_user_id, p_action, current_date, 1)
  on conflict (user_id, action, date)
  do update set count = usage_logs.count + 1;

  select count into current_count
  from public.usage_logs
  where user_id = p_user_id and action = p_action and date = current_date;

  return current_count;
end;
$$ language plpgsql security definer;
