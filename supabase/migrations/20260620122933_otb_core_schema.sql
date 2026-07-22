-- profiles: one row per auth user, with role
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  role text not null default 'owner' check (role in ('operator','owner')),
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "read own profile" on public.profiles for select using (auth.uid() = id);

-- auto-create a profile (default role owner) on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- operator check (security definer avoids RLS recursion)
create or replace function public.is_operator()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'operator');
$$;

-- property_state: JSONB mirror of the app's store layers (one row per layer)
create table public.property_state (
  property_id text not null default 'otb',
  layer text not null,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (property_id, layer)
);
alter table public.property_state enable row level security;
create policy "authenticated read state" on public.property_state for select using (auth.uid() is not null);
create policy "operator insert state" on public.property_state for insert with check (public.is_operator());
create policy "operator update state" on public.property_state for update using (public.is_operator()) with check (public.is_operator());
create policy "operator delete state" on public.property_state for delete using (public.is_operator());
