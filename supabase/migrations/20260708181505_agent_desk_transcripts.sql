-- AI-1 agent desk (leasing / property-manager / concierge): persisted transcripts.
create table if not exists public.chat_threads (
  id uuid primary key default gen_random_uuid(),
  agent text not null check (agent in ('concierge','leasing','manager')),
  title text not null default '',
  created_by text not null default '',
  created_at timestamptz not null default now()
);
create table if not exists public.chat_messages (
  id bigint generated always as identity primary key,
  thread_id uuid not null references public.chat_threads(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null,
  at timestamptz not null default now()
);
create index if not exists chat_messages_thread_at on public.chat_messages(thread_id, at);
alter table public.chat_threads enable row level security;
alter table public.chat_messages enable row level security;
drop policy if exists "owner+operator read threads" on public.chat_threads;
create policy "owner+operator read threads" on public.chat_threads for select using (is_owner_or_operator());
drop policy if exists "owner+operator insert threads" on public.chat_threads;
create policy "owner+operator insert threads" on public.chat_threads for insert with check (is_owner_or_operator());
drop policy if exists "operator delete threads" on public.chat_threads;
create policy "operator delete threads" on public.chat_threads for delete using (is_operator());
drop policy if exists "owner+operator read messages" on public.chat_messages;
create policy "owner+operator read messages" on public.chat_messages for select using (is_owner_or_operator());
drop policy if exists "owner+operator insert messages" on public.chat_messages;
create policy "owner+operator insert messages" on public.chat_messages for insert with check (is_owner_or_operator());
drop policy if exists "operator delete messages" on public.chat_messages;
create policy "operator delete messages" on public.chat_messages for delete using (is_operator());
