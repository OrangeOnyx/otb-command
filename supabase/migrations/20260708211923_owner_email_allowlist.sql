-- Pre-authorization allowlist: the operator adds an email BEFORE first sign-in
-- and the magic-link trigger assigns the role directly (no pending purgatory).
create table if not exists public.authorized_emails (
  email text primary key,
  role text not null default 'owner' check (role in ('owner','operator')),
  added_by text not null default '',
  created_at timestamptz not null default now()
);
alter table public.authorized_emails enable row level security;
drop policy if exists "operator manages authorized emails" on public.authorized_emails;
create policy "operator manages authorized emails" on public.authorized_emails
  for all using (is_operator()) with check (is_operator());

-- operator can see every profile (to find pending sign-ins) and fix roles
drop policy if exists "operator reads profiles" on public.profiles;
create policy "operator reads profiles" on public.profiles for select using (is_operator());
drop policy if exists "operator updates profiles" on public.profiles;
create policy "operator updates profiles" on public.profiles
  for update using (is_operator()) with check (is_operator());

-- sign-in role resolution: vendor roster match > allowlist > pending
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email,
    case
      when exists (select 1 from public.vendors v where v.email = lower(new.email) and v.active) then 'vendor'
      when exists (select 1 from public.authorized_emails a where a.email = lower(new.email)) then
        (select a.role from public.authorized_emails a where a.email = lower(new.email))
      else 'pending'
    end)
  on conflict (id) do nothing;
  return new;
end; $$;
