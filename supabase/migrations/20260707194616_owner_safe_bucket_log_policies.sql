-- P2 Owner Safe: role-gated bucket (owners+operator only; future vendor role sealed out) + access audit log

create or replace function public.is_owner_or_operator()
returns boolean language sql stable security definer set search_path to 'public'
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role in ('owner','operator'));
$$;

insert into storage.buckets (id, name, public, file_size_limit)
values ('safe', 'safe', false, 26214400)
on conflict (id) do nothing;

create policy "owner+operator read safe" on storage.objects
  for select using (bucket_id = 'safe' and is_owner_or_operator());

create policy "operator insert safe" on storage.objects
  for insert with check (bucket_id = 'safe' and is_operator());

create policy "operator update safe" on storage.objects
  for update using (bucket_id = 'safe' and is_operator());

create policy "operator delete safe" on storage.objects
  for delete using (bucket_id = 'safe' and is_operator());

-- access audit log
create table if not exists public.safe_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  email text not null default '',
  action text not null check (action in ('view','upload','delete')),
  path text not null
);
alter table public.safe_log enable row level security;

create policy "owner+operator insert own log" on public.safe_log
  for insert with check (is_owner_or_operator());

create policy "operator read log" on public.safe_log
  for select using (is_operator());
